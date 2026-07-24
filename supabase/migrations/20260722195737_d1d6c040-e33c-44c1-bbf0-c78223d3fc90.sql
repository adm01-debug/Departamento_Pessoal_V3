
-- Art. 130 CLT: proporcionalidade dos dias de férias por faltas no aquisitivo
CREATE OR REPLACE FUNCTION public.calcular_dias_direito_ferias(p_faltas integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_faltas IS NULL OR p_faltas < 0 THEN
    RETURN 30;
  ELSIF p_faltas <= 5 THEN
    RETURN 30;
  ELSIF p_faltas <= 14 THEN
    RETURN 24;
  ELSIF p_faltas <= 23 THEN
    RETURN 18;
  ELSIF p_faltas <= 32 THEN
    RETURN 12;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.calcular_dias_direito_ferias(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_dias_direito_ferias(integer) TO authenticated, service_role;

-- Trigger de recálculo automático
CREATE OR REPLACE FUNCTION public.trg_periodos_aquisitivos_recalc_dias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.faltas_periodo IS DISTINCT FROM OLD.faltas_periodo THEN
    NEW.dias_direito := public.calcular_dias_direito_ferias(COALESCE(NEW.faltas_periodo, 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_periodos_aquisitivos_recalc_dias ON public.periodos_aquisitivos;
CREATE TRIGGER trg_periodos_aquisitivos_recalc_dias
BEFORE INSERT OR UPDATE OF faltas_periodo
ON public.periodos_aquisitivos
FOR EACH ROW
EXECUTE FUNCTION public.trg_periodos_aquisitivos_recalc_dias();

-- Retroativo: normalizar registros existentes
UPDATE public.periodos_aquisitivos
SET dias_direito = public.calcular_dias_direito_ferias(COALESCE(faltas_periodo, 0))
WHERE dias_direito IS DISTINCT FROM public.calcular_dias_direito_ferias(COALESCE(faltas_periodo, 0));

COMMENT ON FUNCTION public.calcular_dias_direito_ferias(integer) IS
'CLT Art. 130 — retorna 30/24/18/12/0 dias de férias conforme faltas injustificadas no período aquisitivo.';
