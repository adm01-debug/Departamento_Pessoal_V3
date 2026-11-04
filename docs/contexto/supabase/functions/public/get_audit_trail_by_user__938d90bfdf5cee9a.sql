CREATE OR REPLACE FUNCTION public.get_audit_trail_by_user(_user_id uuid, _limit integer DEFAULT 500)
 RETURNS TABLE(source_table text, entidade text, entidade_id text, acao text, dados_anteriores jsonb, dados_novos jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.source_table, v.entidade, v.entidade_id, v.acao, v.dados_anteriores, v.dados_novos, v.created_at
  FROM public.v_audit_events_unified v
  WHERE v.user_id = _user_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = _user_id)
  ORDER BY v.created_at DESC LIMIT _limit;
$function$
