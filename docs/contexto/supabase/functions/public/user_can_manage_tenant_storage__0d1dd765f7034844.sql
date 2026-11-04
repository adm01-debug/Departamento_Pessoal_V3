CREATE OR REPLACE FUNCTION public.user_can_manage_tenant_storage(p_user_id uuid, p_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT public.user_belongs_to_empresa(p_user_id, p_empresa_id)
    AND (
      public.has_role(p_user_id, 'admin'::public.app_role)
      OR public.has_role(p_user_id, 'gestor'::public.app_role)
      OR public.has_role(p_user_id, 'rh'::public.app_role)
    );
$function$
