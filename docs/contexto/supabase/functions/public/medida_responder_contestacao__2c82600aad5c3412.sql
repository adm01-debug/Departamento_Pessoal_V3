CREATE OR REPLACE FUNCTION public.medida_responder_contestacao(_medida_id uuid, _resposta text, _aceita boolean)
 RETURNS medidas_disciplinares
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.medidas_disciplinares;
  v_user uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _resposta IS NULL OR length(btrim(_resposta)) < 10 THEN
    RAISE EXCEPTION 'resposta_minimo_10_chars';
  END IF;

  SELECT * INTO v_row FROM public.medidas_disciplinares WHERE id = _medida_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida_nao_encontrada'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id AND ue.empresa_id = v_row.empresa_id
    WHERE ur.user_id = v_user AND ur.role IN ('admin','rh')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'apenas_rh_ou_admin_pode_responder';
  END IF;

  IF v_row.status_workflow <> 'contestada' THEN
    RAISE EXCEPTION 'medida_nao_esta_contestada';
  END IF;

  UPDATE public.medidas_disciplinares SET
    contestacao_resposta = _resposta,
    contestacao_respondida_em = now(),
    contestacao_respondida_por = v_user,
    contestacao_aceita = _aceita,
    status_workflow = CASE WHEN _aceita THEN 'arquivada' ELSE 'aplicada' END
  WHERE id = _medida_id
  RETURNING * INTO v_row;

  INSERT INTO public.medidas_disciplinares_workflow_log(medida_id, empresa_id, actor_user_id, from_status, to_status, acao, observacao)
  VALUES (_medida_id, v_row.empresa_id, v_user, 'contestada', v_row.status_workflow,
    CASE WHEN _aceita THEN 'contestacao_aceita' ELSE 'contestacao_rejeitada' END,
    left(_resposta, 500));

  RETURN v_row;
END;
$function$
