-- ===================================================================
-- PARTE A — Bloqueia pagamento de rescisão sem homologação/assinatura
-- (achado N25). O status vocabulary de rescisaoService.ts ('calculado',
-- 'em_homologacao', 'pago') não existia em chk_desligamentos_status nem
-- no mapa de transições de trg_desligamentos_status_transition — todo o
-- fluxo calcular->homologar->pagar falhava com violação de constraint;
-- corrigido junto com o fechamento do gap de segurança.
-- ===================================================================

ALTER TABLE public.desligamentos
  ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comprovante_pagamento_url TEXT;

ALTER TABLE public.desligamentos DROP CONSTRAINT IF EXISTS chk_desligamentos_status;
ALTER TABLE public.desligamentos ADD CONSTRAINT chk_desligamentos_status CHECK (
  status IS NULL OR status = ANY (ARRAY[
    'rascunho','pendente','em_andamento','aguardando_aprovacao','aprovado','rejeitado',
    'calculado','em_homologacao','homologado','pago','concluido','finalizado','cancelado'
  ]::text[])
);

CREATE OR REPLACE FUNCTION public.trg_desligamentos_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Achado N25: "rescisão paga pode reabrir/recalcular". 'pago' é terminal
  -- e permanente — nem _is_admin_bypass() pode reverter, ao contrário do
  -- resto da máquina de estados (que admins podem corrigir livremente).
  IF OLD.status = 'pago' AND NEW.status IS DISTINCT FROM 'pago' THEN
    RAISE EXCEPTION 'Rescisão paga é definitiva e não pode ser reaberta ou alterada'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Achado N25: nenhuma regra impedia marcar uma rescisão como paga sem
  -- homologação/assinatura das partes. Roda SEMPRE, mesmo para admins —
  -- _is_admin_bypass() não se aplica a este bloco de propósito.
  IF NEW.status = 'pago' AND OLD.status IS DISTINCT FROM 'pago' THEN
    IF OLD.status IS DISTINCT FROM 'homologado' THEN
      RAISE EXCEPTION 'Rescisão só pode ser paga após homologação (status atual: %)', OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT COALESCE(NEW.assinado_empresa, false) OR NOT COALESCE(NEW.assinado_colaborador, false) THEN
      RAISE EXCEPTION 'Rescisão só pode ser paga com assinatura da empresa e do colaborador registradas'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF public._is_admin_bypass() THEN RETURN NEW; END IF;

  PERFORM public.validate_status_transition('desligamentos', OLD.status, NEW.status, '{
    "rascunho": ["em_andamento","cancelado"],
    "pendente": ["em_andamento","cancelado"],
    "em_andamento": ["aprovado","rejeitado","cancelado","calculado"],
    "calculado": ["em_homologacao","em_andamento","cancelado"],
    "em_homologacao": ["homologado","calculado","cancelado"],
    "aprovado": ["concluido","homologado","cancelado"],
    "concluido": ["homologado"],
    "homologado": ["pago"]
  }'::jsonb);
  RETURN NEW;
END;
$function$;

-- Achado N25 (complementar): 'pago' nao estava na lista de status protegidos
-- por esta trigger de imutabilidade de valores — um registro pago podia ter
-- seus campos monetarios/assinatura alterados sem trocar de status.
CREATE OR REPLACE FUNCTION public.impedir_alteracao_desligamento_homologado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('homologado','finalizado','concluido','concluído','pago') THEN
    IF NEW.status = OLD.status THEN
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
         OR NEW.hash_integridade   IS DISTINCT FROM OLD.hash_integridade
         OR NEW.hash_assinatura_empresa IS DISTINCT FROM OLD.hash_assinatura_empresa
         OR NEW.hash_assinatura_colaborador IS DISTINCT FROM OLD.hash_assinatura_colaborador
         OR NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
         OR NEW.empresa_id         IS DISTINCT FROM OLD.empresa_id THEN
        RAISE EXCEPTION 'Desligamento homologado/pago é imutável. Reabra oficialmente antes de alterar valores.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Protege assinado_empresa/assinado_colaborador/hash_assinatura_* contra
-- escrita direta (ex.: via external-db-bridge, que expõe UPDATE genérico em
-- desligamentos sem esse controle) — só a função assinar_desligamento()
-- pode gravar essas colunas.
CREATE OR REPLACE FUNCTION public.trg_protect_assinatura_rescisao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.assinado_empresa IS DISTINCT FROM OLD.assinado_empresa
      OR NEW.assinado_colaborador IS DISTINCT FROM OLD.assinado_colaborador
      OR NEW.hash_assinatura_empresa IS DISTINCT FROM OLD.hash_assinatura_empresa
      OR NEW.hash_assinatura_colaborador IS DISTINCT FROM OLD.hash_assinatura_colaborador)
     AND current_setting('app.allow_signature_write', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Assinatura de rescisão só pode ser registrada via public.assinar_desligamento()'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_assinatura ON public.desligamentos;
CREATE TRIGGER trg_protect_assinatura BEFORE UPDATE ON public.desligamentos
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_assinatura_rescisao();

DO $$
BEGIN
  ALTER TABLE public.homologacoes_rescisao
    ADD CONSTRAINT uq_homologacoes_desligamento_etapa UNIQUE (desligamento_id, etapa);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'uq_homologacoes_desligamento_etapa nao aplicada (dados existentes divergentes ou constraint ja existe)';
END $$;

CREATE OR REPLACE FUNCTION public.assinar_desligamento(_desligamento_id UUID, _parte TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
  v_canonical TEXT;
  v_hash TEXT;
BEGIN
  IF _parte NOT IN ('empresa', 'colaborador') THEN
    RAISE EXCEPTION 'Parte invalida: % (use empresa ou colaborador)', _parte USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem confirmar assinatura de rescisao' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status NOT IN ('calculado', 'em_homologacao') THEN
    RAISE EXCEPTION 'Rescisao precisa estar calculada e ainda nao homologada para registrar assinatura (status atual: %). Assinaturas devem ser coletadas antes da homologacao final, que torna o registro imutavel.', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF (_parte = 'empresa' AND v_row.assinado_empresa) OR (_parte = 'colaborador' AND v_row.assinado_colaborador) THEN
    RAISE EXCEPTION 'Esta parte ja assinou esta rescisao' USING ERRCODE = 'check_violation';
  END IF;

  v_canonical := COALESCE(v_row.colaborador_id::text,'') || '|' || COALESCE(v_row.empresa_id::text,'') || '|' ||
                 COALESCE(v_row.valor_liquido::text,'0') || '|' || _parte || '|' || auth.uid()::text || '|' || clock_timestamp()::text;
  v_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  PERFORM set_config('app.allow_signature_write', 'true', true);

  IF _parte = 'empresa' THEN
    UPDATE public.desligamentos
    SET assinado_empresa = true, hash_assinatura_empresa = v_hash, data_assinatura_empresa = now()
    WHERE id = _desligamento_id;
  ELSE
    UPDATE public.desligamentos
    SET assinado_colaborador = true, hash_assinatura_colaborador = v_hash, data_assinatura_colaborador = now()
    WHERE id = _desligamento_id;
  END IF;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', auth.uid(),
          jsonb_build_object('action','assinar_desligamento','parte',_parte,'hash',v_hash));

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.assinar_desligamento(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assinar_desligamento(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.pagar_desligamento(_desligamento_id UUID, _comprovante_url TEXT DEFAULT NULL)
RETURNS public.desligamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar pagamento de rescisao' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status IS DISTINCT FROM 'homologado' THEN
    RAISE EXCEPTION 'Rescisao so pode ser paga apos homologacao (status atual: %)', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE(v_row.assinado_empresa, false) OR NOT COALESCE(v_row.assinado_colaborador, false) THEN
    RAISE EXCEPTION 'Rescisao precisa da assinatura da empresa e do colaborador antes do pagamento'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.desligamentos
  SET status = 'pago', etapa = 'concluido', checklist_pagamento = true,
      data_pagamento = now(), comprovante_pagamento_url = _comprovante_url
  WHERE id = _desligamento_id
  RETURNING * INTO v_row;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', auth.uid(),
          jsonb_build_object('action','pagar_desligamento','comprovante_url',_comprovante_url));

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.pagar_desligamento(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pagar_desligamento(UUID, TEXT) TO authenticated;

-- ===================================================================
-- PARTE B — Apagamento LGPD real (achados N22/N23)
-- ===================================================================

CREATE OR REPLACE FUNCTION public.anonimizar_dados_pessoais(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_anon_cpf TEXT;
BEGIN
  -- Chamada direta por um usuario (via lgpdService/bridge) precisa ser
  -- admin; chamada pelo job de drenagem (SECURITY DEFINER, sem sessao de
  -- usuario) tem auth.uid() NULL e prossegue (contexto de sistema).
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar apagamento LGPD' USING ERRCODE = '42501';
  END IF;

  -- Achado N23: '000.000.000-00' (14 chars) estourava CHAR(11) e colidia
  -- (UNIQUE) a partir do 2o registro anonimizado. CPF sintetico agora e
  -- numerico, 11 digitos, deterministico e unico por colaborador.
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

  -- PII em tabelas relacionadas (achado N23 — "PII sobrevive em
  -- contas_bancarias, dependentes, documentos...").
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

-- Achado N22: anonimizar_dados_pessoais nunca era invocada — mantinha o
-- grant restrito a service_role. Ampliado para authenticated (com a
-- checagem de is_admin acima) para permitir a chamada real a partir do
-- fluxo de "Concluir" solicitação de exclusão em LGPDPage.tsx.
REVOKE ALL ON FUNCTION public.anonimizar_dados_pessoais(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonimizar_dados_pessoais(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_dados_pessoais(UUID) TO service_role;

-- Achado N22: fila lgpd_fila_limpeza nunca era drenada. Função de sistema
-- (service_role apenas — roda a partir da edge function `limpeza`, não é
-- chamada diretamente por usuários) que processa os itens vencidos.
CREATE OR REPLACE FUNCTION public.drenar_fila_limpeza_lgpd()
RETURNS TABLE (registro_id UUID, sucesso BOOLEAN, erro TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM public.lgpd_fila_limpeza
    WHERE executado = false AND data_programada <= CURRENT_DATE AND tabela = 'colaboradores'
    ORDER BY data_programada
  LOOP
    BEGIN
      PERFORM public.anonimizar_dados_pessoais(v_item.registro_id);
      UPDATE public.lgpd_fila_limpeza SET executado = true, processed_at = now() WHERE id = v_item.id;
      registro_id := v_item.registro_id; sucesso := true; erro := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      registro_id := v_item.registro_id; sucesso := false; erro := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.drenar_fila_limpeza_lgpd() TO service_role;
