CREATE OR REPLACE FUNCTION public.get_query_telemetry(_limit integer DEFAULT 20)
 RETURNS TABLE(query_sample text, calls bigint, mean_ms numeric, max_ms numeric, total_ms numeric, cache_hit_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.query_sample, v.calls, v.mean_ms, v.max_ms, v.total_ms, v.cache_hit_pct
  FROM public.v_slow_queries_top50 v
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  LIMIT _limit;
$function$
