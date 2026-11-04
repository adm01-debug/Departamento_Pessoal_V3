CREATE OR REPLACE FUNCTION public.sou_o_colaborador(_colaborador_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
  SELECT _colaborador_id = auth.uid();
$function$
