CREATE OR REPLACE FUNCTION public.trg_desligamentos_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'pago' AND NEW.status IS DISTINCT FROM 'pago' THEN
    RAISE EXCEPTION 'Rescisão paga é definitiva e não pode ser reaberta ou alterada'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'pago' AND OLD.status IS DISTINCT FROM 'pago' THEN
    IF OLD.status IS DISTINCT FROM 'homologado' THEN
      RAISE EXCEPTION 'Rescisao só pode ser paga após homologação (status atual: %)', OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT COALESCE(NEW.assinado_empresa, false) OR NOT COALESCE(NEW.assinado_colaborador, false) THEN
      RAISE EXCEPTION 'Rescisao só pode ser paga com assinatura da empresa e do colaborador registradas'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF public._is_admin_bypass() THEN RETURN NEW; END IF;

  PERFORM public.validate_status_transition('desligamentos', OLD.status, NEW.status, '{
    "rascunho": ["em_andamento","cancelado"],
    "pendente": ["em_andamento","cancelado"],
    "em_andamento": ["aprovado","rejeitado","cancelado","calculado"],
    "calculado": ["em_homologacao","em_andamento","cancelado"],
    "em_homologacao": ["homologado","calculado","cancelado"],
    "aprovado": ["concluido","homologado","cancelado"],
    "concluido": ["homologado"],
    "homologado": ["pago"]
  }'::jsonb);
  RETURN NEW;
END;
$function$
