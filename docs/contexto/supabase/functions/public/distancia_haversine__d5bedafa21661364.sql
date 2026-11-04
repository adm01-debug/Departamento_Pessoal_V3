CREATE OR REPLACE FUNCTION public.distancia_haversine(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  r CONSTANT NUMERIC := 6371;
  dlat NUMERIC; dlng NUMERIC; a NUMERIC; c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN round((r * c)::numeric, 2);
END;
$function$
