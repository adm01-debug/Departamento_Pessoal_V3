CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas(_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT public.pode_gerir_pessoas_para(auth.uid(), _empresa_id)
$function$
