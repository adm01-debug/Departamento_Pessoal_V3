CREATE OR REPLACE FUNCTION public.enforce_holerite_signed_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
  v_expected TEXT;
BEGIN
  IF NEW.assinado = true THEN
    v_canonical := COALESCE(NEW.folha_id::text,'')       || '|' ||
                   COALESCE(NEW.colaborador_id::text,'') || '|' ||
                   COALESCE(NEW.colaborador_cpf,'')      || '|' ||
                   COALESCE(NEW.total_proventos::text,'0')|| '|' ||
                   COALESCE(NEW.total_descontos::text,'0')|| '|' ||
                   COALESCE(NEW.liquido::text,'0')       || '|' ||
                   COALESCE(NEW.valor_inss::text,'0')    || '|' ||
                   COALESCE(NEW.valor_irrf::text,'0')    || '|' ||
                   COALESCE(NEW.valor_fgts::text,'0');
    v_expected := encode(digest(v_canonical,'sha256'),'hex');

    IF NEW.hash_assinatura IS NULL OR NEW.hash_assinatura = '' THEN
      NEW.hash_assinatura := v_expected;
    END IF;

    IF NEW.data_assinatura IS NULL THEN
      NEW.data_assinatura := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
