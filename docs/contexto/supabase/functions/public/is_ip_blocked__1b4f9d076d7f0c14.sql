CREATE OR REPLACE FUNCTION public.is_ip_blocked(check_ip text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = check_ip
    AND (permanent = true OR expires_at > now())
  )
$function$
