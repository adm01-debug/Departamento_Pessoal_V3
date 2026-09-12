-- P0: restore the atomic rate-limit RPC consumed by every protected Edge Function.
--
-- The canonical audit found the RPC absent. Without it, each Edge isolate
-- falls back to process-local counters, which disappear on cold starts and do
-- not serialize requests across instances.

DO $preflight$
DECLARE
  required_columns integer;
BEGIN
  IF to_regclass('public.rate_limits') IS NULL THEN
    RAISE EXCEPTION
      'P0 atomic rate-limit remediation requires public.rate_limits';
  END IF;

  SELECT count(*)
    INTO required_columns
  FROM pg_attribute
  WHERE attrelid = 'public.rate_limits'::regclass
    AND NOT attisdropped
    AND ((attname = 'key' AND atttypid = 'text'::regtype)
      OR (attname = 'timestamp' AND atttypid = 'bigint'::regtype));

  IF required_columns <> 2 THEN
    RAISE EXCEPTION
      'P0 atomic rate-limit remediation requires public.rate_limits(key text, timestamp bigint)';
  END IF;
END
$preflight$;

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp
  ON public.rate_limits (key, "timestamp" DESC);

CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(
  p_key text,
  p_limit integer,
  p_window_sec integer,
  p_now bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_now bigint := coalesce(p_now, extract(epoch FROM now())::bigint);
  v_window_start bigint;
  v_current integer;
  v_allowed boolean;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 512 THEN
    RAISE EXCEPTION 'p_key must contain between 1 and 512 characters';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 10000';
  END IF;
  IF p_window_sec IS NULL OR p_window_sec < 1 OR p_window_sec > 86400 THEN
    RAISE EXCEPTION 'p_window_sec must be between 1 and 86400 seconds';
  END IF;

  v_window_start := v_now - p_window_sec;

  -- One transaction-scoped advisory lock per logical key removes the
  -- SELECT-count/INSERT race without globally serializing unrelated keys.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('edge_rate_limit:' || p_key)::bigint);

  DELETE FROM public.rate_limits
   WHERE key = p_key
     AND "timestamp" < v_window_start;

  SELECT count(*)::integer
    INTO v_current
    FROM public.rate_limits
   WHERE key = p_key
     AND "timestamp" >= v_window_start;

  v_allowed := v_current < p_limit;
  IF v_allowed THEN
    INSERT INTO public.rate_limits (key, "timestamp") VALUES (p_key, v_now);
    v_current := v_current + 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current', v_current,
    'limit', p_limit,
    'remaining', greatest(0, p_limit - v_current),
    'reset', v_window_start + p_window_sec
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint)
  TO service_role;

COMMENT ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint) IS
  'Atomic, service-role-only sliding-window rate limit for Edge Functions.';
