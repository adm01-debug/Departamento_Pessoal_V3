CREATE OR REPLACE FUNCTION public.gerar_hash_batida_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  NEW.hash_digital := encode(digest(
    COALESCE(NEW.colaborador_id::text, '') || 
    COALESCE(NEW.data::text, '') || 
    COALESCE(NEW.hora::text, '') || 
    COALESCE(NEW.tipo, '') ||
    COALESCE(NEW.dispositivo_id, '') ||
    COALESCE(NEW.ip_address, ''), 
    'sha256'
  ), 'hex');
  RETURN NEW;
END;
$function$
