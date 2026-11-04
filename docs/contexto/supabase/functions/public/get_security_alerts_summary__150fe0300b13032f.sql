CREATE OR REPLACE FUNCTION public.get_security_alerts_summary(_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, type text, severity text, ip_address text, user_id uuid, details jsonb, created_at timestamp with time zone, age_minutes numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sa.id, sa.type, sa.severity, sa.ip_address::text, sa.user_id,
         sa.details, sa.created_at,
         EXTRACT(EPOCH FROM (now() - sa.created_at))/60
  FROM public.security_alerts sa
  WHERE sa.resolved = false
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY
    CASE sa.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    sa.created_at DESC
  LIMIT _limit;
$function$
