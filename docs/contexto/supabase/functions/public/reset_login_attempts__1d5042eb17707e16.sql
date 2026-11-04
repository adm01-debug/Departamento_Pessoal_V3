CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_identifier text, p_identifier_type text DEFAULT 'email'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.login_lockouts
     SET attempts = 0, is_locked = false, lockout_until = NULL, updated_at = now()
   WHERE identifier = lower(p_identifier)
     AND identifier_type = p_identifier_type;
END;
$function$
