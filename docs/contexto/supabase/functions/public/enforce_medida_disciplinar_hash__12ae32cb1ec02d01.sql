CREATE OR REPLACE FUNCTION public.enforce_medida_disciplinar_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_canonical TEXT;
BEGIN
  -- Só canoniza quando a medida está formalmente aplicada/ciente/assinada
  IF NEW.status IN ('aplicada','assinada','ciente','homologada','concluida','concluída')
     OR NEW.colaborador_ciente = true
     OR NEW.assinado_em IS NOT NULL
     OR NEW.recusa_assinatura = true THEN

    v_canonical := COALESCE(NEW.colaborador_id::text,'')     || '|' ||
                   COALESCE(NEW.empresa_id::text,'')         || '|' ||
                   COALESCE(NEW.tipo,'')                     || '|' ||
                   COALESCE(NEW.data_ocorrencia::text,'')    || '|' ||
                   COALESCE(NEW.descricao,'')                || '|' ||
                   COALESCE(NEW.dias_suspensao::text,'0')    || '|' ||
                   COALESCE(NEW.artigo_clt,'')               || '|' ||
                   COALESCE(NEW.testemunha_1_nome,'')        || '|' ||
                   COALESCE(NEW.testemunha_1_cpf,'')         || '|' ||
                   COALESCE(NEW.testemunha_2_nome,'')        || '|' ||
                   COALESCE(NEW.testemunha_2_cpf,'')         || '|' ||
                   COALESCE(NEW.recusa_assinatura::text,'false') || '|' ||
                   COALESCE(NEW.data_ciencia::text,'')       || '|' ||
                   COALESCE(NEW.assinado_em::text,'');

    IF NEW.hash_integridade IS NULL OR NEW.hash_integridade = '' THEN
      NEW.hash_integridade := encode(digest(v_canonical,'sha256'),'hex');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
