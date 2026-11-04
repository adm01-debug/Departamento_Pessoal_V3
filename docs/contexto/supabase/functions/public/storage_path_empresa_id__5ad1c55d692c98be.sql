CREATE OR REPLACE FUNCTION public.storage_path_empresa_id(p_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT CASE
    WHEN (storage.foldername(p_name))[1] ~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN ((storage.foldername(p_name))[1])::uuid
    ELSE NULL
  END;
$function$
