CREATE OR REPLACE FUNCTION public.enforce_afastamento_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.status IN ('encerrado','cancelado') OR NEW.aprovado_em IS NOT NULL THEN
    v_canonical := COALESCE(NEW.colaborador_id::text,'')      || '|' ||
                   COALESCE(NEW.empresa_id::text,'')          || '|' ||
                   COALESCE(NEW.tipo::text,'')                || '|' ||
                   COALESCE(NEW.data_inicio::text,'')         || '|' ||
                   COALESCE(NEW.data_fim_prevista::text,'')   || '|' ||
                   COALESCE(NEW.data_fim_real::text,'')       || '|' ||
                   COALESCE(NEW.dias_empresa::text,'0')       || '|' ||
                   COALESCE(NEW.dias_inss::text,'0')          || '|' ||
                   COALESCE(NEW.cid::text,'')                 || '|' ||
                   COALESCE(NEW.numero_beneficio::text,'')    || '|' ||
                   COALESCE(NEW.medico_nome::text,'')         || '|' ||
                   COALESCE(NEW.medico_crm::text,'')          || '|' ||
                   COALESCE(NEW.atestado_numero::text,'')     || '|' ||
                   COALESCE(NEW.data_pericia::text,'')        || '|' ||
                   COALESCE(NEW.status::text,'');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
