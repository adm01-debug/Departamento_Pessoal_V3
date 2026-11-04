CREATE OR REPLACE FUNCTION public.admin_list_user_roles()
 RETURNS TABLE(id uuid, user_id uuid, role app_role, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem listar papéis de usuário' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT ur.id, ur.user_id, ur.role, ur.created_at
    FROM public.user_roles ur
    ORDER BY ur.created_at DESC;
END;
$function$
