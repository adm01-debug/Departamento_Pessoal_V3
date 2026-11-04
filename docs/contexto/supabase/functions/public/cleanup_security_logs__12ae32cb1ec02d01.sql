CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.login_rate_limits WHERE created_at < now() - interval '24 hours';
END;
$function$
