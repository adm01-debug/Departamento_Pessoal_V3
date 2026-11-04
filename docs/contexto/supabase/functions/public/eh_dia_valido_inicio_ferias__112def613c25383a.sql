CREATE OR REPLACE FUNCTION public.eh_dia_valido_inicio_ferias(p_empresa_id uuid, p_data date)
 RETURNS TABLE(ok boolean, motivo text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset integer;
  v_dia date;
  v_dow integer;
  v_feriado record;
BEGIN
  IF p_data IS NULL THEN
    RETURN QUERY SELECT false, 'FERIAS_INICIO_INVALIDO: data de início não informada.'; RETURN;
  END IF;

  -- Regra: o próprio dia + 2 dias seguintes não podem ser feriado nem DSR (domingo)
  FOR v_offset IN 0..2 LOOP
    v_dia := p_data + v_offset;
    v_dow := EXTRACT(DOW FROM v_dia); -- 0 = domingo

    IF v_dow = 0 THEN
      IF v_offset = 0 THEN
        RETURN QUERY SELECT false, 'FERIAS_INICIO_INVALIDO: férias não podem iniciar em domingo (DSR).'; RETURN;
      ELSE
        RETURN QUERY SELECT false, format('FERIAS_INICIO_INVALIDO: início a %s dia(s) do DSR (domingo em %s). Art. 134 §3º CLT.', v_offset, to_char(v_dia,'DD/MM/YYYY')); RETURN;
      END IF;
    END IF;

    SELECT id, descricao INTO v_feriado
    FROM public.feriados
    WHERE data = v_dia
      AND (empresa_id IS NULL OR empresa_id = p_empresa_id)
    LIMIT 1;

    IF FOUND THEN
      IF v_offset = 0 THEN
        RETURN QUERY SELECT false, format('FERIAS_INICIO_INVALIDO: %s é feriado (%s).', to_char(v_dia,'DD/MM/YYYY'), v_feriado.descricao); RETURN;
      ELSE
        RETURN QUERY SELECT false, format('FERIAS_INICIO_INVALIDO: início a %s dia(s) do feriado %s (%s). Art. 134 §3º CLT.', v_offset, v_feriado.descricao, to_char(v_dia,'DD/MM/YYYY')); RETURN;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT true, NULL::text;
END;
$function$
