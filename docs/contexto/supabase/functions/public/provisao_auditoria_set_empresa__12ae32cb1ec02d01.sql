CREATE OR REPLACE FUNCTION public.provisao_auditoria_set_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT pm.empresa_id INTO NEW.empresa_id
    FROM public.provisoes_mensais pm
    WHERE pm.id = NEW.provisao_id;
  END IF;
  RETURN NEW;
END
$function$
