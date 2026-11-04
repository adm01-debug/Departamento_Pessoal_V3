CREATE OR REPLACE FUNCTION public.validar_split_ferias(p_colaborador_id uuid, p_periodo_aquisitivo_id uuid, p_dias_novo integer, p_ferias_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(ok boolean, motivo text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_periodos integer;
  v_total_dias integer;
  v_maior integer;
  v_min_periodo integer;
BEGIN
  IF p_periodo_aquisitivo_id IS NULL THEN
    RETURN QUERY SELECT true, NULL::text; RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(dias_gozo),0), COALESCE(MAX(dias_gozo),0), COALESCE(MIN(dias_gozo),9999)
    INTO v_periodos, v_total_dias, v_maior, v_min_periodo
  FROM public.ferias
  WHERE colaborador_id = p_colaborador_id
    AND periodo_aquisitivo_id = p_periodo_aquisitivo_id
    AND COALESCE(cancelado, false) = false
    AND (p_ferias_id IS NULL OR id <> p_ferias_id);

  -- Simular inclusão/alteração do registro atual
  v_periodos := v_periodos + 1;
  v_total_dias := v_total_dias + p_dias_novo;
  v_maior := GREATEST(v_maior, p_dias_novo);
  v_min_periodo := LEAST(v_min_periodo, p_dias_novo);

  IF v_periodos > 3 THEN
    RETURN QUERY SELECT false, 'FERIAS_SPLIT_INVALIDO: máximo de 3 períodos por aquisitivo (Art. 134 §1º CLT).'; RETURN;
  END IF;

  IF v_periodos >= 2 AND v_maior < 14 THEN
    RETURN QUERY SELECT false, 'FERIAS_SPLIT_INVALIDO: ao fracionar, um dos períodos deve ter no mínimo 14 dias corridos (Art. 134 §1º CLT).'; RETURN;
  END IF;

  IF v_periodos >= 2 AND v_min_periodo < 5 THEN
    RETURN QUERY SELECT false, 'FERIAS_SPLIT_INVALIDO: nenhum período fracionado pode ter menos de 5 dias corridos (Art. 134 §1º CLT).'; RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$function$
