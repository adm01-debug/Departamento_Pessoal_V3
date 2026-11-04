CREATE OR REPLACE FUNCTION public.proibir_delete_folha_fechada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('fechada','paga') THEN
    RAISE EXCEPTION 'Folhas fechadas/pagas não podem ser deletadas (exigência fiscal/contábil - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
