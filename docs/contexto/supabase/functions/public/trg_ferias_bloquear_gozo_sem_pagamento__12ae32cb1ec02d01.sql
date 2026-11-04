CREATE OR REPLACE FUNCTION public.trg_ferias_bloquear_gozo_sem_pagamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'em_gozo' AND (OLD.status IS DISTINCT FROM 'em_gozo') THEN
    IF NEW.pagamento_confirmado_em IS NULL THEN
      RAISE EXCEPTION 'CLT_ART_145: pagamento das férias deve ser confirmado antes do início do gozo'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
