CREATE OR REPLACE FUNCTION public.impedir_alteracao_esocial_transmitido()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.recibo IS NOT NULL OR OLD.id_recibo IS NOT NULL THEN
    IF NEW.xml_envio    IS DISTINCT FROM OLD.xml_envio
       OR NEW.xml       IS DISTINCT FROM OLD.xml
       OR NEW.dados     IS DISTINCT FROM OLD.dados
       OR NEW.tipo_evento IS DISTINCT FROM OLD.tipo_evento
       OR NEW.competencia IS DISTINCT FROM OLD.competencia
       OR NEW.empresa_id  IS DISTINCT FROM OLD.empresa_id
       OR NEW.protocolo   IS DISTINCT FROM OLD.protocolo
       OR NEW.recibo      IS DISTINCT FROM OLD.recibo
       OR NEW.id_recibo   IS DISTINCT FROM OLD.id_recibo
       OR NEW.hash_arquivo IS DISTINCT FROM OLD.hash_arquivo THEN
      RAISE EXCEPTION 'Evento eSocial transmitido (com recibo/protocolo) é imutável. Envie um evento de retificação/exclusão via layout oficial.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
