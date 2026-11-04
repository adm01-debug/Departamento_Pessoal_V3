CREATE OR REPLACE FUNCTION public.get_user_tenants()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT ue.empresa_id
  FROM public.user_empresas ue
  WHERE ue.user_id = auth.uid();
$function$
