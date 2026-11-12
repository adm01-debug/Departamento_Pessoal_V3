CREATE OR REPLACE FUNCTION public.eh_dia_util_br(p_data date)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT EXTRACT(ISODOW FROM p_data) BETWEEN 1 AND 5
     AND NOT public.eh_feriado_fixo_br(p_data);
$function$
