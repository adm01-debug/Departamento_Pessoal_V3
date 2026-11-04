CREATE OR REPLACE FUNCTION public.impedir_alteracao_cat_transmitida()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.protocolo_esocial IS NOT NULL AND OLD.protocolo_esocial <> '')
     OR OLD.status_esocial IN ('enviado','processado','aceito','transmitido') THEN
    IF NEW.colaborador_id       IS DISTINCT FROM OLD.colaborador_id
       OR NEW.empresa_id        IS DISTINCT FROM OLD.empresa_id
       OR NEW.data_acidente     IS DISTINCT FROM OLD.data_acidente
       OR NEW.tipo_acidente     IS DISTINCT FROM OLD.tipo_acidente
       OR NEW.local_acidente    IS DISTINCT FROM OLD.local_acidente
       OR NEW.parte_corpo_atingida IS DISTINCT FROM OLD.parte_corpo_atingida
       OR NEW.agente_causador   IS DISTINCT FROM OLD.agente_causador
       OR NEW.houve_afastamento IS DISTINCT FROM OLD.houve_afastamento
       OR NEW.houve_obito       IS DISTINCT FROM OLD.houve_obito
       OR NEW.protocolo_esocial IS DISTINCT FROM OLD.protocolo_esocial
       OR NEW.hash_integridade  IS DISTINCT FROM OLD.hash_integridade THEN
      RAISE EXCEPTION 'CAT transmitida ao eSocial (S-2210) é imutável. Emita CAT de reabertura/retificação via evento oficial.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
