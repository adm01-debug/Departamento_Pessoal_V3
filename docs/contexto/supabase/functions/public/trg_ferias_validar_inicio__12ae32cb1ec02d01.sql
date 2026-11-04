CREATE OR REPLACE FUNCTION public.trg_ferias_validar_inicio()
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
$function$
