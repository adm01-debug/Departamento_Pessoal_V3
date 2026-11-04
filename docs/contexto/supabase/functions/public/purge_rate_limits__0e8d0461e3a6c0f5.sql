CREATE OR REPLACE FUNCTION public.purge_rate_limits(p_older_than_sec integer DEFAULT 86400)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_cutoff  bigint := EXTRACT(EPOCH FROM now())::bigint - GREATEST(p_older_than_sec, 3600);
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits WHERE "timestamp" < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$
