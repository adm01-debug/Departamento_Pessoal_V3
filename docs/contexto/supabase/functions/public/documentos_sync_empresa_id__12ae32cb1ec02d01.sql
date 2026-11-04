CREATE OR REPLACE FUNCTION public.documentos_sync_empresa_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_emp uuid;
BEGIN
  IF NEW.colaborador_id IS NOT NULL THEN
    SELECT c.empresa_id INTO v_emp
      FROM public.colaboradores c
     WHERE c.id = NEW.colaborador_id;
    IF FOUND THEN
      NEW.empresa_id := v_emp;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
