CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
 RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.login_lockouts%ROWTYPE;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;
  SELECT * INTO v_row FROM public.login_lockouts
  WHERE identifier = v_email AND identifier_type = 'email';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;
  IF v_row.is_locked AND v_row.lockout_until IS NOT NULL AND v_row.lockout_until > now() THEN
    RETURN QUERY SELECT true, v_row.lockout_until;
    RETURN;
  END IF;
  IF v_row.is_locked THEN
    UPDATE public.login_lockouts
    SET is_locked = false, lockout_until = NULL, attempts = 0, updated_at = now()
    WHERE id = v_row.id;
  END IF;
  RETURN QUERY SELECT false, NULL::timestamptz;
END;
$function$
