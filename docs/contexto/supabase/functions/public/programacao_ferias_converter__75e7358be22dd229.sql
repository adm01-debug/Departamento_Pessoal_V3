CREATE OR REPLACE FUNCTION public.programacao_ferias_converter(_id uuid)
 RETURNS ferias
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.ferias_programacao;
  v_ferias public.ferias;
  v_inicio DATE;
  v_fim DATE;
BEGIN
  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas RH/Admin pode converter' USING ERRCODE='42501';
  END IF;
  IF r.status <> 'aprovado_rh' THEN
    RAISE EXCEPTION 'Só é possível converter após aprovação do RH (status atual: %)', r.status USING ERRCODE='22023';
  END IF;
  IF r.ferias_id IS NOT NULL THEN
    RAISE EXCEPTION 'Programação já convertida' USING ERRCODE='22023';
  END IF;

  v_inicio := COALESCE(r.data_inicio_prevista, make_date(r.ano, r.mes_previsto, 1));
  v_fim    := COALESCE(r.data_fim_prevista, (v_inicio + (r.dias_previstos - 1) * INTERVAL '1 day')::date);

  INSERT INTO public.ferias (empresa_id, colaborador_id, periodo_aquisitivo_id, data_inicio, data_fim, dias_abono, status)
  VALUES (r.empresa_id, r.colaborador_id, r.periodo_aquisitivo_id, v_inicio, v_fim, 0, 'pendente')
  RETURNING * INTO v_ferias;

  UPDATE public.ferias_programacao
     SET status = 'convertido', ferias_id = v_ferias.id
   WHERE id = _id;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'CONVERTER', auth.uid(), r.empresa_id,
          jsonb_build_object('ferias_id', v_ferias.id));

  RETURN v_ferias;
END $function$
