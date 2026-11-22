CREATE OR REPLACE FUNCTION public.ponto_rep_reprocessar_periodo(_inicio date, _fim date)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_total integer;
BEGIN
  IF _inicio IS NULL OR _fim IS NULL OR _inicio > _fim THEN
    RAISE EXCEPTION 'periodo invalido: % a %', _inicio, _fim USING ERRCODE = '22023';
  END IF;

  WITH alvo AS (
    UPDATE public.ponto_rep_dias
       SET processado_em = NULL, erro_processamento = NULL, updated_at = now()
     WHERE data BETWEEN _inicio AND _fim
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM alvo;

  RETURN v_total;
END;
$function$
