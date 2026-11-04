CREATE OR REPLACE FUNCTION public.calcular_dias_ferias(faltas integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF faltas <= 5 THEN
    RETURN 30;
  ELSIF faltas <= 14 THEN
    RETURN 24;
  ELSIF faltas <= 23 THEN
    RETURN 18;
  ELSIF faltas <= 32 THEN
    RETURN 12;
  ELSE
    RETURN 0; -- Perde direito a férias
  END IF;
END;
$function$
