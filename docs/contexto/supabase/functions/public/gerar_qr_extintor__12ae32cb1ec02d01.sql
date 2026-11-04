CREATE OR REPLACE FUNCTION public.gerar_qr_extintor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := 'EXT-' || substr(NEW.id::text, 1, 8) || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$function$
