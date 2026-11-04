CREATE OR REPLACE FUNCTION public.medida_registrar_ciencia_publica(p_token text, p_acao text, p_motivo_recusa text DEFAULT NULL::text, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_geo jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_tok RECORD;
  v_hash TEXT;
BEGIN
  IF p_acao NOT IN ('ciencia','recusa') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  SELECT * INTO v_tok FROM public.medidas_ciencia_tokens
  WHERE token = p_token AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;

  IF p_acao = 'recusa' AND (p_motivo_recusa IS NULL OR length(trim(p_motivo_recusa)) < 10) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo de recusa obrigatório (mín. 10 caracteres)');
  END IF;

  v_hash := encode(digest(
    v_tok.token || '|' || p_acao || '|' || coalesce(p_motivo_recusa,'') || '|' || now()::text || '|' || coalesce(p_ip,''),
    'sha256'
  ), 'hex');

  UPDATE public.medidas_ciencia_tokens
  SET used_at = now(),
      acao = p_acao,
      motivo_recusa = p_motivo_recusa,
      ip_address = p_ip,
      user_agent = p_user_agent,
      geolocation = p_geo,
      assinatura_hash = v_hash
  WHERE id = v_tok.id;

  UPDATE public.medidas_disciplinares
  SET colaborador_ciente = (p_acao = 'ciencia'),
      recusa_assinatura = (p_acao = 'recusa'),
      motivo_recusa = CASE WHEN p_acao = 'recusa' THEN p_motivo_recusa ELSE motivo_recusa END,
      data_ciencia = now(),
      assinado_em = CASE WHEN p_acao = 'ciencia' THEN now() ELSE assinado_em END,
      updated_at = now()
  WHERE id = v_tok.medida_id;

  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, acao, executado_por, detalhes)
  VALUES (
    v_tok.medida_id, v_tok.empresa_id,
    'ciencia_' || p_acao,
    NULL,
    jsonb_build_object('token_id', v_tok.id, 'ip', p_ip, 'user_agent', p_user_agent,
                       'hash', v_hash, 'motivo_recusa', p_motivo_recusa)
  );

  INSERT INTO public.notificacoes (user_id, empresa_id, titulo, mensagem, tipo, link)
  SELECT ue.user_id, v_tok.empresa_id,
         CASE WHEN p_acao='ciencia' THEN 'Ciência registrada' ELSE 'Recusa de assinatura registrada' END,
         'Colaborador ' || p_acao || ' via ciência digital.',
         CASE WHEN p_acao='ciencia' THEN 'info' ELSE 'warning' END,
         '/medidas-disciplinares?id=' || v_tok.medida_id
  FROM public.user_empresas ue
  JOIN public.user_roles ur ON ur.user_id = ue.user_id
  WHERE ue.empresa_id = v_tok.empresa_id AND ur.role IN ('admin','rh');

  RETURN jsonb_build_object('success', true, 'acao', p_acao, 'hash', v_hash, 'registrado_em', now());
END; $function$
