CREATE OR REPLACE FUNCTION public.cleanup_ciencia_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.ciencia_rate_limits
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$function$
