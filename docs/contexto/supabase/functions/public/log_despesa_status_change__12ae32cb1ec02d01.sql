CREATE OR REPLACE FUNCTION public.log_despesa_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.despesas_aprovacoes_log(despesa_id, usuario_id, acao, status_novo, empresa_id)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.colaborador_id), 'submetido', COALESCE(NEW.status,'pendente'), NEW.empresa_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.despesas_aprovacoes_log(
      despesa_id, usuario_id, acao, status_anterior, status_novo, motivo, empresa_id
    )
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.aprovado_por, NEW.colaborador_id),
      CASE NEW.status
        WHEN 'aprovado' THEN 'aprovado'
        WHEN 'rejeitado' THEN 'rejeitado'
        WHEN 'integrado_folha' THEN 'integrado_folha'
        WHEN 'pago' THEN 'pago'
        WHEN 'cancelado' THEN 'cancelado'
        ELSE 'editado'
      END,
      OLD.status, NEW.status,
      NEW.rejeitado_motivo,
      NEW.empresa_id
    );
  END IF;
  RETURN NEW;
END;
$function$
