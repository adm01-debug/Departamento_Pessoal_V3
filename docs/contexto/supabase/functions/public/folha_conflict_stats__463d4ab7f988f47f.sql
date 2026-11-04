CREATE OR REPLACE FUNCTION public.folha_conflict_stats(_days integer DEFAULT 7)
 RETURNS TABLE(competencia text, conflitos bigint, ultimo_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.competencia, count(*)::bigint AS conflitos, max(c.created_at) AS ultimo_em
  FROM public.folha_lock_conflicts c
  WHERE c.created_at > now() - make_interval(days => _days)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY c.competencia
  ORDER BY conflitos DESC;
$function$
