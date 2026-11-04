CREATE OR REPLACE FUNCTION public.pode_gerir_rh_para(_user_id uuid, _empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT _user_id IS NOT NULL
     AND _empresa_id IS NOT NULL
     AND (
       public.is_admin(_user_id)
       OR (
         EXISTS (
           SELECT 1 FROM public.user_empresas AS ue
           WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id
         )
         AND public.has_role(_user_id, 'rh'::public.app_role)
       )
     )
$function$
