CREATE OR REPLACE FUNCTION public.check_brute_force(check_email text, check_ip text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  failed_count INTEGER;
  policy_record RECORD;
BEGIN
  SELECT * INTO policy_record FROM public.password_policies LIMIT 1;
  IF NOT FOUND THEN
    policy_record.lockout_attempts := 5;
    policy_record.lockout_duration_minutes := 30;
  END IF;
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE (email = check_email OR ip_address = check_ip)
  AND success = false
  AND created_at > now() - (policy_record.lockout_duration_minutes || ' minutes')::INTERVAL;
  IF failed_count >= policy_record.lockout_attempts THEN
    INSERT INTO public.security_alerts (type, severity, ip_address, details)
    VALUES ('brute_force', 'critical', check_ip, jsonb_build_object('email', check_email, 'attempts', failed_count));
    RETURN jsonb_build_object('locked', true, 'attempts', failed_count, 'lockout_minutes', policy_record.lockout_duration_minutes);
  END IF;
  RETURN jsonb_build_object('locked', false, 'attempts', failed_count, 'remaining', policy_record.lockout_attempts - failed_count);
END;
$function$
