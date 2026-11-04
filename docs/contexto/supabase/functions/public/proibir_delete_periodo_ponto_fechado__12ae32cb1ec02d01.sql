CREATE OR REPLACE FUNCTION public.proibir_delete_periodo_ponto_fechado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('fechado','fechada','closed','homologado') THEN
    RAISE EXCEPTION 'Períodos de ponto fechados não podem ser deletados (Portaria 671 MTP - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
