CREATE OR REPLACE FUNCTION public.record_failed_login()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.login_rate_limits (ip_address, created_at)
    VALUES (NEW.ip_address, now());
    RETURN NEW;
END;
$function$
