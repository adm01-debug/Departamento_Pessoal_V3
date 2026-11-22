CREATE OR REPLACE FUNCTION public.ponto_rep_processar_dias(_limite integer DEFAULT 200)
 RETURNS TABLE(processados integer, batidas integer, com_erro integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id        uuid;
  v_batidas   integer;
  v_processados integer := 0;
  v_total     integer := 0;
  v_erros     integer := 0;
BEGIN
  FOR v_id IN
    SELECT d.id FROM public.ponto_rep_dias d
    WHERE d.processado_em IS NULL
    ORDER BY d.data, d.id
    LIMIT GREATEST(COALESCE(_limite, 200), 1)
  LOOP
    v_batidas := public.ponto_rep_converter_dia(v_id);
    v_processados := v_processados + 1;
    v_total := v_total + COALESCE(v_batidas, 0);
    IF v_batidas = 0 AND EXISTS (
      SELECT 1 FROM public.ponto_rep_dias d WHERE d.id = v_id AND d.processado_em IS NULL
    ) THEN
      v_erros := v_erros + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_processados, v_total, v_erros;
END;
$function$
