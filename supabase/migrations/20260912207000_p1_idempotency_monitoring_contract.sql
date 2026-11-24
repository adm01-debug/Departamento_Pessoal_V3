-- P1: align the idempotency monitor with the runtime state machine.
DO $preflight$
BEGIN
  IF to_regclass('public.idempotency_keys') IS NULL
     OR to_regclass('public.security_alerts') IS NULL
     OR to_regclass('public.v_idempotency_metrics') IS NULL THEN
    RAISE EXCEPTION 'idempotency monitoring requires keys, metrics and security alerts';
  END IF;
END
$preflight$;

DROP INDEX IF EXISTS public.idx_idempotency_status;
CREATE INDEX idx_idempotency_status
  ON public.idempotency_keys (created_at)
  WHERE status = 'in_progress';

CREATE OR REPLACE FUNCTION public.check_idempotency_anomalies()
RETURNS TABLE (endpoint text, severity text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  metric record;
  stale record;
BEGIN
  FOR metric IN
    SELECT m.endpoint, m.total_24h, m.failed_24h, m.failure_rate_pct_24h
    FROM public.v_idempotency_metrics m
    WHERE m.total_24h >= 10 AND m.failure_rate_pct_24h > 5
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.security_alerts a
      WHERE a.type = 'IDEMPOTENCY_HIGH_FAILURE'
        AND a.details ->> 'endpoint' = metric.endpoint
        AND a.resolved = false
        AND a.created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO public.security_alerts(type, severity, details)
      VALUES (
        'IDEMPOTENCY_HIGH_FAILURE',
        CASE WHEN metric.failure_rate_pct_24h > 20 THEN 'critical'
             WHEN metric.failure_rate_pct_24h > 10 THEN 'high' ELSE 'medium' END,
        jsonb_build_object(
          'endpoint', metric.endpoint,
          'failure_rate_pct', metric.failure_rate_pct_24h,
          'total_24h', metric.total_24h,
          'failed_24h', metric.failed_24h,
          'detected_at', now()
        )
      );
      RETURN QUERY SELECT metric.endpoint::text,
        CASE WHEN metric.failure_rate_pct_24h > 20 THEN 'critical'::text
             WHEN metric.failure_rate_pct_24h > 10 THEN 'high'::text ELSE 'medium'::text END,
        format('Taxa de falha %s%% em %s chamadas', metric.failure_rate_pct_24h, metric.total_24h)::text;
    END IF;
  END LOOP;

  -- The runtime treats an in_progress row older than five minutes as an
  -- indeterminate outcome. Alert per endpoint, but never auto-reconcile: only
  -- the domain operation can decide whether its external effect occurred.
  FOR stale IN
    SELECT k.endpoint, count(*)::integer AS stale_count
    FROM public.idempotency_keys k
    WHERE k.status = 'in_progress'
      AND k.created_at < now() - interval '5 minutes'
      AND k.expires_at > now()
    GROUP BY k.endpoint
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.security_alerts a
      WHERE a.type = 'IDEMPOTENCY_STALE_IN_PROGRESS'
        AND a.details ->> 'endpoint' = stale.endpoint
        AND a.resolved = false
        AND a.created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO public.security_alerts(type, severity, details)
      VALUES (
        'IDEMPOTENCY_STALE_IN_PROGRESS',
        CASE WHEN stale.stale_count > 20 THEN 'high' ELSE 'medium' END,
        jsonb_build_object(
          'endpoint', stale.endpoint,
          'stale_count', stale.stale_count,
          'threshold_minutes', 5,
          'requires_domain_reconciliation', true,
          'detected_at', now()
        )
      );
      RETURN QUERY SELECT stale.endpoint::text,
        CASE WHEN stale.stale_count > 20 THEN 'high'::text ELSE 'medium'::text END,
        format('%s resultados idempotentes indeterminados em in_progress > 5min', stale.stale_count)::text;
    END IF;
  END LOOP;
END
$function$;

REVOKE ALL ON FUNCTION public.check_idempotency_anomalies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_idempotency_anomalies() TO service_role;
