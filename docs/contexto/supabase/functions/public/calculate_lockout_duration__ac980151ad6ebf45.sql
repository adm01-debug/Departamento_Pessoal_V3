CREATE OR REPLACE FUNCTION public.calculate_lockout_duration(attempts integer)
 RETURNS interval
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LEAST(POWER(2, GREATEST(0, attempts - 5))::INTEGER * INTERVAL '1 minute', INTERVAL '60 minutes');
END;
$function$
