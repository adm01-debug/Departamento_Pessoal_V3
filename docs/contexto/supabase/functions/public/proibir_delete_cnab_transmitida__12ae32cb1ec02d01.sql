CREATE OR REPLACE FUNCTION public.proibir_delete_cnab_transmitida()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('transmitida','enviada','processada','confirmada') THEN
    RAISE EXCEPTION 'Remessas CNAB transmitidas não podem ser deletadas (rastreabilidade financeira - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
