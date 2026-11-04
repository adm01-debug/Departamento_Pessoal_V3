CREATE OR REPLACE FUNCTION public.medida_arquivar(_medida_id uuid, _observacao text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_medida record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF v_medida.status_workflow NOT IN ('aplicada','rejeitada') THEN
    RAISE EXCEPTION 'só é possível arquivar medidas aplicadas ou rejeitadas';
  END IF;
  UPDATE public.medidas_disciplinares
     SET status_workflow = 'arquivada', arquivado_por = v_uid,
         arquivado_em = now(), updated_at = now()
   WHERE id = _medida_id;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id, observacao)
    VALUES (_medida_id, v_medida.empresa_id, v_medida.status_workflow, 'arquivada', 'arquivar', v_uid, _observacao);
  RETURN jsonb_build_object('ok', true, 'status', 'arquivada');
END; $function$
