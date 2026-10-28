-- pagar_desligamento transacional e chamável pelo RH.
-- A versão de 20260719000000 exigia is_admin(auth.uid()) e foi revogada para
-- service_role (20260722125517): auth.uid() é NULL sob service_role, então a
-- RPC ficou inalcançável e o front seguiu fazendo dois writes não-atômicos
-- (desligamentos + colaboradores, com erro do segundo só logado).
-- Esta versão: (a) autoriza por tenant via pode_gerir_rh(empresa_id), o mesmo
-- padrão das RPCs de claim eSocial; (b) desativa o colaborador na MESMA
-- transação; (c) grava etapa='finalizado' (valor real do stepper — 'concluido'
-- não existia). As travas da migration original (status homologado + duas
-- assinaturas + FOR UPDATE) são mantidas.
CREATE OR REPLACE FUNCTION public.pagar_desligamento(_desligamento_id UUID, _comprovante_url TEXT DEFAULT NULL)
RETURNS public.desligamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL OR NOT public.pode_gerir_rh(v_row.empresa_id) THEN
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

  -- Registro documental mínimo nas tabelas antes órfãs `trct`/`grrf`:
  -- a quitação registra o TRCT emitido (o PDF assinado é evidência da
  -- homologação) e a obrigação de guia GRRF quando há multa FGTS — a
  -- emissão da guia em si segue manual (Caixa/FGTS Digital), então a grrf
  -- fica 'pendente' até baixa manual com arquivo_url da guia.
  INSERT INTO public.trct (empresa_id, colaborador_id, numero, descricao, valor, data_emissao, status, observacoes)
  VALUES (v_row.empresa_id, v_row.colaborador_id,
          'TRCT-' || left(v_row.id::text, 8),
          'Termo de Rescisão do Contrato de Trabalho',
          v_row.valor_liquido, CURRENT_DATE, 'emitido',
          'desligamento_id=' || v_row.id::text);

  IF COALESCE((v_row.detalhes_calculo->>'multaFGTS')::numeric, 0) > 0 THEN
    INSERT INTO public.grrf (empresa_id, colaborador_id, numero, descricao, valor, data_emissao, status, observacoes)
    VALUES (v_row.empresa_id, v_row.colaborador_id,
            'GRRF-' || left(v_row.id::text, 8),
            'Guia de Recolhimento Rescisório do FGTS (multa 40%/20%)',
            (v_row.detalhes_calculo->>'multaFGTS')::numeric, CURRENT_DATE, 'pendente',
            'Emitir na Caixa/FGTS Digital; desligamento_id=' || v_row.id::text);
  END IF;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', auth.uid(),
          jsonb_build_object(
            'action', 'pagar_desligamento',
            'comprovante_url', _comprovante_url,
            'empresa_id', v_row.empresa_id,
            'colaborador_id', v_row.colaborador_id
          ));

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.pagar_desligamento(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagar_desligamento(UUID, TEXT) TO authenticated, service_role;
