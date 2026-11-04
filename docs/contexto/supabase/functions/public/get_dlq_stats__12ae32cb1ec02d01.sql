CREATE OR REPLACE FUNCTION public.get_dlq_stats()
 RETURNS TABLE(tipo_tarefa text, total_dlq bigint, mais_recente timestamp with time zone, ultimo_erro_sample text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT f.tipo_tarefa,
         count(*)::bigint,
         max(f.dlq_movido_em),
         substring(max(f.ultimo_erro), 1, 200)
  FROM public.fila_processamento f
  WHERE f.dlq = true
    AND public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY f.tipo_tarefa
  ORDER BY count(*) DESC;
$function$
