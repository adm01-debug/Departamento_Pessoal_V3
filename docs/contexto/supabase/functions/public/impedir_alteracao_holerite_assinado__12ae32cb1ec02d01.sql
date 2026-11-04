CREATE OR REPLACE FUNCTION public.impedir_alteracao_holerite_assinado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.assinado = true THEN
    IF NEW.total_proventos IS DISTINCT FROM OLD.total_proventos
       OR NEW.total_descontos IS DISTINCT FROM OLD.total_descontos
       OR NEW.liquido         IS DISTINCT FROM OLD.liquido
       OR NEW.valor_inss      IS DISTINCT FROM OLD.valor_inss
       OR NEW.valor_irrf      IS DISTINCT FROM OLD.valor_irrf
       OR NEW.valor_fgts      IS DISTINCT FROM OLD.valor_fgts
       OR NEW.hash_assinatura IS DISTINCT FROM OLD.hash_assinatura
       OR NEW.data_assinatura IS DISTINCT FROM OLD.data_assinatura
       OR NEW.colaborador_id  IS DISTINCT FROM OLD.colaborador_id
       OR NEW.folha_id        IS DISTINCT FROM OLD.folha_id
       OR NEW.assinado        IS DISTINCT FROM OLD.assinado THEN
      RAISE EXCEPTION 'Holerite assinado é imutável (WORM). Campos financeiros/assinatura não podem ser alterados.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
