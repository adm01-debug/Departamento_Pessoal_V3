CREATE OR REPLACE FUNCTION public.criar_batida_da_divergencia_afdt(_divergencia_id uuid, _tipo text DEFAULT 'entrada'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
