
-- RPCs para resolver divergências AFDT com auditoria
-- 1) Resolver divergência (ignorar com motivo)
CREATE OR REPLACE FUNCTION public.resolver_divergencia_afdt(
  _divergencia_id uuid,
  _observacao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.afdt_divergencias WHERE id = _divergencia_id;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Divergência não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = v_empresa) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;

  UPDATE public.afdt_divergencias
     SET resolvido = true,
         observacao = COALESCE(_observacao, observacao)
   WHERE id = _divergencia_id;

  INSERT INTO public.trilha_auditoria_ponto (empresa_id, colaborador_id, acao, detalhes, executado_por)
  SELECT empresa_id, colaborador_id, 'divergencia_afdt_resolvida',
         jsonb_build_object('divergencia_id', _divergencia_id, 'observacao', _observacao),
         auth.uid()
    FROM public.afdt_divergencias WHERE id = _divergencia_id;
END; $$;

REVOKE ALL ON FUNCTION public.resolver_divergencia_afdt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_divergencia_afdt(uuid, text) TO authenticated;

-- 2) Criar batida a partir da divergência (sem_batida)
CREATE OR REPLACE FUNCTION public.criar_batida_da_divergencia_afdt(
  _divergencia_id uuid,
  _tipo text DEFAULT 'entrada'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_div public.afdt_divergencias%ROWTYPE;
  v_batida_id uuid;
  v_next_ordem int;
BEGIN
  SELECT * INTO v_div FROM public.afdt_divergencias WHERE id = _divergencia_id;
  IF v_div.id IS NULL THEN RAISE EXCEPTION 'Divergência não encontrada'; END IF;
  IF v_div.tipo <> 'sem_batida' THEN RAISE EXCEPTION 'Apenas divergências sem_batida podem gerar batida'; END IF;
  IF v_div.colaborador_id IS NULL OR v_div.data_hora_afdt IS NULL THEN
    RAISE EXCEPTION 'Divergência incompleta (colaborador ou timestamp ausente)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = v_div.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;

  SELECT COALESCE(MAX(ordem), 0) + 1 INTO v_next_ordem
    FROM public.batidas_ponto
   WHERE colaborador_id = v_div.colaborador_id
     AND data = (v_div.data_hora_afdt AT TIME ZONE 'America/Sao_Paulo')::date;

  INSERT INTO public.batidas_ponto (
    colaborador_id, empresa_id, data, hora, ordem, tipo, origem,
    ajustado, ajustado_por, motivo_ajuste
  ) VALUES (
    v_div.colaborador_id, v_div.empresa_id,
    (v_div.data_hora_afdt AT TIME ZONE 'America/Sao_Paulo')::date,
    (v_div.data_hora_afdt AT TIME ZONE 'America/Sao_Paulo')::time,
    v_next_ordem, _tipo, 'afdt_reconciliacao',
    true, auth.uid()::text, 'Criada a partir de AFDT (divergência ' || _divergencia_id || ')'
  ) RETURNING id INTO v_batida_id;

  UPDATE public.afdt_divergencias
     SET resolvido = true, batida_id = v_batida_id,
         observacao = COALESCE(observacao, '') || ' [batida criada: ' || v_batida_id || ']'
   WHERE id = _divergencia_id;

  INSERT INTO public.trilha_auditoria_ponto (empresa_id, colaborador_id, acao, detalhes, executado_por)
  VALUES (v_div.empresa_id, v_div.colaborador_id, 'batida_criada_via_afdt',
          jsonb_build_object('divergencia_id', _divergencia_id, 'batida_id', v_batida_id, 'tipo', _tipo),
          auth.uid());

  RETURN v_batida_id;
END; $$;

REVOKE ALL ON FUNCTION public.criar_batida_da_divergencia_afdt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_batida_da_divergencia_afdt(uuid, text) TO authenticated;

-- 3) Associar PIS a colaborador (para divergências sem_colaborador)
CREATE OR REPLACE FUNCTION public.associar_pis_colaborador_afdt(
  _divergencia_id uuid,
  _colaborador_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.associar_pis_colaborador_afdt(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.associar_pis_colaborador_afdt(uuid, uuid) TO authenticated;

-- Índice adicional para busca por PIS não resolvido
DO $$
BEGIN
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_afdt_div_pis_unresolved ON public.afdt_divergencias(empresa_id, pis) WHERE resolvido = false AND colaborador_id IS NULL';
EXCEPTION WHEN others THEN
  NULL;
END $$;
