CREATE OR REPLACE FUNCTION public.medida_aprovar(_medida_id uuid, _observacao text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_medida record; v_uid uuid := auth.uid(); v_prox text; v_requer_juridico boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  v_requer_juridico := v_medida.tipo IN ('suspensao','justa_causa')
                    OR v_medida.gravidade IN ('grave','gravissima');
  IF v_medida.status_workflow = 'aguardando_gestor' THEN
    v_prox := 'aguardando_rh';
    UPDATE public.medidas_disciplinares
       SET status_workflow = v_prox, aprovado_gestor_por = v_uid,
           aprovado_gestor_em = now(), updated_at = now()
     WHERE id = _medida_id;
  ELSIF v_medida.status_workflow = 'aguardando_rh' THEN
    v_prox := CASE WHEN v_requer_juridico THEN 'aguardando_juridico' ELSE 'aplicada' END;
    UPDATE public.medidas_disciplinares
       SET status_workflow = v_prox, aprovado_rh_por = v_uid, aprovado_rh_em = now(),
           data_aprovacao = COALESCE(data_aprovacao, now()),
           aprovador_id = COALESCE(aprovador_id, v_uid), updated_at = now()
     WHERE id = _medida_id;
  ELSIF v_medida.status_workflow = 'aguardando_juridico' THEN
    v_prox := 'aplicada';
    UPDATE public.medidas_disciplinares
       SET status_workflow = v_prox, aprovado_juridico_por = v_uid,
           aprovado_juridico_em = now(), updated_at = now()
     WHERE id = _medida_id;
  ELSE
    RAISE EXCEPTION 'status atual não permite aprovação (%)', v_medida.status_workflow;
  END IF;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id, observacao)
    VALUES (_medida_id, v_medida.empresa_id, v_medida.status_workflow, v_prox, 'aprovar', v_uid, _observacao);
  RETURN jsonb_build_object('ok', true, 'status', v_prox);
END; $function$
