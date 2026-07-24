
-- Melhoria #33 — Índices parciais para acelerar scanner de anomalias e consultas de auditoria
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_audit_log_status_change_scan ON public.audit_log (tabela, created_at DESC) WHERE acao = ''STATUS_CHANGE''',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_registro_created ON public.audit_log (registro_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON public.audit_log (user_id, created_at DESC) WHERE user_id IS NOT NULL'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

DO $$
BEGIN
  ANALYZE public.audit_log;
EXCEPTION WHEN others THEN
  NULL;
END $$;
