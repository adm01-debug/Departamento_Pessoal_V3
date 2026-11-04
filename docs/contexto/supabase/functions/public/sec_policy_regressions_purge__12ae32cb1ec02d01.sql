CREATE OR REPLACE FUNCTION public.sec_policy_regressions_purge()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.sec_policy_regressions
  WHERE scan_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END
$function$
