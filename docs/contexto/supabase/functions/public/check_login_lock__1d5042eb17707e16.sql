CREATE OR REPLACE FUNCTION public.check_login_lock(p_identifier text, p_identifier_type text DEFAULT 'email'::text)
 RETURNS TABLE(is_locked boolean, remaining_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_locked boolean;
  v_until timestamptz;
BEGIN
  SELECT ll.is_locked, ll.lockout_until INTO v_locked, v_until
  FROM public.login_lockouts ll
  WHERE ll.identifier = lower(p_identifier)
    AND ll.identifier_type = p_identifier_type;

  IF v_locked AND v_until IS NOT NULL AND v_until > now() THEN
    RETURN QUERY SELECT true, EXTRACT(EPOCH FROM (v_until - now()))::integer;
  ELSE
    IF v_locked THEN
      UPDATE public.login_lockouts
         SET is_locked = false, lockout_until = NULL, attempts = 0, updated_at = now()
       WHERE identifier = lower(p_identifier)
         AND identifier_type = p_identifier_type;
    END IF;
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$function$
