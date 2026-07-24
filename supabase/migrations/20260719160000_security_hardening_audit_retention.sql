-- Security Hardening: Data Retention + Audit Log Immutability
-- Prevents deletion/update of audit_log records and adds automatic cleanup of stale rate_limits.

-- =============================================================================
-- IMMUTABLE AUDIT LOG: prevent UPDATE/DELETE on audit_log table
-- Only INSERTs are allowed — audit trail must be tamper-proof.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log records are immutable — UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- =============================================================================
-- RATE LIMITS CLEANUP: automatic cleanup of expired rate limit entries
-- Runs as a periodic job (pg_cron) or on-demand via RPC.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE timestamp < (EXTRACT(EPOCH FROM now())::BIGINT - 3600);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- LOGIN ATTEMPTS CLEANUP: remove entries older than 24 hours
-- Keeps the login_attempts table lean for fast brute-force checks.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SENSITIVE COLUMN MASKING: ensure CPF/PIS are never fully exposed in audit_log
-- This trigger masks sensitive fields BEFORE they are written to audit_log.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mask_sensitive_audit_data()
RETURNS TRIGGER AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY['cpf', 'pis', 'pis_pasep', 'numero_ctps', 'rg'];
  k TEXT;
BEGIN
  IF NEW.dados_anteriores IS NOT NULL THEN
    FOREACH k IN ARRAY sensitive_keys LOOP
      IF NEW.dados_anteriores ? k THEN
        NEW.dados_anteriores = jsonb_set(
          NEW.dados_anteriores,
          ARRAY[k],
          to_jsonb('***MASKED***'::TEXT)
        );
      END IF;
    END LOOP;
  END IF;

  IF NEW.dados_novos IS NOT NULL THEN
    FOREACH k IN ARRAY sensitive_keys LOOP
      IF NEW.dados_novos ? k THEN
        NEW.dados_novos = jsonb_set(
          NEW.dados_novos,
          ARRAY[k],
          to_jsonb('***MASKED***'::TEXT)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_mask_sensitive ON public.audit_log;
CREATE TRIGGER trg_audit_log_mask_sensitive
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.mask_sensitive_audit_data();
