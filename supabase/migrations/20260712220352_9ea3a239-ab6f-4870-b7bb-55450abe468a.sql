
-- Melhoria 30: Índices para acelerar a view v_audit_events_unified e RPCs de auditoria
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_created_at ON public.auditoria_logs (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_audit_log_created_at ON public.ferias_audit_log (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_aud_created_at ON public.premiacoes_auditoria (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_ponto_auditoria_created_at ON public.ponto_auditoria (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_folha_auditoria_created_at ON public.folha_auditoria (created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log (user_id) WHERE user_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id) WHERE user_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON public.auditoria (usuario_id) WHERE usuario_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_user_id ON public.auditoria_logs (user_id) WHERE user_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_ferias_audit_usuario_id ON public.ferias_audit_log (usuario_id) WHERE usuario_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_aud_usuario_id ON public.premiacoes_auditoria (usuario_id) WHERE usuario_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_ponto_auditoria_usuario_id ON public.ponto_auditoria (usuario_id) WHERE usuario_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON public.auditoria (entidade, entidade_id)',
    'CREATE INDEX IF NOT EXISTS idx_auditoria_logs_entidade ON public.auditoria_logs (entidade, entidade_id)',
    'CREATE INDEX IF NOT EXISTS idx_ferias_audit_entidade ON public.ferias_audit_log (entidade_tipo, entidade_id)',
    'CREATE INDEX IF NOT EXISTS idx_premiacoes_aud_entidade ON public.premiacoes_auditoria (entidade_tipo, entidade_id)'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
