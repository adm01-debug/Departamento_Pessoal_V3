
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_holerites_folha_id ON public.holerites(folha_id)',
    'CREATE INDEX IF NOT EXISTS idx_holerites_assinado ON public.holerites(assinado) WHERE assinado = true',
    'CREATE INDEX IF NOT EXISTS idx_batidas_ponto_data ON public.batidas_ponto(data)',
    'CREATE INDEX IF NOT EXISTS idx_batidas_ponto_anomalia ON public.batidas_ponto(colaborador_id, data) WHERE anomalia_detectada = true',
    'CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_status ON public.folhas_pagamento(status)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_data_inicio ON public.ferias(data_inicio)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_empresa_status ON public.ferias(empresa_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_afastamentos_ativo ON public.afastamentos(empresa_id, data_inicio) WHERE status = ''ativo''',
    'CREATE INDEX IF NOT EXISTS idx_afastamentos_cid ON public.afastamentos(cid) WHERE cid IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_desligamentos_data ON public.desligamentos(empresa_id, data_desligamento)',
    'CREATE INDEX IF NOT EXISTS idx_desligamentos_status ON public.desligamentos(status)',
    'CREATE INDEX IF NOT EXISTS idx_medidas_empresa_data ON public.medidas_disciplinares(empresa_id, data_ocorrencia DESC)',
    'CREATE INDEX IF NOT EXISTS idx_medidas_tipo ON public.medidas_disciplinares(tipo)',
    'CREATE INDEX IF NOT EXISTS idx_asos_validade ON public.asos(data_validade) WHERE data_validade IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_asos_empresa_tipo ON public.asos(empresa_id, tipo)',
    'CREATE INDEX IF NOT EXISTS idx_esocial_status_comp ON public.esocial_eventos(status, competencia)',
    'CREATE INDEX IF NOT EXISTS idx_esocial_tipo ON public.esocial_eventos(empresa_id, tipo_evento)',
    'CREATE INDEX IF NOT EXISTS idx_cnab_status ON public.cnab_remessas(empresa_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_cnab_data ON public.cnab_remessas(data_geracao DESC)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_entidade ON public.auditoria_logs(entidade, entidade_id)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_created ON public.auditoria_logs(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_user ON public.auditoria_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.notificacoes(user_id, created_at DESC) WHERE lida = false',
    'CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_idempotency_status ON public.idempotency_keys(status) WHERE status = ''pending''',
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status ON public.colaboradores(empresa_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON public.colaboradores(cpf) WHERE cpf IS NOT NULL'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

ANALYZE;
