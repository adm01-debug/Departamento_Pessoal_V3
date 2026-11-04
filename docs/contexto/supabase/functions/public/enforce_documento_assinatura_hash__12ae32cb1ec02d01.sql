CREATE OR REPLACE FUNCTION public.enforce_documento_assinatura_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.status = 'assinado'
     OR NEW.assinatura_base64 IS NOT NULL
     OR NEW.assinado_em IS NOT NULL THEN

    v_canonical := COALESCE(NEW.colaborador_id::text,'')     || '|' ||
                   COALESCE(NEW.empresa_id::text,'')         || '|' ||
                   COALESCE(NEW.tipo_documento,'')           || '|' ||
                   COALESCE(NEW.titulo,'')                   || '|' ||
                   COALESCE(NEW.conteudo_url,'')             || '|' ||
                   COALESCE(NEW.assinatura_base64,'')        || '|' ||
                   COALESCE(NEW.assinado_em::text,'')        || '|' ||
                   COALESCE(NEW.assinado_por::text,'')       || '|' ||
                   COALESCE(NEW.ip_assinatura,'')            || '|' ||
                   COALESCE(NEW.validade_assinatura::text,'');

    IF NEW.hash_documento IS NULL OR NEW.hash_documento = '' THEN
      NEW.hash_documento := encode(digest(v_canonical,'sha256'),'hex');
    END IF;

    IF NEW.assinado_em IS NULL AND NEW.status = 'assinado' THEN
      NEW.assinado_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
