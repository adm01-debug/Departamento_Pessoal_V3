-- QA rodada 4 (5 agentes) — reparos de segurança/integridade achados na
-- validação exaustiva do estado pós-merge:
--
--  1) Bypass de imutabilidade por UPDATE combinado: as guardas de
--     desligamento e folha só conferiam campos protegidos quando
--     NEW.status = OLD.status. Um UPDATE status='pago'+valores adulterados
--     passava e congelava a adulteração ('pago' é terminal). Agora os
--     campos protegidos são conferidos SEMPRE que OLD.status é terminal —
--     transições legítimas (homologado→pago, fechada→paga, reabertura)
--     só tocam status/etapa/checklist/data_pagamento e seguem livres.
--  2) 'pago'/'paga' fora das listas de delete: DELETE de rescisão paga e
--     folha paga passava — viola retenção fiscal mínima de 5 anos.
--  3) anonimizar_dados_pessoais: o canônico ficou com a versão antiga
--     (CPF constante '000.000.000-00' → UNIQUE estoura na 2ª anonimização
--     e a fila LGPD nunca drena; PII sobrevivia em contas_bancarias,
--     dependentes, documentos). Reaplica a definição mais nova do repo
--     (20260719): CPF sintético determinístico único por colaborador +
--     cobertura das tabelas relacionadas.
--  4) contas_bancarias_decrypted invisível para admin global: a view é
--     security_invoker e a policy contas_bancarias_rh_manage (só
--     pode_gerir_rh) filtrava as linhas antes do OR is_admin do WHERE.
--     Bypass de leitura para admin no USING (WITH CHECK intacto — admin
--     não ganha escrita cross-tenant por aqui).
--  5) Stack sec-* nunca instalada: 20260912203000 aborta no preflight
--     porque sec_verify_seals()/sec_audit_policies() não existem no
--     canônico (linhagem morta pré-baseline). Recria as funções de
--     auditoria, as variantes _scan sem auth.uid(), as tabelas de
--     regressão/eventos e agenda os 3 jobs de forma idempotente.
--  6) tenant_registros_ponto (ALL, sem gate de papel) possivelmente viva
--     no canônico: 20260924192541 usa sou_o_colaborador() que só é
--     recriada em 20260924200000 (ordenação por versão quebrada).
--     Garante a função e refaz a troca de policy.
--  7) Corrida de claim de remessa CNAB: um stale-claim de outra chamada
--     podia coexistir com a reescrita de itens da primeira. UNIQUE parcial
--     (remessa_id, seu_numero) faz a segunda gravação falhar em vez de
--     duplicar itens (o update final também passa a exigir status
--     'processando' no service).

-- ---------------------------------------------------------------
-- (1) Guarda de desligamento: campos protegidos conferidos SEMPRE
--     que OLD é terminal (não só quando o status não muda).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_alteracao_desligamento_homologado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('homologado','finalizado','concluido','concluído','pago') THEN
    -- Transição de status (homologado→pago, reabertura) segue livre; o que
    -- não pode mudar nunca a partir de um estado terminal são os valores.
    IF NEW.data_desligamento     IS DISTINCT FROM OLD.data_desligamento
       OR NEW.tipo               IS DISTINCT FROM OLD.tipo
       OR NEW.saldo_salario      IS DISTINCT FROM OLD.saldo_salario
       OR NEW.aviso_previo       IS DISTINCT FROM OLD.aviso_previo
       OR NEW.ferias_vencidas    IS DISTINCT FROM OLD.ferias_vencidas
       OR NEW.ferias_proporcionais IS DISTINCT FROM OLD.ferias_proporcionais
       OR NEW.terco_constitucional IS DISTINCT FROM OLD.terco_constitucional
       OR NEW.decimo_terceiro    IS DISTINCT FROM OLD.decimo_terceiro
       OR NEW.multa_fgts         IS DISTINCT FROM OLD.multa_fgts
       OR NEW.total_proventos    IS DISTINCT FROM OLD.total_proventos
       OR NEW.total_descontos    IS DISTINCT FROM OLD.total_descontos
       OR NEW.valor_liquido      IS DISTINCT FROM OLD.valor_liquido
       OR NEW.detalhes_calculo   IS DISTINCT FROM OLD.detalhes_calculo
       OR NEW.hash_integridade   IS DISTINCT FROM OLD.hash_integridade
       OR NEW.hash_assinatura_empresa IS DISTINCT FROM OLD.hash_assinatura_empresa
       OR NEW.hash_assinatura_colaborador IS DISTINCT FROM OLD.hash_assinatura_colaborador
       OR NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
       OR NEW.empresa_id         IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Desligamento homologado/pago é imutável. Reabra oficialmente antes de alterar valores.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------
-- (2) DELETE em rescisão paga também é proibido (retenção fiscal).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proibir_delete_desligamento_homologado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('homologado','finalizado','concluido','concluído','pago') THEN
    RAISE EXCEPTION 'Desligamentos homologados/pagos não podem ser deletados (retenção fiscal/trabalhista mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- ---------------------------------------------------------------
-- (3) Mesma falha estrutural na folha: conferir valores SEMPRE que
--     OLD é fechada/paga; 'paga' entra nas listas de delete.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_alteracao_folha_fechada()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('fechada','fechado','closed','paga','pago') THEN
    -- Reabertura e marcação de pagamento só tocam status/metadados;
    -- valores financeiros nunca mudam a partir de estado terminal.
    IF NEW.total_proventos IS DISTINCT FROM OLD.total_proventos
       OR NEW.total_descontos IS DISTINCT FROM OLD.total_descontos
       OR NEW.total_liquido   IS DISTINCT FROM OLD.total_liquido
       OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade
       OR NEW.competencia     IS DISTINCT FROM OLD.competencia
       OR NEW.empresa_id      IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Folha fechada/paga é imutável. Reabra a folha antes de alterar valores (motivo obrigatório).'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.proibir_delete_folha_fechada()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('fechada','fechado','closed','paga','pago') THEN
    RAISE EXCEPTION 'Folhas fechadas/pagas não podem ser deletadas (exigência fiscal/contábil - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- ---------------------------------------------------------------
-- (4) anonimizar_dados_pessoais: reaplica a definição mais nova do
--     repo (20260719) — o canônico ficou com a versão antiga cujo CPF
--     constante violava UNIQUE na 2ª anonimização e deixava PII viva
--     em contas_bancarias/dependentes/documentos.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonimizar_dados_pessoais(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_anon_cpf TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar apagamento LGPD' USING ERRCODE = '42501';
  END IF;

  v_anon_cpf := LPAD(
    ((('x' || substr(md5(target_id::text || 'lgpd-anon'), 1, 15))::bit(60)::bigint) % 100000000000)::text,
    11, '0'
  );

  UPDATE public.colaboradores
  SET
    nome = 'COLABORADOR ANONIMIZADO (LGPD)',
    nome_social = NULL,
    nome_mae = NULL,
    nome_pai = NULL,
    cpf = v_anon_cpf,
    rg = NULL,
    pis = NULL,
    email = 'anonimo+' || target_id::text || '@anonimizado.invalid',
    email_pessoal = NULL,
    telefone = NULL,
    celular = NULL,
    foto_url = NULL,
    foto_referencia_url = NULL
  WHERE id = target_id;

  UPDATE public.contas_bancarias
  SET banco_nome = NULL, banco_codigo = NULL, agencia = NULL, agencia_digito = NULL,
      conta = NULL, digito = NULL, pix_chave = NULL, pix_tipo = NULL
  WHERE colaborador_id = target_id;

  UPDATE public.dependentes
  SET nome = 'DEPENDENTE ANONIMIZADO (LGPD)', cpf = NULL, certidao_numero = NULL, certidao_cartorio = NULL
  WHERE colaborador_id = target_id;

  DELETE FROM public.documentos_colaborador WHERE colaborador_id = target_id;

  UPDATE public.esocial_eventos
  SET xml_envio = NULL, xml_retorno = NULL, mensagem_retorno = NULL
  WHERE colaborador_id = target_id;

  UPDATE public.cnab_itens
  SET nome_favorecido = 'ANONIMIZADO (LGPD)', cpf_cnpj_favorecido = v_anon_cpf
  WHERE colaborador_id = target_id;
END;
$function$;

-- ---------------------------------------------------------------
-- (5) Admin global lê a view decrypted: bypass de leitura no USING
--     da policy (WITH CHECK preservado — escrita continua RH-only).
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "contas_bancarias_rh_manage" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_rh_manage" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------
-- (6) Stack de auditoria de segurança (sec-*): recria o que o
--     preflight de 20260912203000 exigia e que nunca chegou ao
--     canônico. Definições copiadas das versões canônicas mais novas.
-- ---------------------------------------------------------------

-- Funções user-facing exigidas pelo contrato original
CREATE OR REPLACE FUNCTION public.sec_audit_policies()
RETURNS TABLE (
  tabela text,
  policy_name text,
  cmd text,
  motivo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT p.tablename::text,
         p.policyname::text,
         p.cmd::text,
         CASE
           WHEN coalesce(p.qual,'') ~* '^\s*true\s*$' THEN 'USING (true) — sem restricao'
           WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'IN \( SELECT [a-z_]+\.(id|empresa_id)[^)]*FROM'
            AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) !~* 'WHERE'
             THEN 'subconsulta sem correlacao com o usuario'
           WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'auth\.role\(\)\s*=\s*''authenticated'''
             THEN 'qualquer autenticado (sem escopo de empresa)'
           WHEN coalesce(p.qual,'')||coalesce(p.with_check,'') = '' THEN 'sem predicado'
           ELSE NULL
         END
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND public.is_admin(auth.uid())
    AND CASE
          WHEN coalesce(p.qual,'') ~* '^\s*true\s*$' THEN true
          WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'IN \( SELECT [a-z_]+\.(id|empresa_id)[^)]*FROM'
           AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) !~* 'WHERE' THEN true
          WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'auth\.role\(\)\s*=\s*''authenticated''' THEN true
          WHEN coalesce(p.qual,'')||coalesce(p.with_check,'') = '' THEN true
          ELSE false
        END
  ORDER BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.sec_audit_policies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_audit_policies() TO authenticated, service_role;

-- sec_verify_seals: cadeia de custódia — confere hash_integridade contra
-- digest sha256 dos campos selados de cada tabela auditável.
CREATE OR REPLACE FUNCTION public.sec_verify_seals()
RETURNS TABLE (tabela TEXT, selados BIGINT, divergentes BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH r AS (
    SELECT 'folhas_pagamento'::text AS t, hash_integridade AS h,
           COALESCE(empresa_id::text,'')||'|'||COALESCE(competencia::text,'')||'|'||
           COALESCE(total_proventos::text,'0')||'|'||COALESCE(total_descontos::text,'0')||'|'||
           COALESCE(total_liquido::text,'0')||'|'||COALESCE(version::text,'1')||'|'||
           COALESCE(status::text,'') AS c
    FROM public.folhas_pagamento
    UNION ALL
    SELECT 'batidas_ponto', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(data::text,'')||'|'||
           COALESCE(hora::text,'')||'|'||COALESCE(tipo,'')||'|'||COALESCE(dispositivo_id,'')
    FROM public.batidas_ponto
    UNION ALL
    SELECT 'medidas_disciplinares', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo,'')||'|'||COALESCE(data_ocorrencia::text,'')||'|'||COALESCE(descricao,'')||'|'||
           COALESCE(dias_suspensao::text,'0')||'|'||COALESCE(artigo_clt,'')||'|'||
           COALESCE(testemunha_1_nome,'')||'|'||COALESCE(testemunha_1_cpf,'')||'|'||
           COALESCE(testemunha_2_nome,'')||'|'||COALESCE(testemunha_2_cpf,'')||'|'||
           COALESCE(recusa_assinatura::text,'false')||'|'||COALESCE(data_ciencia::text,'')||'|'||
           COALESCE(assinado_em::text,'')
    FROM public.medidas_disciplinares
    UNION ALL
    SELECT 'ferias', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(periodo_aquisitivo_id::text,'')||'|'||COALESCE(data_inicio::text,'')||'|'||
           COALESCE(data_fim::text,'')||'|'||COALESCE(dias_gozo::text,'0')||'|'||
           COALESCE(dias_abono::text,'0')||'|'||COALESCE(valor_ferias::text,'0')||'|'||
           COALESCE(valor_terco::text,'0')||'|'||COALESCE(valor_abono::text,'0')||'|'||
           COALESCE(valor_terco_abono::text,'0')||'|'||COALESCE(valor_total::text,'0')||'|'||
           COALESCE(descontos_inss::text,'0')||'|'||COALESCE(descontos_irrf::text,'0')||'|'||
           COALESCE(valor_liquido::text,'0')
    FROM public.ferias
    UNION ALL
    SELECT 'desligamentos', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(data_desligamento::text,'')||'|'||COALESCE(tipo::text,'')||'|'||
           COALESCE(saldo_salario::text,'0')||'|'||COALESCE(aviso_previo::text,'0')||'|'||
           COALESCE(ferias_vencidas::text,'0')||'|'||COALESCE(ferias_proporcionais::text,'0')||'|'||
           COALESCE(terco_constitucional::text,'0')||'|'||COALESCE(decimo_terceiro::text,'0')||'|'||
           COALESCE(multa_fgts::text,'0')||'|'||COALESCE(total_proventos::text,'0')||'|'||
           COALESCE(total_descontos::text,'0')||'|'||COALESCE(valor_liquido::text,'0')
    FROM public.desligamentos
    UNION ALL
    SELECT 'holerites', hash_assinatura,
           COALESCE(folha_id::text,'')||'|'||COALESCE(colaborador_id::text,'')||'|'||
           COALESCE(colaborador_cpf,'')||'|'||COALESCE(total_proventos::text,'0')||'|'||
           COALESCE(total_descontos::text,'0')||'|'||COALESCE(liquido::text,'0')||'|'||
           COALESCE(valor_inss::text,'0')||'|'||COALESCE(valor_irrf::text,'0')||'|'||
           COALESCE(valor_fgts::text,'0')
    FROM public.holerites
    UNION ALL
    SELECT 'asos', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo,'')||'|'||COALESCE(data_exame::text,'')||'|'||COALESCE(data_validade::text,'')||'|'||
           COALESCE(resultado,'')||'|'||COALESCE(medico_nome,'')||'|'||COALESCE(medico_crm,'')||'|'||
           COALESCE(clinica,'')||'|'||COALESCE(arquivo_url,'')
    FROM public.asos
    UNION ALL
    SELECT 'epis_entregas', hash_integridade,
           COALESCE(epi_id::text,'')||'|'||COALESCE(colaborador_id::text,'')||'|'||
           COALESCE(empresa_id::text,'')||'|'||COALESCE(data_entrega::text,'')||'|'||
           COALESCE(quantidade::text,'1')||'|'||COALESCE(motivo,'')||'|'||
           COALESCE(assinatura_url,'')||'|'||COALESCE(entregue_por::text,'')
    FROM public.epis_entregas
    UNION ALL
    SELECT 'esocial_eventos', hash_arquivo,
           COALESCE(empresa_id::text,'')||'|'||COALESCE(tipo_evento,'')||'|'||
           COALESCE(competencia,'')||'|'||COALESCE(xml_envio, xml, '')||'|'||
           COALESCE(protocolo,'')||'|'||COALESCE(recibo,'')||'|'||COALESCE(id_recibo,'')
    FROM public.esocial_eventos
    UNION ALL
    SELECT 'documentos_assinatura', hash_documento,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo_documento,'')||'|'||COALESCE(titulo,'')||'|'||COALESCE(conteudo_url,'')||'|'||
           COALESCE(assinatura_base64,'')||'|'||COALESCE(assinado_em::text,'')||'|'||
           COALESCE(assinado_por::text,'')||'|'||COALESCE(ip_assinatura,'')||'|'||
           COALESCE(validade_assinatura::text,'')
    FROM public.documentos_assinatura
    UNION ALL
    SELECT 'cnab_remessas', hash_integridade,
           COALESCE(empresa_id::text,'')||'|'||COALESCE(banco_codigo,'')||'|'||
           COALESCE(sequencial_arquivo::text,'')||'|'||COALESCE(data_geracao::text,'')||'|'||
           COALESCE(total_pagamentos::text,'0')||'|'||COALESCE(valor_total::text,'0')||'|'||
           COALESCE(arquivo_url,'')
    FROM public.cnab_remessas
    UNION ALL
    SELECT 'afastamentos', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo::text,'')||'|'||COALESCE(data_inicio::text,'')||'|'||
           COALESCE(data_fim_prevista::text,'')||'|'||COALESCE(data_fim_real::text,'')||'|'||
           COALESCE(dias_empresa::text,'0')||'|'||COALESCE(dias_inss::text,'0')||'|'||
           COALESCE(cid::text,'')||'|'||COALESCE(numero_beneficio::text,'')||'|'||
           COALESCE(medico_nome,'')||'|'||COALESCE(medico_crm,'')||'|'||COALESCE(atestado_numero::text,'')||'|'||
           COALESCE(status::text,'')
    FROM public.afastamentos
    UNION ALL
    SELECT 'sst_cat', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(data_acidente::text,'')||'|'||COALESCE(tipo_acidente,'')||'|'||
           COALESCE(local_acidente,'')||'|'||COALESCE(parte_corpo_atingida,'')||'|'||
           COALESCE(agente_causador,'')||'|'||COALESCE(houve_afastamento::text,'false')||'|'||
           COALESCE(houve_obito::text,'false')||'|'||COALESCE(protocolo_esocial,'')
    FROM public.sst_cat
  )
  SELECT r.t,
         count(*) FILTER (WHERE r.h IS NOT NULL AND r.h <> ''),
         count(*) FILTER (WHERE r.h IS NOT NULL AND r.h <> ''
                            AND r.h <> encode(digest(r.c, 'sha256'), 'hex'))
  FROM r
  GROUP BY r.t
  ORDER BY r.t;
$$;

REVOKE ALL ON FUNCTION public.sec_verify_seals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals() TO service_role;

CREATE OR REPLACE FUNCTION public.sec_verify_seals_admin()
RETURNS TABLE (tabela TEXT, selados BIGINT, divergentes BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public.sec_verify_seals();
END;
$$;

REVOKE ALL ON FUNCTION public.sec_verify_seals_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals_admin() TO service_role;

-- Tabelas do contrato (idempotente — CREATE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.sec_policy_regressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_at timestamptz NOT NULL DEFAULT now(),
  tabela text NOT NULL,
  policy_name text NOT NULL,
  cmd text,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_policy_regressions_scan_at
  ON public.sec_policy_regressions (scan_at DESC);

CREATE TABLE IF NOT EXISTS public.sec_seal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  evento text NOT NULL CHECK (evento IN ('selado', 'desselado')),
  detalhe text,
  ator uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_seal_events_tabela_data
  ON public.sec_seal_events (tabela, created_at DESC);

ALTER TABLE public.sec_policy_regressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sec_seal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sec_policy_regressions, public.sec_seal_events FROM PUBLIC, anon;
GRANT SELECT ON public.sec_policy_regressions, public.sec_seal_events TO authenticated;
GRANT ALL ON public.sec_policy_regressions, public.sec_seal_events TO service_role;

-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS sec_policy_regressions_admin_read ON public.sec_policy_regressions;
CREATE POLICY sec_policy_regressions_admin_read
  ON public.sec_policy_regressions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS sec_seal_events_admin_read ON public.sec_seal_events;
CREATE POLICY sec_seal_events_admin_read
  ON public.sec_seal_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Varreduras chamadas pelo pg_cron (auth.uid() NULL — sem gate de papel)
CREATE OR REPLACE FUNCTION public.sec_audit_policies_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  scan_timestamp timestamptz := clock_timestamp();
  finding_count integer;
BEGIN
  INSERT INTO public.sec_policy_regressions (
    scan_at, tabela, policy_name, cmd, motivo
  )
  SELECT scan_timestamp, p.tablename::text, p.policyname::text, p.cmd::text,
    CASE
      WHEN COALESCE(p.qual, '') ~* '^\s*true\s*$' THEN 'USING (true) - unrestricted'
      WHEN (COALESCE(p.qual, '') || COALESCE(p.with_check, ''))
        ~* 'auth\.role\(\)\s*=\s*''authenticated'''
        THEN 'authenticated role without tenant correlation'
      WHEN COALESCE(p.qual, '') || COALESCE(p.with_check, '') = ''
        THEN 'policy has no predicate'
      ELSE 'uncorrelated identifier subquery'
    END
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      COALESCE(p.qual, '') ~* '^\s*true\s*$'
      OR (COALESCE(p.qual, '') || COALESCE(p.with_check, ''))
        ~* 'auth\.role\(\)\s*=\s*''authenticated'''
      OR COALESCE(p.qual, '') || COALESCE(p.with_check, '') = ''
      OR (
        (COALESCE(p.qual, '') || COALESCE(p.with_check, ''))
          ~* 'IN \( SELECT [a-z_]+\.(id|empresa_id)[^)]*FROM'
        AND (COALESCE(p.qual, '') || COALESCE(p.with_check, '')) !~* 'WHERE'
      )
    );
  GET DIAGNOSTICS finding_count = ROW_COUNT;

  IF finding_count > 0 THEN
    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES (
      'seguranca_rls',
      CASE WHEN finding_count >= 5 THEN 'critico' ELSE 'atencao' END,
      finding_count,
      0,
      format('%s potentially unsafe RLS policies detected; inspect sec_policy_regressions.', finding_count)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'achados', finding_count, 'scan_at', scan_timestamp
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.sec_policy_regressions_purge()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.sec_policy_regressions
  WHERE scan_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END
$function$;

CREATE OR REPLACE FUNCTION public.sec_verify_seals_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  divergent_count bigint;
  details text;
BEGIN
  SELECT COALESCE(sum(v.divergentes), 0),
    COALESCE(string_agg(v.tabela || ' (' || v.divergentes || ')', ', ')
      FILTER (WHERE v.divergentes > 0), '')
  INTO divergent_count, details
  FROM public.sec_verify_seals() v;

  IF divergent_count > 0 THEN
    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES (
      'integridade_selos', 'critico', divergent_count, 0,
      'Integrity seal divergence detected: ' || details
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'divergentes', divergent_count, 'detalhe', details
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
  VALUES (
    'integridade_selos', 'critico', 1, 0,
    'Integrity seal scan failed: ' || left(SQLERRM, 500)
  );
  RETURN jsonb_build_object('ok', false, 'erro', 'seal scan failed');
END
$function$;

REVOKE ALL ON FUNCTION public.sec_audit_policies_scan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_policy_regressions_purge() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_verify_seals_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sec_audit_policies_scan(),
  public.sec_policy_regressions_purge(), public.sec_verify_seals_scan()
  TO service_role;

-- Agenda os 3 jobs de forma idempotente (pg_cron não tem "schedule IF NOT
-- EXISTS" — confere cron.job pelo nome antes).
DO $sec_crons$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE WARNING 'pg_cron indisponível — jobs sec-* não agendados nesta instância';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job
  WHERE jobname IN (
    'sec-audit-policies-daily',
    'sec-policy-regressions-purge',
    'sec-verify-seals-weekly'
  );

  PERFORM cron.schedule(
    'sec-audit-policies-daily', '0 4 * * *',
    $cron$SELECT public.sec_audit_policies_scan();$cron$
  );
  PERFORM cron.schedule(
    'sec-policy-regressions-purge', '30 4 * * 0',
    $cron$SELECT public.sec_policy_regressions_purge();$cron$
  );
  PERFORM cron.schedule(
    'sec-verify-seals-weekly', '15 3 * * 1',
    $cron$SELECT public.sec_verify_seals_scan();$cron$
  );
END
$sec_crons$;

-- ---------------------------------------------------------------
-- (7) registros_ponto: garante sou_o_colaborador e refaz a troca de
--     policy que 20260924192541 não conseguiu aplicar (dependência de
--     função criada só em 20260924200000 — ordenação quebrada).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sou_o_colaborador(_colaborador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
  SELECT _colaborador_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.sou_o_colaborador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sou_o_colaborador(uuid) TO authenticated, service_role;

-- audit-migration-style: allow-silent-drop remove a policy permissiva legada (ALL sem gate de papel) — é exatamente o reparo desta migration
DROP POLICY IF EXISTS tenant_registros_ponto ON public.registros_ponto;
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "registros_ponto_write" ON public.registros_ponto;
CREATE POLICY registros_ponto_write ON public.registros_ponto
  FOR ALL TO authenticated
  USING (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (
      public.sou_o_colaborador(colaborador_id)
      OR public.pode_gerir_rh(empresa_id)
      OR public.pode_gerir_pessoas(empresa_id)
    )
  )
  WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (
      public.sou_o_colaborador(colaborador_id)
      OR public.pode_gerir_rh(empresa_id)
      OR public.pode_gerir_pessoas(empresa_id)
    )
  );

-- ---------------------------------------------------------------
-- (8) CNAB: um item por (remessa, seu_numero) — a corrida de claim que
--     deixava dois caminhos gravarem itens agora falha na segunda
--     gravação em vez de duplicar. Parcial para tolerar seu_numero NULL.
--     Defensivo: dados legados duplicados não devem abortar o apply.
-- ---------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX cnab_itens_remessa_seu_numero_uk
      ON public.cnab_itens (remessa_id, seu_numero)
      WHERE seu_numero IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'cnab_itens_remessa_seu_numero_uk não criada (%): limpar duplicatas antes', SQLERRM;
  END;
END
$$;
