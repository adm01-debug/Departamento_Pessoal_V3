CREATE OR REPLACE FUNCTION public.impedir_alteracao_desligamento_homologado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('homologado','finalizado','concluido','concluído','pago') THEN
    -- Transição de status (homologado→pago, reabertura) segue livre; o que
    -- não pode mudar nunca a partir de um estado terminal são os valores.
    IF NEW.data_desligamento     IS DISTINCT FROM OLD.data_desligamento
       OR NEW.tipo               IS DISTINCT FROM OLD.tipo
       OR NEW.saldo_salario      IS DISTINCT FROM OLD.saldo_salario
       OR NEW.aviso_previo       IS DISTINCT FROM OLD.aviso_previo
       OR NEW.ferias_vencidas    IS DISTINCT FROM OLD.ferias_vencidas
       OR NEW.ferias_proporcionais IS DISTINCT FROM OLD.ferias_proporcionais
       OR NEW.terco_constitucional IS DISTINCT FROM OLD.terco_constitucional
       OR NEW.decimo_terceiro    IS DISTINCT FROM OLD.decimo_terceiro
       OR NEW.multa_fgts         IS DISTINCT FROM OLD.multa_fgts
       OR NEW.total_proventos    IS DISTINCT FROM OLD.total_proventos
       OR NEW.total_descontos    IS DISTINCT FROM OLD.total_descontos
       OR NEW.valor_liquido      IS DISTINCT FROM OLD.valor_liquido
       OR NEW.detalhes_calculo   IS DISTINCT FROM OLD.detalhes_calculo
       OR NEW.hash_integridade   IS DISTINCT FROM OLD.hash_integridade
       OR NEW.hash_assinatura_empresa IS DISTINCT FROM OLD.hash_assinatura_empresa
       OR NEW.hash_assinatura_colaborador IS DISTINCT FROM OLD.hash_assinatura_colaborador
       OR NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
       OR NEW.empresa_id         IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Desligamento homologado/pago é imutável. Reabra oficialmente antes de alterar valores.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
