CREATE OR REPLACE FUNCTION public.get_user_empresas(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT ue.empresa_id
  FROM public.user_empresas AS ue
  WHERE ue.user_id = _user_id
    AND (_user_id = auth.uid() OR public.is_admin(auth.uid()));
$function$
