CREATE OR REPLACE FUNCTION public.fn_calculate_periodo_aquisitivo(_colaborador_id uuid)
 RETURNS TABLE(inicio date, fim date)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    data_adm DATE;
    anos_completos INTEGER;
BEGIN
    SELECT data_admissao INTO data_adm FROM public.colaboradores WHERE id = _colaborador_id;
    anos_completos := floor(EXTRACT(DAY FROM (CURRENT_DATE - data_adm)) / 365.25);
    
    RETURN QUERY SELECT 
        (data_adm + (anos_completos * interval '1 year'))::DATE,
        (data_adm + ((anos_completos + 1) * interval '1 year') - interval '1 day')::DATE;
END;
$function$
