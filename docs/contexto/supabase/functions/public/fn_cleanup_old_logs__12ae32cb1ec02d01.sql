CREATE OR REPLACE FUNCTION public.fn_cleanup_old_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF to_regclass('public.logs_sistema') IS NOT NULL THEN
    DELETE FROM public.logs_sistema WHERE created_at < now() - interval '30 days';
  END IF;
END;
$function$
