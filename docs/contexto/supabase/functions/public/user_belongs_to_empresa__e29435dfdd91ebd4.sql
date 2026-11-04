CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_user_id uuid, _empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empresas ue
    WHERE ue.user_id = _user_id
      AND ue.empresa_id = _empresa_id
  );
$function$
