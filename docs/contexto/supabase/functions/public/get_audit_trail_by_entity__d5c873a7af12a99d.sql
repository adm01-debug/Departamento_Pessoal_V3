CREATE OR REPLACE FUNCTION public.get_audit_trail_by_entity(_entidade text, _entidade_id uuid, _limit integer DEFAULT 200)
 RETURNS TABLE(source_table text, acao text, user_id uuid, dados_anteriores jsonb, dados_novos jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.source_table, v.acao, v.user_id, v.dados_anteriores, v.dados_novos, v.created_at
  FROM public.v_audit_events_unified v
  WHERE v.entidade = _entidade
    AND v.entidade_id = _entidade_id::text
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY v.created_at DESC LIMIT _limit;
$function$
