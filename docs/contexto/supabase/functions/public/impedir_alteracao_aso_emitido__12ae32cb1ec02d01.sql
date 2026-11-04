CREATE OR REPLACE FUNCTION public.impedir_alteracao_aso_emitido()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.arquivo_url IS NOT NULL AND OLD.arquivo_url <> ''
     AND OLD.medico_crm IS NOT NULL THEN
    IF NEW.colaborador_id  IS DISTINCT FROM OLD.colaborador_id
       OR NEW.empresa_id   IS DISTINCT FROM OLD.empresa_id
       OR NEW.tipo         IS DISTINCT FROM OLD.tipo
       OR NEW.data_exame   IS DISTINCT FROM OLD.data_exame
       OR NEW.resultado    IS DISTINCT FROM OLD.resultado
       OR NEW.medico_nome  IS DISTINCT FROM OLD.medico_nome
       OR NEW.medico_crm   IS DISTINCT FROM OLD.medico_crm
       OR NEW.clinica      IS DISTINCT FROM OLD.clinica
       OR NEW.arquivo_url  IS DISTINCT FROM OLD.arquivo_url
       OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
      RAISE EXCEPTION 'ASO emitido é imutável (NR-7/PCMSO). Emita um novo ASO retificador.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
