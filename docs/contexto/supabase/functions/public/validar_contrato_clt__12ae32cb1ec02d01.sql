CREATE OR REPLACE FUNCTION public.validar_contrato_clt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo TEXT;
  v_dias INTEGER;
  v_anterior_dias INTEGER;
BEGIN
  SELECT tipo_contrato INTO v_tipo FROM public.contrato_templates WHERE id = NEW.template_id;

  IF NEW.data_inicio IS NOT NULL AND NEW.data_fim IS NOT NULL THEN
    v_dias := (NEW.data_fim - NEW.data_inicio);

    IF v_dias < 0 THEN
      RAISE EXCEPTION 'CLT: data_fim não pode ser anterior a data_inicio';
    END IF;

    -- Experiência: máx 45 dias por período, 90 no total (Art. 445 §único)
    IF v_tipo = 'clt_experiencia' THEN
      IF v_dias > 45 THEN
        RAISE EXCEPTION 'CLT Art. 445 §único: contrato de experiência não pode exceder 45 dias por período (informado: % dias)', v_dias;
      END IF;

      IF NEW.contrato_anterior_id IS NOT NULL THEN
        SELECT (data_fim - data_inicio) INTO v_anterior_dias
        FROM public.contratos_gerados WHERE id = NEW.contrato_anterior_id;

        IF COALESCE(v_anterior_dias,0) + v_dias > 90 THEN
          RAISE EXCEPTION 'CLT Art. 445 §único: soma dos períodos de experiência (45+45) não pode exceder 90 dias';
        END IF;

        -- Marca o anterior como prorrogado
        UPDATE public.contratos_gerados SET prorrogado = TRUE WHERE id = NEW.contrato_anterior_id;
      END IF;
    END IF;

    -- Determinado: máx 2 anos (Art. 445 caput)
    IF v_tipo = 'clt_determinado' AND v_dias > 730 THEN
      RAISE EXCEPTION 'CLT Art. 445: contrato por prazo determinado não pode exceder 2 anos';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
