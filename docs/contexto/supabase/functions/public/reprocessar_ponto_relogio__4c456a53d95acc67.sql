CREATE OR REPLACE FUNCTION public.reprocessar_ponto_relogio(_inicio date, _fim date, _empresa_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;
  IF _empresa_id IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.pode_gerir_rh(_empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissao para reprocessar o ponto desta empresa' USING ERRCODE = '42501';
  END IF;

  WITH alvo AS (
    UPDATE public.ponto_rep_dias
       SET processado_em = NULL, erro_processamento = NULL, updated_at = now()
     WHERE empresa_id = _empresa_id
       AND data BETWEEN _inicio AND _fim
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM alvo;

  RETURN v_total;
END;
$function$
