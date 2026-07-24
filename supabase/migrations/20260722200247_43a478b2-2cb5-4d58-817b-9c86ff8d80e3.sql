
-- 3.11: FK obrigatória + defesa
ALTER TABLE public.ferias
  ALTER COLUMN periodo_aquisitivo_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_ferias_validar_aquisitivo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_aq record;
BEGIN
  IF COALESCE(NEW.cancelado, false) = true THEN RETURN NEW; END IF;
  IF NEW.ferias_coletiva_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT perdeu_direito, dias_direito, colaborador_id
    INTO v_aq
    FROM public.periodos_aquisitivos
   WHERE id = NEW.periodo_aquisitivo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FERIAS_AQUISITIVO_INVALIDO: período aquisitivo não encontrado.' USING ERRCODE='P0001';
  END IF;

  IF v_aq.colaborador_id IS DISTINCT FROM NEW.colaborador_id THEN
    RAISE EXCEPTION 'FERIAS_AQUISITIVO_INVALIDO: período aquisitivo pertence a outro colaborador.' USING ERRCODE='P0001';
  END IF;

  IF COALESCE(v_aq.perdeu_direito, false) THEN
    RAISE EXCEPTION 'FERIAS_AQUISITIVO_INVALIDO: período aquisitivo perdido (Art. 133 CLT).' USING ERRCODE='P0001';
  END IF;

  IF COALESCE(v_aq.dias_direito, 0) = 0 THEN
    RAISE EXCEPTION 'FERIAS_AQUISITIVO_INVALIDO: período aquisitivo com 0 dias de direito.' USING ERRCODE='P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ferias_validar_aquisitivo ON public.ferias;
CREATE TRIGGER trg_ferias_validar_aquisitivo
BEFORE INSERT OR UPDATE OF periodo_aquisitivo_id, colaborador_id, cancelado
ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.trg_ferias_validar_aquisitivo();

-- 3.12: função de recálculo diário
CREATE OR REPLACE FUNCTION public.fn_recalcular_dobra_e_alertas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.periodos_aquisitivos
  SET data_limite_concessao = data_fim + INTERVAL '12 months',
      em_dobra = (CURRENT_DATE > (data_fim + INTERVAL '12 months') AND COALESCE(perdeu_direito,false) = false)
  WHERE (data_limite_concessao IS DISTINCT FROM (data_fim + INTERVAL '12 months')::date)
     OR (em_dobra IS DISTINCT FROM (CURRENT_DATE > (data_fim + INTERVAL '12 months') AND COALESCE(perdeu_direito,false) = false));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_recalcular_dobra_e_alertas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_recalcular_dobra_e_alertas() TO service_role;
