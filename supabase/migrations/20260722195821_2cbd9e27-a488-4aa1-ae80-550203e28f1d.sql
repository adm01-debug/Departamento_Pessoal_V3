
ALTER TABLE public.periodos_aquisitivos
  ADD COLUMN IF NOT EXISTS perdeu_direito boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_perda text;

-- Estender a função de recálculo já criada em 1.1 para setar perdeu_direito
CREATE OR REPLACE FUNCTION public.trg_periodos_aquisitivos_recalc_dias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_faltas integer;
BEGIN
  v_faltas := COALESCE(NEW.faltas_periodo, 0);
  NEW.dias_direito := public.calcular_dias_direito_ferias(v_faltas);

  IF v_faltas > 32 THEN
    NEW.perdeu_direito := true;
    NEW.motivo_perda := COALESCE(NEW.motivo_perda,
      'Art. 133 CLT — mais de 32 faltas injustificadas no período aquisitivo (' || v_faltas || ' faltas)');
  ELSE
    IF NEW.perdeu_direito = true AND OLD.perdeu_direito = true
       AND (OLD.motivo_perda IS NULL OR OLD.motivo_perda LIKE 'Art. 133 CLT%') THEN
      -- Se reversão via correção de faltas, limpa marca automática
      NEW.perdeu_direito := false;
      NEW.motivo_perda := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Retroativo
UPDATE public.periodos_aquisitivos
SET perdeu_direito = true,
    motivo_perda = COALESCE(motivo_perda,
      'Art. 133 CLT — mais de 32 faltas injustificadas (' || COALESCE(faltas_periodo,0) || ' faltas)'),
    dias_direito = 0
WHERE COALESCE(faltas_periodo, 0) > 32
  AND (perdeu_direito = false OR dias_direito <> 0);

COMMENT ON COLUMN public.periodos_aquisitivos.perdeu_direito IS
'CLT Art. 133 — período aquisitivo perdido (faltas > 32 ou afastamentos legais).';
COMMENT ON COLUMN public.periodos_aquisitivos.motivo_perda IS
'Descrição da causa da perda do direito às férias.';
