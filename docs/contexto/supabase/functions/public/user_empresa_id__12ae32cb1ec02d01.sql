CREATE OR REPLACE FUNCTION public.user_empresa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT ue.empresa_id
  FROM public.user_empresas AS ue
  WHERE ue.user_id = auth.uid()
  ORDER BY COALESCE(ue.is_default, false) DESC, ue.created_at ASC, ue.id ASC
  LIMIT 1
$function$
