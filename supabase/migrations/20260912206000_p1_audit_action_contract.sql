-- P1: make the physical audit_log CHECK the single contract used by Edge
-- writers and the legacy status-change trigger. Several otherwise valid audit
-- events were rejected because the historical constraint omitted their names.

DO $preflight$
BEGIN
  IF to_regclass('public.audit_log') IS NULL THEN
    RAISE EXCEPTION 'audit action contract requires public.audit_log';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.audit_log'::regclass
      AND conname = 'audit_log_acao_check'
      AND contype = 'c'
  ) THEN
    RAISE EXCEPTION 'audit action contract requires audit_log_acao_check';
  END IF;
END
$preflight$;

ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_acao_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_acao_check CHECK (
  acao IN (
    'INSERT', 'UPDATE', 'DELETE',
    'PAYROLL_CALC', 'PAYROLL_CALC_BLOCKED', 'PAYROLL_CLOSE', 'PAYROLL_REOPEN',
    'FERIAS_CALC', 'FERIAS_CANCEL', 'RESCISAO_CALC', 'PROVISOES_CALC',
    'ESOCIAL_SEND', 'DECIMO_CALC',
    'IDEMPOTENCY_REPLAY', 'IDEMPOTENCY_CONFLICT',
    'BACKUP_CREATED', 'BACKUP_FAILED',
    'SYSTEM_ACTION', 'AUTH_ACTION',
    'EXPORT', 'IMPORT', 'VISUALIZACAO', 'EXECUTE_CALC', 'SIGN',
    'STATUS_CHANGE'
  )
);

COMMENT ON CONSTRAINT audit_log_acao_check ON public.audit_log IS
  'Canonical audit actions used by Edge writers and database status-change triggers; synchronized with the AST audit gate.';
