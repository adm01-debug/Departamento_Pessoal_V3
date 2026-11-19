CREATE OR REPLACE FUNCTION public.pagar_desligamento(_desligamento_id uuid, _comprovante_url text DEFAULT NULL::text, _actor_id uuid DEFAULT NULL::uuid)
 RETURNS desligamentos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
  v_multa numeric;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Ator obrigatório (chamada só pela edge pagar-desligamento)' USING ERRCODE = '42501';
  END IF;
  -- Sessão de usuário (se houver) não pode agir em nome de outro.
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM _actor_id THEN
    RAISE EXCEPTION 'Ator divergente da sessão' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.pode_gerir_rh_para(_actor_id, v_row.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar pagamento de rescisão' USING ERRCODE = '42501';
  END IF;

  IF v_row.status IS DISTINCT FROM 'homologado' THEN
    RAISE EXCEPTION 'Rescisao so pode ser paga apos homologacao (status atual: %)', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE(v_row.assinado_empresa, false) OR NOT COALESCE(v_row.assinado_colaborador, false) THEN
    RAISE EXCEPTION 'Rescisao precisa da assinatura da empresa e do colaborador antes do pagamento'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE(v_row.checklist_homologacao, false) THEN
    RAISE EXCEPTION 'Rescisao precisa da homologacao concluida antes do pagamento'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.desligamentos
  SET status = 'pago', etapa = 'finalizado', checklist_pagamento = true,
      data_pagamento = now(), comprovante_pagamento_url = COALESCE(_comprovante_url, comprovante_pagamento_url)
  WHERE id = _desligamento_id
  RETURNING * INTO v_row;

  -- Desativa o colaborador na mesma transação: antes era um segundo UPDATE
  -- client-side cujo erro era apenas logado (desligamento 'pago' com
  -- colaborador 'ativo').
  UPDATE public.colaboradores
  SET status = 'desligado', data_desligamento = v_row.data_desligamento
  WHERE id = v_row.colaborador_id AND empresa_id = v_row.empresa_id;

  v_multa := COALESCE(v_row.multa_fgts, NULLIF(v_row.detalhes_calculo->>'multaFGTS', '')::numeric, 0);

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', _actor_id,
          jsonb_build_object(
            'action', 'pagar_desligamento',
            'comprovante_url', _comprovante_url,
            'empresa_id', v_row.empresa_id,
            'colaborador_id', v_row.colaborador_id,
            'colaborador_desativado', true,
            -- Obrigações documentais (sem tabela trct/grrf em produção):
            'trct', jsonb_build_object('numero', 'TRCT-' || left(v_row.id::text, 8),
                                       'valor', v_row.valor_liquido, 'status', 'emitido'),
            'grrf_pendente', v_multa > 0,
            'grrf_valor', CASE WHEN v_multa > 0 THEN v_multa END
          ));

  RETURN v_row;
END;
$function$
