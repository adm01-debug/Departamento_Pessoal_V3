CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean, p_ip text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ip text := coalesce(nullif(trim(coalesce(p_ip, '')), ''), 'unknown');
  v_attempts integer;
  v_window interval := interval '15 minutes';
  v_max integer := 5;
BEGIN
  IF v_email = '' THEN RETURN; END IF;

  INSERT INTO public.login_attempts (email, ip_address, success, failure_reason)
  VALUES (
    v_email, v_ip, coalesce(p_success, false),
    CASE WHEN coalesce(p_success, false) THEN NULL ELSE 'invalid_credentials' END
  );

  IF coalesce(p_success, false) THEN
    UPDATE public.login_lockouts
    SET attempts = 0, is_locked = false, lockout_until = NULL,
        last_attempt = now(), updated_at = now()
    WHERE identifier = v_email AND identifier_type = 'email';
    RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('login_lockout:' || v_email)::bigint
  );

  INSERT INTO public.login_lockouts (identifier, identifier_type, attempts, last_attempt)
  VALUES (v_email, 'email', 1, now())
  ON CONFLICT (identifier, identifier_type) DO UPDATE
  SET attempts = CASE
                   WHEN public.login_lockouts.last_attempt < now() - v_window THEN 1
                   ELSE public.login_lockouts.attempts + 1
                 END,
      last_attempt = now(), updated_at = now()
  RETURNING attempts INTO v_attempts;

  IF v_attempts >= v_max THEN
    UPDATE public.login_lockouts
    SET is_locked = true,
        lockout_until = now() + public.calculate_lockout_duration(v_attempts),
        updated_at = now()
    WHERE identifier = v_email AND identifier_type = 'email';
  END IF;
END;
$function$
