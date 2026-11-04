CREATE OR REPLACE FUNCTION public.trg_medida_esocial_on_aplicada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status_workflow = 'aplicada'
     AND (OLD.status_workflow IS DISTINCT FROM 'aplicada')
     AND NEW.tipo IN ('suspensao','justa_causa') THEN
    PERFORM public.enfileirar_esocial_medida_disciplinar(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
