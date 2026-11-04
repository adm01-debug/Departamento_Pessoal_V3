CREATE OR REPLACE FUNCTION public.proibir_delete_aso_emitido()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.arquivo_url IS NOT NULL AND OLD.arquivo_url <> ''
     AND OLD.medico_crm IS NOT NULL THEN
    RAISE EXCEPTION 'ASOs emitidos não podem ser deletados (NR-7: retenção mínima 20 anos após desligamento).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
