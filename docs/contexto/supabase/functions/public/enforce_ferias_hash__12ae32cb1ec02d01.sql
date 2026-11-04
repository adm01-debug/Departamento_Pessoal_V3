CREATE OR REPLACE FUNCTION public.enforce_ferias_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.status IN ('em_gozo','paga','concluida','homologada','concluída') THEN
    v_canonical := COALESCE(NEW.colaborador_id::text,'')     || '|' ||
                   COALESCE(NEW.empresa_id::text,'')         || '|' ||
                   COALESCE(NEW.periodo_aquisitivo_id::text,'') || '|' ||
                   COALESCE(NEW.data_inicio::text,'')        || '|' ||
                   COALESCE(NEW.data_fim::text,'')           || '|' ||
                   COALESCE(NEW.dias_gozo::text,'0')         || '|' ||
                   COALESCE(NEW.dias_abono::text,'0')        || '|' ||
                   COALESCE(NEW.valor_ferias::text,'0')      || '|' ||
                   COALESCE(NEW.valor_terco::text,'0')       || '|' ||
                   COALESCE(NEW.valor_abono::text,'0')       || '|' ||
                   COALESCE(NEW.valor_terco_abono::text,'0') || '|' ||
                   COALESCE(NEW.valor_total::text,'0')       || '|' ||
                   COALESCE(NEW.descontos_inss::text,'0')    || '|' ||
                   COALESCE(NEW.descontos_irrf::text,'0')    || '|' ||
                   COALESCE(NEW.valor_liquido::text,'0');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical::bytea,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
