CREATE OR REPLACE FUNCTION public.dp_sync_empresa_from_colaborador()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_emp uuid;
BEGIN
  IF NEW.colaborador_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT c.empresa_id INTO v_emp
    FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;
  IF v_emp IS NOT NULL THEN
    NEW.empresa_id := v_emp;
  END IF;
  RETURN NEW;
END;
$function$
