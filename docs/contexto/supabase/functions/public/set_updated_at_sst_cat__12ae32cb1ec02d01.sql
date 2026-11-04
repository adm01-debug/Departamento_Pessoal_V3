CREATE OR REPLACE FUNCTION public.set_updated_at_sst_cat()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$
