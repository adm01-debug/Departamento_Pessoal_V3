CREATE OR REPLACE FUNCTION public.increment_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$function$
