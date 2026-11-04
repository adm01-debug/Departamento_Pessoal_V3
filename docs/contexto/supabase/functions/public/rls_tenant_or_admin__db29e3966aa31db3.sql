CREATE OR REPLACE FUNCTION public.rls_tenant_or_admin(row_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.user_belongs_to_empresa(auth.uid(), row_empresa_id)
      OR public.is_admin(auth.uid());
$function$
