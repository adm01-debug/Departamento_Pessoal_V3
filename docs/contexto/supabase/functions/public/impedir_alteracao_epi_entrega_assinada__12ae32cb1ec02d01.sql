CREATE OR REPLACE FUNCTION public.impedir_alteracao_epi_entrega_assinada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.assinatura_url IS NOT NULL AND OLD.assinatura_url <> '' THEN
    IF NEW.epi_id           IS DISTINCT FROM OLD.epi_id
       OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
       OR NEW.empresa_id     IS DISTINCT FROM OLD.empresa_id
       OR NEW.data_entrega   IS DISTINCT FROM OLD.data_entrega
       OR NEW.quantidade     IS DISTINCT FROM OLD.quantidade
       OR NEW.motivo         IS DISTINCT FROM OLD.motivo
       OR NEW.assinatura_url IS DISTINCT FROM OLD.assinatura_url
       OR NEW.entregue_por   IS DISTINCT FROM OLD.entregue_por
       OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
      RAISE EXCEPTION 'Entrega de EPI assinada é imutável (NR-6). Registre nova entrega/devolução em vez de alterar.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
