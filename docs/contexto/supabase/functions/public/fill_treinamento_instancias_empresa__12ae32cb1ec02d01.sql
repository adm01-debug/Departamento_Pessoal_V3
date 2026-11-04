CREATE OR REPLACE FUNCTION public.fill_treinamento_instancias_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.empresa_id IS NULL AND NEW.curso_id IS NOT NULL THEN
    NEW.empresa_id := (SELECT empresa_id FROM public.catalogo_cursos WHERE id = NEW.curso_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$
