CREATE OR REPLACE FUNCTION public.listar_auditoria(p_empresa_id uuid, p_tabela text DEFAULT NULL::text, p_acao text DEFAULT NULL::text, p_registro_id text DEFAULT NULL::text, p_data_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone, p_data_fim timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limite integer DEFAULT 200)
 RETURNS TABLE(id uuid, tabela text, registro_id text, acao text, user_id uuid, payload jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.pertence_a_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'empresa fora do escopo do usuario';
  END IF;

  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'::app_role)) THEN
    RAISE EXCEPTION 'permissao insuficiente para consultar auditoria';
  END IF;

  RETURN QUERY
  SELECT a.id, a.entity, a.entity_id, a.action, a.user_id, a.payload, a.occurred_at
  FROM public.audit_log_unified a
  WHERE a.empresa_id = p_empresa_id
    AND (p_tabela IS NULL OR a.entity = p_tabela)
    AND (p_acao IS NULL OR a.action = p_acao)
    AND (p_registro_id IS NULL OR a.entity_id = p_registro_id)
    AND (p_data_inicio IS NULL OR a.occurred_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR a.occurred_at <= p_data_fim)
  ORDER BY a.occurred_at DESC
  LIMIT greatest(1, least(coalesce(p_limite, 200), 1000));
END;
$function$
