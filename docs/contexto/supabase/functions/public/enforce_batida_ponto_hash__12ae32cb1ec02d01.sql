CREATE OR REPLACE FUNCTION public.enforce_batida_ponto_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
  v_expected TEXT;
BEGIN
  -- Canonicalização determinística (mesmo formato usado nas edge functions)
  v_canonical := COALESCE(NEW.colaborador_id::text, '') || '|' ||
                 COALESCE(NEW.data::text, '')          || '|' ||
                 COALESCE(NEW.hora::text, '')          || '|' ||
                 COALESCE(NEW.tipo, '')                || '|' ||
                 COALESCE(NEW.dispositivo_id, '');

  v_expected := encode(digest(v_canonical, 'sha256'), 'hex');

  -- Se cliente não enviou hash, preenchemos (compat legado)
  IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
    NEW.hash_integridade := v_expected;
  END IF;

  RETURN NEW;
END;
$function$
