CREATE OR REPLACE FUNCTION public.record_failed_login(p_identifier text, p_identifier_type text DEFAULT 'email'::text)
 RETURNS TABLE(attempts integer, is_locked boolean, lockout_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempts integer;
  v_locked boolean := false;
  v_lock_min integer := 0;
BEGIN
  INSERT INTO public.login_lockouts (identifier, identifier_type, attempts, last_attempt)
  VALUES (lower(p_identifier), p_identifier_type, 1, now())
  ON CONFLICT (identifier, identifier_type) DO UPDATE
    SET attempts = public.login_lockouts.attempts + 1,
        last_attempt = now(),
        updated_at = now()
  RETURNING public.login_lockouts.attempts INTO v_attempts;

  IF v_attempts >= 5 THEN
    v_locked := true;
    v_lock_min := CASE
      WHEN v_attempts >= 10 THEN 60
      WHEN v_attempts >= 7 THEN 15
      ELSE 5
    END;
    UPDATE public.login_lockouts
       SET is_locked = true,
           lockout_until = now() + make_interval(mins => v_lock_min),
           updated_at = now()
     WHERE identifier = lower(p_identifier)
       AND identifier_type = p_identifier_type;
  END IF;

  RETURN QUERY SELECT v_attempts, v_locked, v_lock_min;
END;
$function$
