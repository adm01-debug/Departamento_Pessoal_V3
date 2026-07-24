
-- Melhoria #18 (v3): Ajuste final de colunas por tabela
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_created ON public.colaboradores(empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_ativos ON public.colaboradores(empresa_id, created_at DESC) WHERE status = ''ativo''',
    'CREATE INDEX IF NOT EXISTS idx_folhas_empresa_competencia ON public.folhas_pagamento(empresa_id, competencia DESC)',
    'CREATE INDEX IF NOT EXISTS idx_folhas_empresa_status ON public.folhas_pagamento(empresa_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_batidas_empresa_data ON public.batidas_ponto(empresa_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_batidas_colab_data ON public.batidas_ponto(colaborador_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_holerites_colab_created ON public.holerites(colaborador_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_holerites_folha ON public.holerites(folha_id)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_empresa_inicio ON public.ferias(empresa_id, data_inicio DESC)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_colab_status ON public.ferias(colaborador_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_faltas_empresa_data ON public.faltas(empresa_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_faltas_colab_data ON public.faltas(colaborador_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_unified_empresa_occurred ON public.audit_log_unified(empresa_id, occurred_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_unified_user_occurred ON public.audit_log_unified(user_id, occurred_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON public.audit_log(user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_empresa_created ON public.auditoria_logs(empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_notificacoes_user_unread ON public.notificacoes(user_id, created_at DESC) WHERE lida = false',
    'CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa_created ON public.notificacoes(empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_registros_ponto_empresa_data ON public.registros_ponto(empresa_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_registros_ponto_colab_data ON public.registros_ponto(colaborador_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_admissoes_empresa_created ON public.admissoes(empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_desligamentos_empresa_created ON public.desligamentos(empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_desligamentos_colab_status ON public.desligamentos(colaborador_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_afastamentos_empresa_inicio ON public.afastamentos(empresa_id, data_inicio DESC)',
    'CREATE INDEX IF NOT EXISTS idx_afastamentos_colab_status ON public.afastamentos(colaborador_id, status)'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

ANALYZE public.colaboradores;
ANALYZE public.folhas_pagamento;
ANALYZE public.batidas_ponto;
ANALYZE public.holerites;
ANALYZE public.ferias;
ANALYZE public.faltas;
ANALYZE public.registros_ponto;
ANALYZE public.admissoes;
ANALYZE public.desligamentos;
ANALYZE public.afastamentos;
