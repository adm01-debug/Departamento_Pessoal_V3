CREATE OR REPLACE FUNCTION public.fn_atualizar_status_ferias_diario()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_total integer := 0; v_n integer;
BEGIN
  UPDATE public.ferias SET status = 'em_gozo'
   WHERE status IN ('aprovada','agendada')
     AND pagamento_confirmado_em IS NOT NULL
     AND CURRENT_DATE >= data_inicio;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  UPDATE public.ferias SET status = 'concluida'
   WHERE status = 'em_gozo' AND CURRENT_DATE > data_fim;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  RETURN v_total;
END;
$function$
