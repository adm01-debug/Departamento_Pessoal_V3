CREATE OR REPLACE FUNCTION public.impedir_alteracao_ferias_concluidas()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('em_gozo','paga','concluida','homologada','concluída') THEN
    IF NEW.status = OLD.status THEN
      IF NEW.data_inicio       IS DISTINCT FROM OLD.data_inicio
         OR NEW.data_fim       IS DISTINCT FROM OLD.data_fim
         OR NEW.dias_gozo      IS DISTINCT FROM OLD.dias_gozo
         OR NEW.dias_abono     IS DISTINCT FROM OLD.dias_abono
         OR NEW.valor_ferias   IS DISTINCT FROM OLD.valor_ferias
         OR NEW.valor_terco    IS DISTINCT FROM OLD.valor_terco
         OR NEW.valor_abono    IS DISTINCT FROM OLD.valor_abono
         OR NEW.valor_total    IS DISTINCT FROM OLD.valor_total
         OR NEW.valor_liquido  IS DISTINCT FROM OLD.valor_liquido
         OR NEW.descontos_inss IS DISTINCT FROM OLD.descontos_inss
         OR NEW.descontos_irrf IS DISTINCT FROM OLD.descontos_irrf
         OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
         OR NEW.empresa_id     IS DISTINCT FROM OLD.empresa_id
         OR NEW.periodo_aquisitivo_id IS DISTINCT FROM OLD.periodo_aquisitivo_id
         OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
        RAISE EXCEPTION 'Férias em status % são imutáveis. Cancele oficialmente antes de alterar.', OLD.status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
