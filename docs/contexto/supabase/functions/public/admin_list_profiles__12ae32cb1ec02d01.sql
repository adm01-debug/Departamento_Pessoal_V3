CREATE OR REPLACE FUNCTION public.admin_list_profiles()
 RETURNS TABLE(id uuid, user_id uuid, nome text, telefone text, cargo text, departamento text, role_display text, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem listar usuários' USING ERRCODE = '42501';
  END IF;

  -- Papel efetivo vem de user_roles (fonte de verdade de admin_set_user_role/
  -- get_user_roles); profiles.role_display fica stale após promoção e serve
  -- só de fallback. Enum app_role é ordenado por privilégio, então o menor
  -- valor é o papel mais alto.
  RETURN QUERY
    SELECT p.id, p.user_id, p.nome, p.telefone, p.cargo, p.departamento,
           COALESCE(
             (SELECT ur.role::text
              FROM public.user_roles ur
              WHERE ur.user_id = p.user_id
              ORDER BY ur.role
              LIMIT 1),
             p.role_display
           ),
           p.avatar_url, p.created_at, p.updated_at
    FROM public.profiles p
    ORDER BY p.nome;
END;
$function$
