CREATE OR REPLACE FUNCTION public.enforce_folha_pagamento_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
  v_expected TEXT;
BEGIN
  IF NEW.status::text IN ('fechada','fechado','closed') THEN
    v_canonical := COALESCE(NEW.empresa_id::text, '')     || '|' ||
                   COALESCE(NEW.competencia::text, '')    || '|' ||
                   COALESCE(NEW.total_proventos::text,'0')|| '|' ||
                   COALESCE(NEW.total_descontos::text,'0')|| '|' ||
                   COALESCE(NEW.total_liquido::text, '0') || '|' ||
                   COALESCE(NEW.version::text, '1')       || '|' ||
                   COALESCE(NEW.status::text, '');

    v_expected := encode(digest(v_canonical::bytea, 'sha256'), 'hex');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := v_expected;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
