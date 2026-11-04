CREATE OR REPLACE FUNCTION public.is_country_allowed(check_country_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN NOT EXISTS (SELECT 1 FROM geo_blocking_config WHERE enabled = true) THEN true
    WHEN check_country_code IS NULL THEN NOT EXISTS (SELECT 1 FROM geo_blocking_config WHERE block_unknown_countries = true AND enabled = true)
    ELSE EXISTS (SELECT 1 FROM geo_allowed_countries WHERE country_code = check_country_code)
  END
$function$
