CREATE OR REPLACE FUNCTION public.pagar_desligamento(_desligamento_id uuid, _comprovante_url text DEFAULT NULL::text)
 RETURNS desligamentos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar pagamento de rescisao' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status IS DISTINCT FROM 'homologado' THEN
    RAISE EXCEPTION 'Rescisao so pode ser paga apos homologacao (status atual: %)', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE(v_row.assinado_empresa, false) OR NOT COALESCE(v_row.assinado_colaborador, false) THEN
    RAISE EXCEPTION 'Rescisao precisa da assinatura da empresa e do colaborador antes do pagamento'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.desligamentos
  SET status = 'pago', etapa = 'concluido', checklist_pagamento = true,
      data_pagamento = now(), comprovante_pagamento_url = _comprovante_url
  WHERE id = _desligamento_id
  RETURNING * INTO v_row;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', auth.uid(),
          jsonb_build_object('action','pagar_desligamento','comprovante_url',_comprovante_url));

  RETURN v_row;
END;
$function$
