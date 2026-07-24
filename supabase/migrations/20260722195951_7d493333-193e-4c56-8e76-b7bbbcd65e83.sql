
CREATE OR REPLACE FUNCTION public.eh_dia_valido_inicio_ferias(
  p_empresa_id uuid,
  p_data date
)
RETURNS TABLE (ok boolean, motivo text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.eh_dia_valido_inicio_ferias(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eh_dia_valido_inicio_ferias(uuid, date) TO authenticated, service_role;

-- Trigger
CREATE OR REPLACE FUNCTION public.trg_ferias_validar_inicio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_motivo text;
BEGIN
  IF COALESCE(NEW.cancelado, false) = true THEN
    RETURN NEW;
  END IF;
  -- Coletiva: pular a regra (definida pela empresa)
  IF NEW.ferias_coletiva_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT ok, motivo INTO v_ok, v_motivo
    FROM public.eh_dia_valido_inicio_ferias(NEW.empresa_id, NEW.data_inicio);

  IF NOT v_ok THEN
    RAISE EXCEPTION '%', v_motivo USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ferias_validar_inicio ON public.ferias;
CREATE TRIGGER trg_ferias_validar_inicio
BEFORE INSERT OR UPDATE OF data_inicio, ferias_coletiva_id, cancelado
ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.trg_ferias_validar_inicio();
