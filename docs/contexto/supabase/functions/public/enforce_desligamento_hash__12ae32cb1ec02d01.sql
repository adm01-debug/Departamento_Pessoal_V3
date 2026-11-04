CREATE OR REPLACE FUNCTION public.enforce_desligamento_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  IF NEW.status IN ('homologado','finalizado','concluido') THEN
    v_canonical := COALESCE(NEW.colaborador_id::text,'')      || '|' ||
                   COALESCE(NEW.empresa_id::text,'')          || '|' ||
                   COALESCE(NEW.data_desligamento::text,'')   || '|' ||
                   COALESCE(NEW.tipo::text,'')                || '|' ||
                   COALESCE(NEW.saldo_salario::text,'0')      || '|' ||
                   COALESCE(NEW.aviso_previo::text,'0')       || '|' ||
                   COALESCE(NEW.ferias_vencidas::text,'0')    || '|' ||
                   COALESCE(NEW.ferias_proporcionais::text,'0')|| '|' ||
                   COALESCE(NEW.terco_constitucional::text,'0')|| '|' ||
                   COALESCE(NEW.decimo_terceiro::text,'0')    || '|' ||
                   COALESCE(NEW.multa_fgts::text,'0')         || '|' ||
                   COALESCE(NEW.total_proventos::text,'0')    || '|' ||
                   COALESCE(NEW.total_descontos::text,'0')    || '|' ||
                   COALESCE(NEW.valor_liquido::text,'0');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical, 'sha256'::text), 'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
