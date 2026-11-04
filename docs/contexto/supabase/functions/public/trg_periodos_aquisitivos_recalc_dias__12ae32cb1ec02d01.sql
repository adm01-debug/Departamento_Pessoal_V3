CREATE OR REPLACE FUNCTION public.trg_periodos_aquisitivos_recalc_dias()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
