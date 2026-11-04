CREATE OR REPLACE FUNCTION public.refresh_telemetry_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_telemetry_dashboard;
EXCEPTION WHEN feature_not_supported OR object_not_in_prerequisite_state THEN
  REFRESH MATERIALIZED VIEW public.mv_telemetry_dashboard;
END
$function$
