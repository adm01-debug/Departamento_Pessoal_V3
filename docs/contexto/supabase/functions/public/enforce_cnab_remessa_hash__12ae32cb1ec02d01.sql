CREATE OR REPLACE FUNCTION public.enforce_cnab_remessa_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.status IN ('transmitida','enviada','processada','confirmada') THEN
    v_canonical := COALESCE(NEW.empresa_id::text,'')       || '|' ||
                   COALESCE(NEW.banco_codigo,'')           || '|' ||
                   COALESCE(NEW.sequencial_arquivo::text,'')|| '|' ||
                   COALESCE(NEW.data_geracao::text,'')     || '|' ||
                   COALESCE(NEW.total_pagamentos::text,'0')|| '|' ||
                   COALESCE(NEW.valor_total::text,'0')     || '|' ||
                   COALESCE(NEW.arquivo_url,'');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
