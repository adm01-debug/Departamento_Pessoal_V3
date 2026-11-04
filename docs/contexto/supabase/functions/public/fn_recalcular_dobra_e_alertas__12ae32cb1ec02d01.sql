CREATE OR REPLACE FUNCTION public.fn_recalcular_dobra_e_alertas()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.periodos_aquisitivos
  SET data_limite_concessao = data_fim + INTERVAL '12 months',
      em_dobra = (CURRENT_DATE > (data_fim + INTERVAL '12 months') AND COALESCE(perdeu_direito,false) = false)
  WHERE (data_limite_concessao IS DISTINCT FROM (data_fim + INTERVAL '12 months')::date)
     OR (em_dobra IS DISTINCT FROM (CURRENT_DATE > (data_fim + INTERVAL '12 months') AND COALESCE(perdeu_direito,false) = false));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$
