
-- Idempotent: ferias may have been created without periodo_aquisitivo_id by 003_folha_ferias_ponto.sql
-- when the CREATE TABLE IF NOT EXISTS in 20251216170845 was a no-op.
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS periodo_aquisitivo_id UUID REFERENCES public.periodos_aquisitivos(id);

CREATE OR REPLACE FUNCTION public.validar_split_ferias(
  p_colaborador_id uuid,
  p_periodo_aquisitivo_id uuid,
  p_dias_novo integer,
  p_ferias_id uuid DEFAULT NULL
)
RETURNS TABLE (ok boolean, motivo text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.validar_split_ferias(uuid, uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_split_ferias(uuid, uuid, integer, uuid) TO authenticated, service_role;

-- Trigger de bloqueio
CREATE OR REPLACE FUNCTION public.trg_ferias_validar_split()
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

  SELECT ok, motivo INTO v_ok, v_motivo
    FROM public.validar_split_ferias(
      NEW.colaborador_id,
      NEW.periodo_aquisitivo_id,
      NEW.dias_gozo,
      CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
    );

  IF NOT v_ok THEN
    RAISE EXCEPTION '%', v_motivo USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ferias_validar_split ON public.ferias;
CREATE TRIGGER trg_ferias_validar_split
BEFORE INSERT OR UPDATE OF dias_gozo, periodo_aquisitivo_id, cancelado
ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.trg_ferias_validar_split();
