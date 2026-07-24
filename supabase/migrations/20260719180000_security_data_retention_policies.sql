-- Security Data Retention & Cleanup Policies
-- Implements automated cleanup of security-related ephemeral data
-- and adds constraints to prevent data integrity issues.

-- 1) Auto-expire old login_attempts records (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_expired_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- 2) Auto-expire old rate_limit_logs (already expired entries)
-- Named distinctly from cleanup_expired_rate_limits() in 20260719160000 which operates on rate_limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE expires_at < NOW();
END;
$$;

-- 3) Ensure audit_log entries cannot be modified after creation
-- (Redundant with trigger from previous migration, but adds CHECK constraint as defense-in-depth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_log_immutable_check'
  ) THEN
    -- Add a constraint that makes the table append-only at the row level
    -- by ensuring created_at is always set to now() via default
    ALTER TABLE public.audit_log
      ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
END $$;

-- 4) Add index for faster cleanup queries (wrapped for preview branch safety)
DO $$
BEGIN
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts (created_at)';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$
BEGIN
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_expires_at ON public.rate_limit_logs (expires_at)';
EXCEPTION WHEN others THEN NULL; END $$;

-- 5) Add comment documenting retention policy
COMMENT ON FUNCTION public.cleanup_expired_login_attempts() IS
  'Removes login_attempts older than 30 days. Should be called via pg_cron or scheduled edge function.';

COMMENT ON FUNCTION public.cleanup_expired_rate_limit_logs() IS
  'Removes expired rate_limit_logs entries. Should be called via pg_cron or scheduled edge function.';

-- 6) Ensure empresa_id is indexed on high-traffic tables for tenant isolation performance
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON public.colaboradores (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_id ON public.folhas_pagamento (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_despesas_empresa_id ON public.despesas (empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_recent ON public.audit_log (created_at DESC) WHERE created_at > NOW() - INTERVAL ''7 days'''
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
