CREATE OR REPLACE FUNCTION public.dp_hash_pii(p_value text, p_context text DEFAULT 'generic'::text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT encode(
    digest(
      'DEPTOPESSOAL:' || p_context || ':' || 
      regexp_replace(upper(p_value), '[^A-Z0-9]', '', 'g'),
      'sha256'
    ), 'hex'
  )
$function$
