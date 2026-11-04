CREATE OR REPLACE FUNCTION public.associar_pis_colaborador_afdt(_divergencia_id uuid, _colaborador_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_div public.afdt_divergencias%ROWTYPE;
  v_colab_empresa uuid;
BEGIN
  SELECT * INTO v_div FROM public.afdt_divergencias WHERE id = _divergencia_id;
  IF v_div.id IS NULL THEN RAISE EXCEPTION 'Divergência não encontrada'; END IF;
  IF v_div.pis IS NULL THEN RAISE EXCEPTION 'Divergência sem PIS'; END IF;

  SELECT empresa_id INTO v_colab_empresa FROM public.colaboradores WHERE id = _colaborador_id;
  IF v_colab_empresa IS NULL OR v_colab_empresa <> v_div.empresa_id THEN
    RAISE EXCEPTION 'Colaborador não pertence à empresa da divergência';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = v_div.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;

  -- Atualiza PIS do colaborador apenas se estiver vazio (evita sobrescrever)
  UPDATE public.colaboradores
     SET pis_pasep = v_div.pis
   WHERE id = _colaborador_id
     AND (pis_pasep IS NULL OR pis_pasep = '');

  UPDATE public.afdt_divergencias
     SET colaborador_id = _colaborador_id,
         observacao = COALESCE(observacao, '') || ' [PIS associado ao colaborador ' || _colaborador_id || ']'
   WHERE id = _divergencia_id;

  INSERT INTO public.trilha_auditoria_ponto (empresa_id, colaborador_id, acao, detalhes, executado_por)
  VALUES (v_div.empresa_id, _colaborador_id, 'pis_associado_via_afdt',
          jsonb_build_object('divergencia_id', _divergencia_id, 'pis', v_div.pis),
          auth.uid());
END; $function$
