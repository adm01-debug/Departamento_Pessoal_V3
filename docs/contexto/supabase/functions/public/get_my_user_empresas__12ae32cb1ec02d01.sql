CREATE OR REPLACE FUNCTION public.get_my_user_empresas()
 RETURNS TABLE(id uuid, user_id uuid, empresa_id uuid, is_default boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT ue.id, ue.user_id, ue.empresa_id, COALESCE(ue.is_default, false), ue.created_at
  FROM public.user_empresas ue
  WHERE ue.user_id = auth.uid()
  ORDER BY ue.created_at ASC, ue.id ASC
$function$
