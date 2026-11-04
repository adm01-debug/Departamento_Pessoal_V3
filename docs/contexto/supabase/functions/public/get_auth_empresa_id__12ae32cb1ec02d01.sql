CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id', ''))::UUID;
$function$
