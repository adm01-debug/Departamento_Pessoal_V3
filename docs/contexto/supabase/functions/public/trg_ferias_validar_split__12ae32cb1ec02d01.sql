CREATE OR REPLACE FUNCTION public.trg_ferias_validar_split()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
