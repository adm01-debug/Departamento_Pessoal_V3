CREATE OR REPLACE FUNCTION public.enforce_aso_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  -- ASO é considerado emitido quando possui médico + CRM + arquivo
  IF NEW.medico_nome IS NOT NULL
     AND NEW.medico_crm IS NOT NULL
     AND NEW.arquivo_url IS NOT NULL
     AND NEW.arquivo_url <> '' THEN

    v_canonical := COALESCE(NEW.colaborador_id::text,'')  || '|' ||
                   COALESCE(NEW.empresa_id::text,'')      || '|' ||
                   COALESCE(NEW.tipo,'')                  || '|' ||
                   COALESCE(NEW.data_exame::text,'')      || '|' ||
                   COALESCE(NEW.data_validade::text,'')   || '|' ||
                   COALESCE(NEW.resultado,'')             || '|' ||
                   COALESCE(NEW.medico_nome,'')           || '|' ||
                   COALESCE(NEW.medico_crm,'')            || '|' ||
                   COALESCE(NEW.clinica,'')               || '|' ||
                   COALESCE(NEW.arquivo_url,'');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
