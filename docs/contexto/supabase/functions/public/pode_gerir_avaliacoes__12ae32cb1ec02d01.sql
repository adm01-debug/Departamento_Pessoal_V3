CREATE OR REPLACE FUNCTION public.pode_gerir_avaliacoes()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid()
       and ur.role::text in ('admin','rh')
  );
$function$
