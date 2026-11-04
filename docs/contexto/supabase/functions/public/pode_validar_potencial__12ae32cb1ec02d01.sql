CREATE OR REPLACE FUNCTION public.pode_validar_potencial()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid()
       and ur.role::text = 'rh'
  );
$function$
