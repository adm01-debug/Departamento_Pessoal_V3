CREATE OR REPLACE FUNCTION public.enforce_esocial_evento_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.status IN ('enviado','processado','aceito') OR NEW.recibo IS NOT NULL OR NEW.id_recibo IS NOT NULL THEN
    v_canonical := COALESCE(NEW.empresa_id::text,'')  || '|' ||
                   COALESCE(NEW.tipo_evento,'')       || '|' ||
                   COALESCE(NEW.competencia,'')       || '|' ||
                   COALESCE(NEW.xml_envio, NEW.xml, '') || '|' ||
                   COALESCE(NEW.protocolo,'')         || '|' ||
                   COALESCE(NEW.recibo,'')            || '|' ||
                   COALESCE(NEW.id_recibo,'');

    IF NEW.hash_arquivo IS NULL OR NEW.hash_arquivo = '' THEN
      NEW.hash_arquivo := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
