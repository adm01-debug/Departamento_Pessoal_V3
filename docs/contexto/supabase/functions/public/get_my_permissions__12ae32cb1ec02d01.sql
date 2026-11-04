CREATE OR REPLACE FUNCTION public.get_my_permissions()
 RETURNS TABLE(permissao text, papel text, empresa_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT ur.role::text, ur.role::text, ue.empresa_id
  FROM public.user_empresas ue
  JOIN public.user_roles ur ON ur.user_id = ue.user_id
  WHERE ue.user_id = auth.uid()
  ORDER BY ue.empresa_id, ur.role::text;
$function$
