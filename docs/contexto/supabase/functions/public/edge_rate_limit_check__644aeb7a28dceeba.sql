CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(p_key text, p_limit integer, p_window_sec integer, p_now bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_now bigint := coalesce(p_now, extract(epoch FROM now())::bigint);
  v_window_start bigint;
  v_current integer;
  v_oldest bigint;
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

  SELECT count(*)::integer, min("timestamp")
    INTO v_current, v_oldest
    FROM public.rate_limits
   WHERE key = p_key
     AND "timestamp" >= v_window_start;

  v_allowed := v_current < p_limit;
  IF v_allowed THEN
    INSERT INTO public.rate_limits (key, "timestamp") VALUES (p_key, v_now);
    v_current := v_current + 1;
    v_oldest := coalesce(v_oldest, v_now);
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current', v_current,
    'limit', p_limit,
    'remaining', greatest(0, p_limit - v_current),
    -- Earliest active event expires at oldest+window. Returning v_now here
    -- makes clients retry immediately and creates a thundering herd.
    'reset', coalesce(v_oldest, v_now) + p_window_sec
  );
END;
$function$
