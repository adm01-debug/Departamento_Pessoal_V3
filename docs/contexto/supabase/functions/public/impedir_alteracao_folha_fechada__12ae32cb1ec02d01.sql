CREATE OR REPLACE FUNCTION public.impedir_alteracao_folha_fechada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('fechada','paga') THEN
    -- Reabertura e marcação de pagamento só tocam status/metadados;
    -- valores financeiros nunca mudam a partir de estado terminal.
    IF NEW.total_proventos IS DISTINCT FROM OLD.total_proventos
       OR NEW.total_descontos IS DISTINCT FROM OLD.total_descontos
       OR NEW.total_liquido   IS DISTINCT FROM OLD.total_liquido
       OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade
       OR NEW.competencia     IS DISTINCT FROM OLD.competencia
       OR NEW.empresa_id      IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Folha fechada/paga é imutável. Reabra a folha antes de alterar valores (motivo obrigatório).'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
