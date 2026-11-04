CREATE OR REPLACE FUNCTION public.proibir_delete_cat_transmitida()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.protocolo_esocial IS NOT NULL AND OLD.protocolo_esocial <> '')
     OR OLD.status_esocial IN ('enviado','processado','aceito','transmitido') THEN
    RAISE EXCEPTION 'CATs transmitidas não podem ser deletadas (prova previdenciária INSS - retenção mínima 20 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
