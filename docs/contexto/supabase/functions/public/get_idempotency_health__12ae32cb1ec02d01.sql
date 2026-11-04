CREATE OR REPLACE FUNCTION public.get_idempotency_health()
 RETURNS TABLE(endpoint text, total_24h bigint, completed_24h bigint, pending_24h bigint, failed_24h bigint, conflict_24h bigint, failure_rate_pct numeric, last_seen_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT endpoint, total_24h, completed_24h, pending_24h, failed_24h,
         conflict_24h, failure_rate_pct_24h, last_seen_at
  FROM public.v_idempotency_metrics
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY total_24h DESC NULLS LAST;
$function$
