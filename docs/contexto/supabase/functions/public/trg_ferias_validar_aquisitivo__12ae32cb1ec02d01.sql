CREATE OR REPLACE FUNCTION public.trg_ferias_validar_aquisitivo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
