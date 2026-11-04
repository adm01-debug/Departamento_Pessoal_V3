CREATE OR REPLACE FUNCTION public.dp_soft_delete_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  NEW.deleted_at = NOW();
  NEW.deleted_by = auth.uid();
  RETURN NEW;
END;
$function$
