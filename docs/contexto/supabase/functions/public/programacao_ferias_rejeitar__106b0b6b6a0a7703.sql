CREATE OR REPLACE FUNCTION public.programacao_ferias_rejeitar(_id uuid, _motivo text)
 RETURNS ferias_programacao
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.ferias_programacao;
BEGIN
  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  IF r.status IN ('convertido','cancelado') THEN
    RAISE EXCEPTION 'Programação já finalizada: %', r.status USING ERRCODE='22023';
  END IF;

  UPDATE public.ferias_programacao
     SET status = 'rejeitado', rejeitado_por = auth.uid(), rejeitado_em = now(), rejeitado_motivo = _motivo
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'REJEITAR', auth.uid(), r.empresa_id, jsonb_build_object('motivo', _motivo));
  RETURN r;
END $function$
