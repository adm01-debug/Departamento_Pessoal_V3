-- QA round 5 — correções de bugs encontrados na validação exaustiva em
-- Postgres 17 real (QA-r5-3) e no replay limpo baseline→main (QA-r5-4).
--
-- (1) impedir_alteracao_folha_fechada / proibir_delete_folha_fechada:
--     literais fora do enum status_folha ('fechado','closed','pago') —
--     o enum só tem ('aberta','calculada','fechada','paga'). Comparar
--     OLD.status com literal inválido aborta com
--     `invalid input value for enum status_folha` em QUALQUER
--     UPDATE/DELETE sobre folhas_pagamento (inclusive transições
--     legítimas aberta→calculada→fechada→paga). Tabela travada.
--     Corrige para os valores reais do enum.
--
-- (2) anonimizar_dados_pessoais: a versão reaplicada em qa_r4_fixes
--     (copiada de 20260719) referencia colunas inexistentes no canônico
--     — colaboradores.nome/.pis (reais: nome_completo/pis_pasep),
--     dependentes.certidao_numero/cartorio e esocial_eventos
--     .mensagem_retorno/colaborador_id — então cada item da fila LGPD
--     falhava e a fila nunca drenava. Reescreve com as colunas
--     canônicas, mantendo o CPF único por registro (corrige a versão
--     canônica antiga cujo CPF constante violava UNIQUE) e a
--     anonimização de contas/dependentes/documentos/cnab.
--
-- (3) drenar_fila_limpeza_lgpd: a overload legada () criada em
--     20260719 nunca foi dropada quando surgiu a (integer) — pg_proc
--     fica com 5 linhas e a invariante cron_fix_fns_ok = 4 fica
--     insatisfazível. Drop da overload (); chamadas bare
--     `drenar_fila_limpeza_lgpd()` continuam resolvendo para a
--     (integer) via DEFAULT.
--
-- (4) folha_itens: o replay limpo expôs que 003_folha_ferias_ponto.sql
--     cria a versão magra (8 colunas) e 20260509153525 tenta a versão
--     rica via CREATE TABLE IF NOT EXISTS → no-op silencioso;
--     migrations posteriores que tocam folha_itens.salario_base falham
--     no replay. O canônico já tem a versão rica; o ALTER idempotente
--     converge o replay sem efeito no canônico.

-- ---------------------------------------------------------------
-- (1) Guardas de imutabilidade da folha — literais do enum reais
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_alteracao_folha_fechada()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('fechada','paga') THEN
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
  IF OLD.status IN ('fechada','paga') THEN
    RAISE EXCEPTION 'Folhas fechadas/pagas não podem ser deletadas (exigência fiscal/contábil - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- ---------------------------------------------------------------
-- (2) anonimizar_dados_pessoais — colunas canônicas + CPF único
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

  -- CPF determinístico por registro: a versão canônica antiga gravava a
  -- constante '000.000.000-00' e violava o UNIQUE na 2ª anonimização.
  v_anon_cpf := LPAD(
    ((('x' || substr(md5(target_id::text || 'lgpd-anon'), 1, 15))::bit(60)::bigint) % 100000000000)::text,
    11, '0'
  );

  UPDATE public.colaboradores
  SET
    nome_completo = 'COLABORADOR ANONIMIZADO (LGPD)',
    nome_social = NULL,
    nome_mae = 'ANONIMIZADO',
    nome_pai = NULL,
    cpf = v_anon_cpf,
    rg = NULL,
    rg_orgao_emissor = NULL,
    rg_uf = NULL,
    rg_data_emissao = NULL,
    pis_pasep = NULL,
    email = 'anonimo+' || target_id::text || '@anonimizado.invalid',
    email_pessoal = NULL,
    email_corporativo = NULL,
    telefone = NULL,
    celular = NULL,
    foto_url = NULL,
    foto_referencia_url = NULL,
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{lgpd_anonimizado}', 'true'),
    updated_at = now()
  WHERE id = target_id;

  UPDATE public.contas_bancarias
  SET banco_nome = NULL, banco_codigo = NULL, agencia = NULL, agencia_digito = NULL,
      conta = NULL, digito = NULL, pix_chave = NULL, pix_tipo = NULL
  WHERE colaborador_id = target_id;

  UPDATE public.dependentes
  SET nome = 'DEPENDENTE ANONIMIZADO (LGPD)', cpf = NULL
  WHERE colaborador_id = target_id;

  DELETE FROM public.documentos_colaborador WHERE colaborador_id = target_id;

  -- esocial_eventos não tem colaborador_id nem mensagem_retorno no
  -- canônico: limpa os XMLs dos eventos vinculados via dados jsonb.
  UPDATE public.esocial_eventos
  SET xml_envio = NULL, xml_retorno = NULL, xml = NULL
  WHERE dados->>'colaborador_id' = target_id::text;

  UPDATE public.cnab_itens
  SET nome_favorecido = 'ANONIMIZADO (LGPD)', cpf_cnpj_favorecido = v_anon_cpf
  WHERE colaborador_id = target_id;

  INSERT INTO public.lgpd_solicitacoes (colaborador_id, tipo, status, descricao, concluida_em)
  VALUES (target_id, 'exclusao', 'concluida', 'Anonimização automática por política de retenção', now());
END;
$function$;

-- ---------------------------------------------------------------
-- (3) Overload legada de drenar_fila_limpeza_lgpd — drop
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.drenar_fila_limpeza_lgpd();

-- ---------------------------------------------------------------
-- (4) folha_itens — converge o replay para o shape canônico
-- ---------------------------------------------------------------
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS salario_base numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS total_proventos numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS total_descontos numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS total_liquido numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS fgts_mes numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS inss_mes numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS irrf_mes numeric(12,2) DEFAULT 0;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS detalhes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.folha_itens ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente';

-- ---------------------------------------------------------------
-- (5) DELETE do espelho 671 contornável (QA-r5-1): o trigger
--     trg_ponto_espelhos_assinados_no_delete usa a função genérica
--     audit_log_append_only, que respeita o escape
--     `SET app.audit_log_purge='on'` (legítimo para purge de logs,
--     inaceitável para registros REP-P — MTP 671 exige não-repúdio).
--     Guarda dedicada sem escape para DELETE na tabela.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ponto_espelhos_assinados_guard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Espelhos de ponto assinados são append-only (Portaria MTP 671/21). DELETE não é permitido.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_espelhos_assinados_no_delete ON public.ponto_espelhos_assinados;
CREATE TRIGGER trg_ponto_espelhos_assinados_no_delete
  BEFORE DELETE ON public.ponto_espelhos_assinados
  FOR EACH ROW EXECUTE FUNCTION public.ponto_espelhos_assinados_guard_delete();
