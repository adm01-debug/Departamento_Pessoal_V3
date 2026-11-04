CREATE OR REPLACE FUNCTION public.update_extintor_status_vencimento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_proxima_recarga < CURRENT_DATE 
     OR NEW.data_proximo_teste_hidrostatico < CURRENT_DATE THEN
    IF NEW.status = 'ATIVO' THEN
      NEW.status := 'VENCIDO';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
