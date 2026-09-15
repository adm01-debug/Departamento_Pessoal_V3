-- P1: attach bridge telemetry to its tenant and prevent cross-company KPIs.
DO $preflight$
BEGIN
  IF to_regclass('public.query_telemetry') IS NULL THEN
    RAISE EXCEPTION 'tenant telemetry contract requires public.query_telemetry';
  END IF;
END
$preflight$;

ALTER TABLE public.query_telemetry
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS trace_id text;
CREATE INDEX IF NOT EXISTS idx_query_telemetry_empresa_created
  ON public.query_telemetry (empresa_id, created_at DESC)
  WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_telemetry_trace_id
  ON public.query_telemetry (trace_id)
  WHERE trace_id IS NOT NULL;

ALTER TABLE public.query_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Authenticated users can insert telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Authenticated users can delete telemetry" ON public.query_telemetry;
REVOKE ALL ON public.query_telemetry FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.query_telemetry TO service_role;

DROP VIEW IF EXISTS public.v_telemetry_last_hour;
DROP VIEW IF EXISTS public.v_telemetry_slow_queries;
DROP MATERIALIZED VIEW IF EXISTS public.mv_telemetry_dashboard CASCADE;
CREATE MATERIALIZED VIEW public.mv_telemetry_dashboard AS
SELECT
  empresa_id,
  date_trunc('hour', created_at) AS hour,
  table_name,
  operation,
  severity,
  count(*) AS query_count,
  avg(duration_ms) AS avg_ms,
  min(duration_ms) AS min_ms,
  max(duration_ms) AS max_ms,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY duration_ms) AS p75_ms,
  percentile_cont(0.90) WITHIN GROUP (ORDER BY duration_ms) AS p90_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms,
  count(*) FILTER (WHERE severity IN ('error','fatal')) AS error_count
FROM public.query_telemetry
WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '90 days'
GROUP BY 1,2,3,4,5
WITH NO DATA;
CREATE UNIQUE INDEX idx_mv_telemetry_tenant_key
  ON public.mv_telemetry_dashboard (empresa_id, hour, table_name, operation, severity);
CREATE INDEX idx_mv_telemetry_tenant_p95
  ON public.mv_telemetry_dashboard (empresa_id, hour DESC, p95_ms DESC);

CREATE VIEW public.v_telemetry_last_hour WITH (security_invoker=true) AS
SELECT empresa_id, table_name, operation, severity, count(*) AS query_count,
  avg(duration_ms)::integer AS avg_ms, max(duration_ms)::integer AS max_ms,
  count(*) FILTER (WHERE severity IN ('error','fatal')) AS error_count
FROM public.query_telemetry
WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '1 hour'
GROUP BY 1,2,3,4;

CREATE VIEW public.v_telemetry_slow_queries WITH (security_invoker=true) AS
SELECT id, empresa_id, created_at, user_id, table_name, operation,
  duration_ms, severity
FROM public.query_telemetry
WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '1 hour'
  AND duration_ms > 5000
ORDER BY created_at DESC;

CREATE OR REPLACE FUNCTION public.refresh_telemetry_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_telemetry_dashboard;
EXCEPTION WHEN feature_not_supported OR object_not_in_prerequisite_state THEN
  REFRESH MATERIALIZED VIEW public.mv_telemetry_dashboard;
END
$function$;

REVOKE ALL ON public.mv_telemetry_dashboard,
  public.v_telemetry_last_hour, public.v_telemetry_slow_queries
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mv_telemetry_dashboard,
  public.v_telemetry_last_hour, public.v_telemetry_slow_queries TO service_role;
REVOKE ALL ON FUNCTION public.refresh_telemetry_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_telemetry_views() TO service_role;

-- Do not leave the replacement materialized view unreadable/empty until the
-- first scheduler tick. The helper falls back to a non-concurrent first load.
SELECT public.refresh_telemetry_views();
