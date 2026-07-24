-- Performance indexes for security-critical tenant isolation queries
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_id ON public.audit_log (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_created ON public.audit_log (empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_registro_id ON public.audit_log (registro_id)',
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON public.colaboradores (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status ON public.colaboradores (empresa_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_id ON public.folhas_pagamento (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_competencia ON public.folhas_pagamento (empresa_id, competencia DESC)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_colaborador_id ON public.ferias (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_status ON public.ferias (status)',
    'CREATE INDEX IF NOT EXISTS idx_pontos_colaborador_id ON public.pontos (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_pontos_colaborador_data ON public.pontos (colaborador_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_webhooks_config_empresa_id ON public.webhooks_config (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_empresa_id ON public.webhook_logs (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_empresa_created ON public.webhook_logs (empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_cnab_configuracoes_empresa_id ON public.cnab_configuracoes (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_cnab_remessas_empresa_id ON public.cnab_remessas (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_cnab_remessas_empresa_created ON public.cnab_remessas (empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_campanhas_empresa_id ON public.premiacoes_campanhas (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_pagamentos_campanha_id ON public.premiacoes_pagamentos (campanha_id)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_pagamentos_status ON public.premiacoes_pagamentos (status)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_pagamentos_colaborador ON public.premiacoes_pagamentos (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_roi_cenarios_empresa_id ON public.premiacoes_roi_cenarios (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes (user_id, lida, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_periodos_experiencia_colaborador_id ON public.periodos_experiencia (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_empresa_id ON public.user_roles (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_dependentes_colaborador_id ON public.dependentes (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_historico_salarial_colaborador_id ON public.historico_salarial (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_asos_colaborador_id ON public.asos (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_formacoes_academicas_colaborador_id ON public.formacoes_academicas (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_folha_itens_colaborador_id ON public.folha_itens (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_folha_itens_folha_id ON public.folha_itens (folha_id)',
    'CREATE INDEX IF NOT EXISTS idx_documentos_colaborador_id ON public.documentos (colaborador_id)',
    'CREATE INDEX IF NOT EXISTS idx_documentos_empresa_id ON public.documentos (empresa_id)'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
