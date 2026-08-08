-- ============================================================
-- 1) Trilha de auditoria de selos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sec_seal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id UUID,
  evento TEXT NOT NULL CHECK (evento IN ('selado', 'desselado')),
  detalhe TEXT,
  ator UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sec_seal_events TO authenticated;
GRANT ALL ON public.sec_seal_events TO service_role;

ALTER TABLE public.sec_seal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem eventos de selo" ON public.sec_seal_events;
CREATE POLICY "Admins leem eventos de selo"
  ON public.sec_seal_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sec_seal_events_tabela_data
  ON public.sec_seal_events (tabela, created_at DESC);

-- ============================================================
-- 2) Núcleo do selo — usado por todos os gatilhos
-- ============================================================
-- Regras (nesta ordem):
--   a) Registro fora do estado selado  -> sem selo. Se havia selo, é uma
--      reabertura legítima: remove o selo e registra o evento.
--   b) Primeira selagem                -> calcula. Se o cliente mandou um
--      código diferente do real, recusa (impede código forjado).
--   c) Já selado                       -> o conteúdo não pode mudar. Se o
--      recálculo diverge do selo gravado, algum campo protegido foi alterado.
--      Também recusa troca direta do código.
CREATE OR REPLACE FUNCTION public.seal_enforce(
  p_tabela TEXT,
  p_registro_id UUID,
  p_canonical TEXT,
  p_sealed BOOLEAN,
  p_old_hash TEXT,
  p_new_hash TEXT,
  p_op TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_expected TEXT;
  v_had_seal BOOLEAN := (p_old_hash IS NOT NULL AND p_old_hash <> '');
BEGIN
  IF NOT p_sealed THEN
    IF v_had_seal THEN
      INSERT INTO public.sec_seal_events (tabela, registro_id, evento, detalhe)
      VALUES (p_tabela, p_registro_id, 'desselado',
              'Registro saiu do estado selado; selo anterior removido.');
    END IF;
    RETURN NULL;
  END IF;

  v_expected := encode(digest(p_canonical, 'sha256'), 'hex');

  IF NOT v_had_seal THEN
    IF p_new_hash IS NOT NULL AND p_new_hash <> '' AND p_new_hash <> v_expected THEN
      RAISE EXCEPTION
        'Selo de integridade inválido para %: o código enviado não confere com o conteúdo do registro.',
        p_tabela
        USING ERRCODE = 'check_violation';
    END IF;

    IF p_op = 'UPDATE' THEN
      INSERT INTO public.sec_seal_events (tabela, registro_id, evento, detalhe)
      VALUES (p_tabela, p_registro_id, 'selado', 'Registro atingiu o estado selado.');
    END IF;

    RETURN v_expected;
  END IF;

  IF v_expected <> p_old_hash THEN
    RAISE EXCEPTION
      'Registro selado de % não pode ser alterado: algum campo protegido pelo selo de integridade foi modificado.',
      p_tabela
      USING ERRCODE = 'check_violation',
            HINT = 'Reabra o registro (retirando-o do estado selado) antes de corrigir os dados.';
  END IF;

  IF p_new_hash IS DISTINCT FROM p_old_hash THEN
    RAISE EXCEPTION
      'O selo de integridade de % não pode ser substituído manualmente.', p_tabela
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN p_old_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.seal_enforce(TEXT, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3) Gatilhos reescritos (fórmulas canônicas preservadas)
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_folha_pagamento_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'folhas_pagamento', NEW.id,
    COALESCE(NEW.empresa_id::text, '')      || '|' ||
    COALESCE(NEW.competencia::text, '')     || '|' ||
    COALESCE(NEW.total_proventos::text,'0') || '|' ||
    COALESCE(NEW.total_descontos::text,'0') || '|' ||
    COALESCE(NEW.total_liquido::text, '0')  || '|' ||
    COALESCE(NEW.version::text, '1')        || '|' ||
    COALESCE(NEW.status::text, ''),
    NEW.status::text IN ('fechada','fechado','closed'),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_batida_ponto_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'batidas_ponto', NEW.id,
    COALESCE(NEW.colaborador_id::text, '') || '|' ||
    COALESCE(NEW.data::text, '')           || '|' ||
    COALESCE(NEW.hora::text, '')           || '|' ||
    COALESCE(NEW.tipo, '')                 || '|' ||
    COALESCE(NEW.dispositivo_id, ''),
    TRUE,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_medida_disciplinar_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'medidas_disciplinares', NEW.id,
    COALESCE(NEW.colaborador_id::text,'')         || '|' ||
    COALESCE(NEW.empresa_id::text,'')             || '|' ||
    COALESCE(NEW.tipo,'')                         || '|' ||
    COALESCE(NEW.data_ocorrencia::text,'')        || '|' ||
    COALESCE(NEW.descricao,'')                    || '|' ||
    COALESCE(NEW.dias_suspensao::text,'0')        || '|' ||
    COALESCE(NEW.artigo_clt,'')                   || '|' ||
    COALESCE(NEW.testemunha_1_nome,'')            || '|' ||
    COALESCE(NEW.testemunha_1_cpf,'')             || '|' ||
    COALESCE(NEW.testemunha_2_nome,'')            || '|' ||
    COALESCE(NEW.testemunha_2_cpf,'')             || '|' ||
    COALESCE(NEW.recusa_assinatura::text,'false') || '|' ||
    COALESCE(NEW.data_ciencia::text,'')           || '|' ||
    COALESCE(NEW.assinado_em::text,''),
    (NEW.status IN ('aplicada','assinada','ciente','homologada','concluida','concluída')
      OR NEW.colaborador_ciente = true
      OR NEW.assinado_em IS NOT NULL
      OR NEW.recusa_assinatura = true),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_ferias_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'ferias', NEW.id,
    COALESCE(NEW.colaborador_id::text,'')        || '|' ||
    COALESCE(NEW.empresa_id::text,'')            || '|' ||
    COALESCE(NEW.periodo_aquisitivo_id::text,'') || '|' ||
    COALESCE(NEW.data_inicio::text,'')           || '|' ||
    COALESCE(NEW.data_fim::text,'')              || '|' ||
    COALESCE(NEW.dias_gozo::text,'0')            || '|' ||
    COALESCE(NEW.dias_abono::text,'0')           || '|' ||
    COALESCE(NEW.valor_ferias::text,'0')         || '|' ||
    COALESCE(NEW.valor_terco::text,'0')          || '|' ||
    COALESCE(NEW.valor_abono::text,'0')          || '|' ||
    COALESCE(NEW.valor_terco_abono::text,'0')    || '|' ||
    COALESCE(NEW.valor_total::text,'0')          || '|' ||
    COALESCE(NEW.descontos_inss::text,'0')       || '|' ||
    COALESCE(NEW.descontos_irrf::text,'0')       || '|' ||
    COALESCE(NEW.valor_liquido::text,'0'),
    NEW.status::text IN ('em_gozo','paga','concluida','homologada','concluída'),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_desligamento_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'desligamentos', NEW.id,
    COALESCE(NEW.colaborador_id::text,'')       || '|' ||
    COALESCE(NEW.empresa_id::text,'')           || '|' ||
    COALESCE(NEW.data_desligamento::text,'')    || '|' ||
    COALESCE(NEW.tipo::text,'')                 || '|' ||
    COALESCE(NEW.saldo_salario::text,'0')       || '|' ||
    COALESCE(NEW.aviso_previo::text,'0')        || '|' ||
    COALESCE(NEW.ferias_vencidas::text,'0')     || '|' ||
    COALESCE(NEW.ferias_proporcionais::text,'0')|| '|' ||
    COALESCE(NEW.terco_constitucional::text,'0')|| '|' ||
    COALESCE(NEW.decimo_terceiro::text,'0')     || '|' ||
    COALESCE(NEW.multa_fgts::text,'0')          || '|' ||
    COALESCE(NEW.total_proventos::text,'0')     || '|' ||
    COALESCE(NEW.total_descontos::text,'0')     || '|' ||
    COALESCE(NEW.valor_liquido::text,'0'),
    NEW.status::text IN ('homologado','finalizado','concluido','concluído'),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_holerite_signed_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_assinatura := public.seal_enforce(
    'holerites', NEW.id,
    COALESCE(NEW.folha_id::text,'')        || '|' ||
    COALESCE(NEW.colaborador_id::text,'')  || '|' ||
    COALESCE(NEW.colaborador_cpf,'')       || '|' ||
    COALESCE(NEW.total_proventos::text,'0')|| '|' ||
    COALESCE(NEW.total_descontos::text,'0')|| '|' ||
    COALESCE(NEW.liquido::text,'0')        || '|' ||
    COALESCE(NEW.valor_inss::text,'0')     || '|' ||
    COALESCE(NEW.valor_irrf::text,'0')     || '|' ||
    COALESCE(NEW.valor_fgts::text,'0'),
    NEW.assinado = true,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_assinatura END,
    NEW.hash_assinatura, TG_OP);

  IF NEW.assinado = true AND NEW.data_assinatura IS NULL THEN
    NEW.data_assinatura := now();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_aso_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'asos', NEW.id,
    COALESCE(NEW.colaborador_id::text,'') || '|' ||
    COALESCE(NEW.empresa_id::text,'')     || '|' ||
    COALESCE(NEW.tipo,'')                 || '|' ||
    COALESCE(NEW.data_exame::text,'')     || '|' ||
    COALESCE(NEW.data_validade::text,'')  || '|' ||
    COALESCE(NEW.resultado,'')            || '|' ||
    COALESCE(NEW.medico_nome,'')          || '|' ||
    COALESCE(NEW.medico_crm,'')           || '|' ||
    COALESCE(NEW.clinica,'')              || '|' ||
    COALESCE(NEW.arquivo_url,''),
    (NEW.medico_nome IS NOT NULL AND NEW.medico_crm IS NOT NULL
      AND NEW.arquivo_url IS NOT NULL AND NEW.arquivo_url <> ''),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_epi_entrega_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'epis_entregas', NEW.id,
    COALESCE(NEW.epi_id::text,'')         || '|' ||
    COALESCE(NEW.colaborador_id::text,'') || '|' ||
    COALESCE(NEW.empresa_id::text,'')     || '|' ||
    COALESCE(NEW.data_entrega::text,'')   || '|' ||
    COALESCE(NEW.quantidade::text,'1')    || '|' ||
    COALESCE(NEW.motivo,'')               || '|' ||
    COALESCE(NEW.assinatura_url,'')       || '|' ||
    COALESCE(NEW.entregue_por::text,''),
    (NEW.assinatura_url IS NOT NULL AND NEW.assinatura_url <> ''),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_esocial_evento_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_arquivo := public.seal_enforce(
    'esocial_eventos', NEW.id,
    COALESCE(NEW.empresa_id::text,'')    || '|' ||
    COALESCE(NEW.tipo_evento,'')         || '|' ||
    COALESCE(NEW.competencia,'')         || '|' ||
    COALESCE(NEW.xml_envio, NEW.xml, '') || '|' ||
    COALESCE(NEW.protocolo,'')           || '|' ||
    COALESCE(NEW.recibo,'')              || '|' ||
    COALESCE(NEW.id_recibo,''),
    (NEW.status IN ('enviado','processado','aceito')
      OR NEW.recibo IS NOT NULL OR NEW.id_recibo IS NOT NULL),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_arquivo END,
    NEW.hash_arquivo, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_documento_assinatura_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.assinado_em IS NULL AND NEW.status = 'assinado' THEN
    NEW.assinado_em := now();
  END IF;

  NEW.hash_documento := public.seal_enforce(
    'documentos_assinatura', NEW.id,
    COALESCE(NEW.colaborador_id::text,'')  || '|' ||
    COALESCE(NEW.empresa_id::text,'')      || '|' ||
    COALESCE(NEW.tipo_documento,'')        || '|' ||
    COALESCE(NEW.titulo,'')                || '|' ||
    COALESCE(NEW.conteudo_url,'')          || '|' ||
    COALESCE(NEW.assinatura_base64,'')     || '|' ||
    COALESCE(NEW.assinado_em::text,'')     || '|' ||
    COALESCE(NEW.assinado_por::text,'')    || '|' ||
    COALESCE(NEW.ip_assinatura,'')         || '|' ||
    COALESCE(NEW.validade_assinatura::text,''),
    (NEW.status = 'assinado' OR NEW.assinatura_base64 IS NOT NULL OR NEW.assinado_em IS NOT NULL),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_documento END,
    NEW.hash_documento, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_cnab_remessa_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'cnab_remessas', NEW.id,
    COALESCE(NEW.empresa_id::text,'')        || '|' ||
    COALESCE(NEW.banco_codigo,'')            || '|' ||
    COALESCE(NEW.sequencial_arquivo::text,'')|| '|' ||
    COALESCE(NEW.data_geracao::text,'')      || '|' ||
    COALESCE(NEW.total_pagamentos::text,'0') || '|' ||
    COALESCE(NEW.valor_total::text,'0')      || '|' ||
    COALESCE(NEW.arquivo_url,''),
    NEW.status IN ('transmitida','enviada','processada','confirmada'),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_afastamento_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'afastamentos', NEW.id,
    COALESCE(NEW.colaborador_id::text,'')    || '|' ||
    COALESCE(NEW.empresa_id::text,'')        || '|' ||
    COALESCE(NEW.tipo::text,'')              || '|' ||
    COALESCE(NEW.data_inicio::text,'')       || '|' ||
    COALESCE(NEW.data_fim_prevista::text,'') || '|' ||
    COALESCE(NEW.data_fim_real::text,'')     || '|' ||
    COALESCE(NEW.dias_empresa::text,'0')     || '|' ||
    COALESCE(NEW.dias_inss::text,'0')        || '|' ||
    COALESCE(NEW.cid::text,'')               || '|' ||
    COALESCE(NEW.numero_beneficio::text,'')  || '|' ||
    COALESCE(NEW.medico_nome::text,'')       || '|' ||
    COALESCE(NEW.medico_crm::text,'')        || '|' ||
    COALESCE(NEW.atestado_numero::text,'')   || '|' ||
    COALESCE(NEW.data_pericia::text,'')      || '|' ||
    COALESCE(NEW.status::text,''),
    (NEW.status::text IN ('encerrado','cancelado') OR NEW.aprovado_em IS NOT NULL),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_cat_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_integridade := public.seal_enforce(
    'sst_cat', NEW.id,
    COALESCE(NEW.colaborador_id::text,'')         || '|' ||
    COALESCE(NEW.empresa_id::text,'')             || '|' ||
    COALESCE(NEW.data_acidente::text,'')          || '|' ||
    COALESCE(NEW.tipo_acidente,'')                || '|' ||
    COALESCE(NEW.local_acidente,'')               || '|' ||
    COALESCE(NEW.parte_corpo_atingida,'')         || '|' ||
    COALESCE(NEW.agente_causador,'')              || '|' ||
    COALESCE(NEW.houve_afastamento::text,'false') || '|' ||
    COALESCE(NEW.houve_obito::text,'false')       || '|' ||
    COALESCE(NEW.protocolo_esocial,''),
    ((NEW.protocolo_esocial IS NOT NULL AND NEW.protocolo_esocial <> '')
      OR NEW.status_esocial IN ('enviado','processado','aceito','transmitido')),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.hash_integridade END,
    NEW.hash_integridade, TG_OP);
  RETURN NEW;
END; $$;