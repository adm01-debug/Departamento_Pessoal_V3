
DROP MATERIALIZED VIEW IF EXISTS public.mv_status_change_daily CASCADE;

CREATE MATERIALIZED VIEW public.mv_status_change_daily AS
SELECT
  date_trunc('day', created_at)::date AS dia,
  tabela,
  acao,
  count(*)::bigint                    AS total,
  count(DISTINCT user_id)::bigint     AS usuarios_distintos,
  count(DISTINCT registro_id)::bigint AS registros_distintos,
  min(created_at)                     AS primeiro_evento,
  max(created_at)                     AS ultimo_evento
FROM public.audit_log
WHERE acao = 'STATUS_CHANGE'
  AND created_at >= now() - interval '90 days'
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX ux_mv_status_change_daily
  ON public.mv_status_change_daily (dia, tabela, acao);
CREATE INDEX IF NOT EXISTS ix_mv_status_change_daily_tabela
  ON public.mv_status_change_daily (tabela, dia DESC);

DROP MATERIALIZED VIEW IF EXISTS public.mv_anomalies_hourly CASCADE;

CREATE MATERIALIZED VIEW public.mv_anomalies_hourly AS
SELECT
  date_trunc('hour', created_at)      AS hora,
  type                                AS tipo,
  severity                            AS severidade,
  count(*)::bigint                    AS total,
  count(*) FILTER (WHERE resolved = false)::bigint AS abertos,
  count(*) FILTER (WHERE resolved = true )::bigint AS resolvidos
FROM public.security_alerts
WHERE created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX ux_mv_anomalies_hourly
  ON public.mv_anomalies_hourly (hora, tipo, severidade);
CREATE INDEX IF NOT EXISTS ix_mv_anomalies_hourly_tipo
  ON public.mv_anomalies_hourly (tipo, hora DESC);

CREATE OR REPLACE FUNCTION public.refresh_dashboard_mvs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.refresh_dashboard_mvs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_mvs() TO service_role;

REVOKE ALL ON public.mv_status_change_daily FROM PUBLIC, anon;
REVOKE ALL ON public.mv_anomalies_hourly    FROM PUBLIC, anon;
GRANT SELECT ON public.mv_status_change_daily TO authenticated, service_role;
GRANT SELECT ON public.mv_anomalies_hourly    TO authenticated, service_role;
