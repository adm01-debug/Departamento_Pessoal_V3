CREATE OR REPLACE FUNCTION public.impedir_alteracao_periodo_ponto_fechado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('fechado','fechada','closed','homologado') THEN
    IF NEW.status = OLD.status THEN
      IF NEW.competencia   IS DISTINCT FROM OLD.competencia
         OR NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
         OR NEW.data_fim   IS DISTINCT FROM OLD.data_fim
         OR NEW.fechado_em IS DISTINCT FROM OLD.fechado_em THEN
        RAISE EXCEPTION 'Período de ponto fechado é imutável (Portaria 671 MTP). Reabra oficialmente antes de alterar.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
