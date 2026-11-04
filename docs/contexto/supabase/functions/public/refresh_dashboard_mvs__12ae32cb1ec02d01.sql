CREATE OR REPLACE FUNCTION public.refresh_dashboard_mvs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t_start timestamptz := clock_timestamp();
  ok_count int := 0;
  errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT pg_try_advisory_lock(hashtext('refresh_dashboard_mvs')) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_running');
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_status_change_daily;
    ok_count := ok_count + 1;
  EXCEPTION WHEN OTHERS THEN
    errors := errors || jsonb_build_object('mv','mv_status_change_daily','error',SQLERRM);
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_anomalies_hourly;
    ok_count := ok_count + 1;
  EXCEPTION WHEN OTHERS THEN
    errors := errors || jsonb_build_object('mv','mv_anomalies_hourly','error',SQLERRM);
  END;

  PERFORM pg_advisory_unlock(hashtext('refresh_dashboard_mvs'));

  RETURN jsonb_build_object(
    'refreshed', ok_count,
    'errors', errors,
    'elapsed_ms', extract(millisecond FROM clock_timestamp() - t_start)
  );
END;
$function$
