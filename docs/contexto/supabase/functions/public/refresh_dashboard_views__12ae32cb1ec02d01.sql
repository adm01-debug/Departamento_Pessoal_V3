CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE NOTICE 'Refresh dashboards: starting at %', NOW();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_headcount_daily;
  RAISE NOTICE '  mv_headcount_daily OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_summary;
  RAISE NOTICE '  mv_folha_summary OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_turnover_rate;
  RAISE NOTICE '  mv_turnover_rate OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ferias_balance;
  RAISE NOTICE '  mv_ferias_balance OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_afastamento_summary;
  RAISE NOTICE '  mv_afastamento_summary OK — done at %', NOW();
END;
$function$
