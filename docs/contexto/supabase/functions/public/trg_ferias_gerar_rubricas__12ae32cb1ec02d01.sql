CREATE OR REPLACE FUNCTION public.trg_ferias_gerar_rubricas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovada'
     AND COALESCE(NEW.enviado_contabilidade, false) = true
     AND (
       OLD.status IS DISTINCT FROM NEW.status
       OR OLD.enviado_contabilidade IS DISTINCT FROM NEW.enviado_contabilidade
     )
  THEN
    PERFORM public.gerar_rubricas_ferias(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
