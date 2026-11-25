CREATE OR REPLACE FUNCTION public.prevent_empty_empresa_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.empresa_id IS NOT NULL AND NEW.empresa_id::text = '' THEN
    RAISE EXCEPTION 'empresa_id cannot be an empty string';
  END IF;
  RETURN NEW;
END;
$function$
