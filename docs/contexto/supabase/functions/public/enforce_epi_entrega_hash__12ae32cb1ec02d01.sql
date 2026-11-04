CREATE OR REPLACE FUNCTION public.enforce_epi_entrega_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.assinatura_url IS NOT NULL AND NEW.assinatura_url <> '' THEN
    v_canonical := COALESCE(NEW.epi_id::text,'')          || '|' ||
                   COALESCE(NEW.colaborador_id::text,'')  || '|' ||
                   COALESCE(NEW.empresa_id::text,'')      || '|' ||
                   COALESCE(NEW.data_entrega::text,'')    || '|' ||
                   COALESCE(NEW.quantidade::text,'1')     || '|' ||
                   COALESCE(NEW.motivo,'')                || '|' ||
                   COALESCE(NEW.assinatura_url,'')        || '|' ||
                   COALESCE(NEW.entregue_por::text,'');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
