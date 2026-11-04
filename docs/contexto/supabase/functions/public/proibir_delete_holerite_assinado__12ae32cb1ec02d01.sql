CREATE OR REPLACE FUNCTION public.proibir_delete_holerite_assinado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.assinado = true THEN
    RAISE EXCEPTION 'Holerites assinados não podem ser deletados (exigência fiscal - retenção mínima 5 anos).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
