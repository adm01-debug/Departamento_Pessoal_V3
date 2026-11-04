CREATE OR REPLACE FUNCTION public.asos_validar_transicao_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  -- Transições permitidas
  v_allowed := (OLD.status,NEW.status) IN (
    ('rascunho','emitido_clinica'),
    ('rascunho','cancelado'),
    ('emitido_clinica','recebido_rh'),
    ('emitido_clinica','cancelado'),
    ('recebido_rh','validado'),
    ('recebido_rh','cancelado'),
    ('validado','arquivado')
  );
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$function$
