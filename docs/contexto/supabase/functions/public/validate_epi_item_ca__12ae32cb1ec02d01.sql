CREATE OR REPLACE FUNCTION public.validate_epi_item_ca()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ca_validade IS NOT NULL AND NEW.status_item = 'em_uso' AND NEW.data_entrega > NEW.ca_validade THEN
    RAISE EXCEPTION 'CA % vencido em % — não é permitido entregar EPI com CA vencido', NEW.ca, NEW.ca_validade;
  END IF;
  RETURN NEW;
END;
$function$
