CREATE OR REPLACE FUNCTION public.medida_rejeitar(_medida_id uuid, _motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_medida record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'motivo da rejeição obrigatório (mín. 5 caracteres)';
  END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF v_medida.status_workflow NOT IN ('aguardando_gestor','aguardando_rh','aguardando_juridico') THEN
    RAISE EXCEPTION 'só é possível rejeitar medidas em fluxo de aprovação';
  END IF;
  UPDATE public.medidas_disciplinares
     SET status_workflow = 'rejeitada', rejeitado_por = v_uid,
         rejeitado_em = now(), motivo_rejeicao = _motivo, updated_at = now()
   WHERE id = _medida_id;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id, observacao)
    VALUES (_medida_id, v_medida.empresa_id, v_medida.status_workflow, 'rejeitada', 'rejeitar', v_uid, _motivo);
  RETURN jsonb_build_object('ok', true, 'status', 'rejeitada');
END; $function$
