CREATE OR REPLACE FUNCTION public.get_user_empresas(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT empresa_id
  FROM public.user_empresas
  WHERE user_id = _user_id
$function$
