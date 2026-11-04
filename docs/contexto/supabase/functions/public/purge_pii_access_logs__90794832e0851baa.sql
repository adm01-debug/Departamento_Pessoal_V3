CREATE OR REPLACE FUNCTION public.purge_pii_access_logs(p_dias integer DEFAULT 180)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_removed integer;
BEGIN
  DELETE FROM public.pii_access_alerts
  WHERE janela < now() - make_interval(days => GREATEST(p_dias, 30));
  DELETE FROM public.pii_access_logs
  WHERE created_at < now() - make_interval(days => GREATEST(p_dias, 30));
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$function$
