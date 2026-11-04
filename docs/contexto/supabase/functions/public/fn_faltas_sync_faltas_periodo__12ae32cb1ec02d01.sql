CREATE OR REPLACE FUNCTION public.fn_faltas_sync_faltas_periodo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_colab uuid;
BEGIN
  FOREACH v_colab IN ARRAY ARRAY[NEW.colaborador_id, OLD.colaborador_id] LOOP
    IF v_colab IS NULL THEN CONTINUE; END IF;
    UPDATE public.periodos_aquisitivos pa
    SET faltas_periodo = (
      SELECT COALESCE(SUM(COALESCE(f.dias_total, 1)), 0)::int
      FROM public.faltas f
      WHERE f.colaborador_id = v_colab
        AND f.justificada IS NOT TRUE
        AND COALESCE(f.status, '') NOT IN ('rejeitada')
        AND f.data >= pa.data_inicio AND f.data <= pa.data_fim
    )
    WHERE pa.colaborador_id = v_colab;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$function$
