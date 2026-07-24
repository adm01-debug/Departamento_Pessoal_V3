-- Account lockout policy: lock account after 5 failed attempts within 15 minutes.
-- Unlock after 30-minute cooldown or manual admin intervention.

CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email TEXT)
RETURNS TABLE(is_locked BOOLEAN, attempts_remaining INT, locked_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempts INT := 5;
  v_window_minutes INT := 15;
  v_lockout_minutes INT := 30;
  v_recent_failures INT;
  v_last_failure TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MAX(created_at)
  INTO v_recent_failures, v_last_failure
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND created_at > NOW() - (v_window_minutes || ' minutes')::INTERVAL;

  IF v_recent_failures >= v_max_attempts THEN
    is_locked := true;
    attempts_remaining := 0;
    locked_until := v_last_failure + (v_lockout_minutes || ' minutes')::INTERVAL;

    -- If lockout period has passed, unlock
    IF locked_until < NOW() THEN
      is_locked := false;
      attempts_remaining := v_max_attempts;
      locked_until := NULL;
    END IF;
  ELSE
    is_locked := false;
    attempts_remaining := v_max_attempts - v_recent_failures;
    locked_until := NULL;
  END IF;

  RETURN NEXT;
END;
$$;

-- Function to record a login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_ip TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address, created_at)
  VALUES (p_email, p_success, p_ip, NOW());
END;
$$;

-- Reset lockout for a specific email (admin use)
CREATE OR REPLACE FUNCTION public.reset_account_lockout(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND created_at > NOW() - INTERVAL '30 minutes';
END;
$$;

COMMENT ON FUNCTION public.check_account_lockout(TEXT) IS
  'Returns lockout status for an email: locked after 5 failures in 15min, unlocks after 30min cooldown.';

COMMENT ON FUNCTION public.record_login_attempt(TEXT, BOOLEAN, TEXT) IS
  'Records a login attempt (success or failure) for lockout tracking.';

COMMENT ON FUNCTION public.reset_account_lockout(TEXT) IS
  'Admin function to manually reset account lockout by clearing recent failures.';
