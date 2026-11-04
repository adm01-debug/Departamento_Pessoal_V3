CREATE OR REPLACE FUNCTION public.ponto_espelhos_assinados_guard_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Espelhos de ponto assinados são append-only (Portaria MTP 671/21). DELETE não é permitido.'
    USING ERRCODE = 'insufficient_privilege';
END;
$function$
