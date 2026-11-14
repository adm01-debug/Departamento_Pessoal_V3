CREATE OR REPLACE FUNCTION public.fn_pensoes_set_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.colaborador_id IS NOT NULL THEN
    SELECT c.empresa_id INTO NEW.empresa_id
    FROM public.colaboradores c
    WHERE c.id = NEW.colaborador_id;
  END IF;
  RETURN NEW;
END;
$function$
