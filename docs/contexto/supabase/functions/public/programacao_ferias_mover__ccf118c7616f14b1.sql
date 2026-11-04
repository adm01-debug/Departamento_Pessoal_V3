CREATE OR REPLACE FUNCTION public.programacao_ferias_mover(_id uuid, _novo_mes integer, _nova_data_inicio date DEFAULT NULL::date)
 RETURNS TABLE(programacao ferias_programacao, aviso text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.ferias_programacao;
  v_aviso TEXT := NULL;
  v_limite DATE;
BEGIN
  IF _novo_mes < 1 OR _novo_mes > 12 THEN
    RAISE EXCEPTION 'mês inválido' USING ERRCODE='22023';
  END IF;

  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF r.status IN ('convertido','cancelado','rejeitado') THEN
    RAISE EXCEPTION 'Não é possível mover programação no status %', r.status USING ERRCODE='22023';
  END IF;

  -- Aviso: Art. 137 CLT (dobra) — se período aquisitivo tem data_limite_concessao anterior ao fim do novo mês
  IF r.periodo_aquisitivo_id IS NOT NULL THEN
    SELECT data_limite_concessao INTO v_limite
      FROM public.periodos_aquisitivos WHERE id = r.periodo_aquisitivo_id;
    IF v_limite IS NOT NULL AND make_date(r.ano, _novo_mes, 1) > v_limite THEN
      v_aviso := 'Atenção: mês selecionado ultrapassa a data limite de concessão (Art. 137 CLT — férias em dobra).';
    END IF;
  END IF;

  UPDATE public.ferias_programacao
     SET mes_previsto = _novo_mes,
         data_inicio_prevista = COALESCE(_nova_data_inicio, NULL),
         data_fim_prevista = CASE
           WHEN _nova_data_inicio IS NOT NULL THEN (_nova_data_inicio + (r.dias_previstos - 1) * INTERVAL '1 day')::date
           ELSE NULL END
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'MOVER', auth.uid(), r.empresa_id,
          jsonb_build_object('novo_mes', _novo_mes, 'nova_data_inicio', _nova_data_inicio, 'aviso', v_aviso));

  programacao := r; aviso := v_aviso; RETURN NEXT;
END $function$
