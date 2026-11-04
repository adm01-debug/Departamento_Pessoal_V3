CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
 RETURNS app_role[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select array_agg(role)
  from public.user_roles
  where user_id = _user_id
    and (_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
$function$
