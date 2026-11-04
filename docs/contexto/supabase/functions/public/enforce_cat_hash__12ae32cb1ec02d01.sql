CREATE OR REPLACE FUNCTION public.enforce_cat_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.protocolo_esocial IS NOT NULL AND NEW.protocolo_esocial <> ''
     OR NEW.status_esocial IN ('enviado','processado','aceito','transmitido') THEN

    v_canonical := COALESCE(NEW.colaborador_id::text,'')      || '|' ||
                   COALESCE(NEW.empresa_id::text,'')          || '|' ||
                   COALESCE(NEW.data_acidente::text,'')       || '|' ||
                   COALESCE(NEW.tipo_acidente,'')             || '|' ||
                   COALESCE(NEW.local_acidente,'')            || '|' ||
                   COALESCE(NEW.parte_corpo_atingida,'')      || '|' ||
                   COALESCE(NEW.agente_causador,'')           || '|' ||
                   COALESCE(NEW.houve_afastamento::text,'false') || '|' ||
                   COALESCE(NEW.houve_obito::text,'false')    || '|' ||
                   COALESCE(NEW.protocolo_esocial,'');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
