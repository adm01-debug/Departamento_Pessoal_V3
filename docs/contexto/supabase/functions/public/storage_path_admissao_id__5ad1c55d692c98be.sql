CREATE OR REPLACE FUNCTION public.storage_path_admissao_id(p_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT CASE
           WHEN p_name ~ '^admissao_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
             THEN replace(split_part(p_name, '/', 1), 'admissao_', '')::uuid
           ELSE NULL
         END;
$function$
