CREATE OR REPLACE FUNCTION public.calcular_dias_direito_ferias(p_faltas integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_faltas IS NULL OR p_faltas < 0 THEN
    RETURN 30;
  ELSIF p_faltas <= 5 THEN
    RETURN 30;
  ELSIF p_faltas <= 14 THEN
    RETURN 24;
  ELSIF p_faltas <= 23 THEN
    RETURN 18;
  ELSIF p_faltas <= 32 THEN
    RETURN 12;
  ELSE
    RETURN 0;
  END IF;
END;
$function$
