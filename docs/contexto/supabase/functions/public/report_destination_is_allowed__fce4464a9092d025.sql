CREATE OR REPLACE FUNCTION public.report_destination_is_allowed(p_email text, p_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT p_email IS NOT NULL
     AND btrim(p_email) <> ''
     AND p_empresa_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM auth.users AS u
       WHERE lower(u.email) = lower(btrim(p_email))
         AND (
           EXISTS (
             SELECT 1 FROM public.user_empresas AS ue
             WHERE ue.user_id = u.id AND ue.empresa_id = p_empresa_id
           )
           OR public.is_admin(u.id)
         )
     )
$function$
