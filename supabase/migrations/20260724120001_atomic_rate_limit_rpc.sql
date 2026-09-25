-- =============================================================================
-- T006 — Atomic rate limit check via advisory lock
--
-- The previous TypeScript implementation had a TOCTOU race:
--   SELECT COUNT → check under limit → INSERT (two separate statements)
-- Two concurrent requests could both see count < limit and both insert,
-- allowing N+1 requests through when only N should be permitted.
--
-- Fix: PostgreSQL advisory lock serializes concurrent checks for the same key.
-- pg_advisory_xact_lock(bigint) holds until the current transaction ends,
-- ensuring the COUNT → INSERT pair is atomic per rate-limit key.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(
  p_key        TEXT,
  p_limit      INT,
  p_window_sec INT,
  p_now        BIGINT   -- unix epoch seconds (passed in to avoid clock skew between app and DB)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start BIGINT;
  v_count        BIGINT;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 THEN
    RAISE EXCEPTION 'p_key must be non-empty';
  END IF;
  IF p_limit < 1 THEN
    RAISE EXCEPTION 'p_limit must be >= 1';
  END IF;
  IF p_window_sec < 1 THEN
    RAISE EXCEPTION 'p_window_sec must be >= 1';
  END IF;

  v_window_start := p_now - p_window_sec;

  -- Advisory lock serializes concurrent checks for the same rate-limit key.
  -- hashtext returns INT4; cast to BIGINT to avoid overflow in pg_advisory_xact_lock.
  PERFORM pg_advisory_xact_lock(hashtext('rl:' || p_key)::bigint);

  -- Best-effort cleanup of expired entries (within the lock to avoid concurrent deletes).
  DELETE FROM public.rate_limits
  WHERE key = p_key AND timestamp < v_window_start;

  -- Count entries in current window.
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE key = p_key AND timestamp >= v_window_start;

  -- Insert and allow only if under limit.
  IF v_count < p_limit THEN
    INSERT INTO public.rate_limits (key, timestamp) VALUES (p_key, p_now);
    RETURN jsonb_build_object(
      'allowed',    true,
      'current',    v_count + 1,
      'limit',      p_limit,
      'remaining',  p_limit - v_count - 1,
      'reset',      v_window_start + p_window_sec
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed',    false,
    'current',    v_count,
    'limit',      p_limit,
    'remaining',  0,
    'reset',      v_window_start + p_window_sec
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edge_rate_limit_check(TEXT, INT, INT, BIGINT) FROM PUBLIC;
-- Edge functions run with service role — grant to service_role only.
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_check(TEXT, INT, INT, BIGINT) TO service_role;

COMMENT ON FUNCTION public.edge_rate_limit_check IS
  'Atomic sliding-window rate limit check. Uses pg_advisory_xact_lock to serialize '
  'concurrent requests for the same key, eliminating the SELECT+INSERT TOCTOU race.';
