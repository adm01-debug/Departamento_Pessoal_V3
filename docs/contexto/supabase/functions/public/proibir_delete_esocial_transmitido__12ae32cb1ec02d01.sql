CREATE OR REPLACE FUNCTION public.proibir_delete_esocial_transmitido()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.recibo IS NOT NULL OR OLD.id_recibo IS NOT NULL OR OLD.status IN ('enviado','processado','aceito') THEN
    RAISE EXCEPTION 'Eventos eSocial transmitidos ao governo não podem ser deletados (exigência legal - use evento S-3000 de exclusão).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
