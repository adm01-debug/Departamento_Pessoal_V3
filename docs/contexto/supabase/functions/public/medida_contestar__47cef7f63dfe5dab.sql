CREATE OR REPLACE FUNCTION public.medida_contestar(_medida_id uuid, _texto text)
 RETURNS medidas_disciplinares
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.medidas_disciplinares;
  v_user uuid := auth.uid();
  v_colab_user uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _texto IS NULL OR length(btrim(_texto)) < 10 THEN
    RAISE EXCEPTION 'contestacao_texto_minimo_10_chars';
  END IF;

  SELECT * INTO v_row FROM public.medidas_disciplinares WHERE id = _medida_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida_nao_encontrada'; END IF;

  SELECT c.user_id INTO v_colab_user FROM public.colaboradores c WHERE c.id = v_row.colaborador_id;
  IF v_colab_user IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'apenas_o_colaborador_pode_contestar';
  END IF;

  IF v_row.status_workflow <> 'aplicada' THEN
    RAISE EXCEPTION 'medida_nao_esta_aplicada';
  END IF;

  IF v_row.contestacao_prazo_ate IS NOT NULL AND now() > v_row.contestacao_prazo_ate THEN
    RAISE EXCEPTION 'prazo_contestacao_expirado';
  END IF;

  UPDATE public.medidas_disciplinares SET
    status_workflow = 'contestada',
    contestacao_texto = _texto,
    contestacao_data = now()
  WHERE id = _medida_id
  RETURNING * INTO v_row;

  INSERT INTO public.medidas_disciplinares_workflow_log(medida_id, empresa_id, actor_user_id, from_status, to_status, acao, observacao)
  VALUES (_medida_id, v_row.empresa_id, v_user, 'aplicada', 'contestada', 'contestar', left(_texto, 500));

  RETURN v_row;
END;
$function$
