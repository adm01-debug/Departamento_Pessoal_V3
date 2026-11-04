CREATE OR REPLACE FUNCTION public.gerar_hash_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  NEW.hash_digital := encode(digest(
    COALESCE(NEW.colaborador_id::text, '') ||
    COALESCE(NEW.data::text, '') ||
    COALESCE(NEW.entrada_1::text, '') ||
    COALESCE(NEW.tipo_dia::text, ''),
    'sha256'
  ), 'hex');
  RETURN NEW;
END;
$function$
