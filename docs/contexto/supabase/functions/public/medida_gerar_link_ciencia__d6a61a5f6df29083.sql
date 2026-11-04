CREATE OR REPLACE FUNCTION public.medida_gerar_link_ciencia(p_medida_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_medida RECORD;
  v_token TEXT;
  v_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh')) THEN
    RAISE EXCEPTION 'Sem permissão para gerar link de ciência';
  END IF;

  SELECT id, empresa_id, colaborador_id, status_workflow
  INTO v_medida
  FROM public.medidas_disciplinares
  WHERE id = p_medida_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medida não encontrada';
  END IF;

  IF v_medida.empresa_id NOT IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado à empresa';
  END IF;

  IF v_medida.status_workflow NOT IN ('aplicada','aprovada_rh','aprovada_juridico') THEN
    RAISE EXCEPTION 'Medida deve estar aplicada/aprovada para gerar ciência';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.medidas_ciencia_tokens (medida_id, empresa_id, colaborador_id, token, created_by)
  VALUES (v_medida.id, v_medida.empresa_id, v_medida.colaborador_id, v_token, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'token_id', v_id,
    'expires_at', now() + interval '7 days',
    'url_path', '/ciencia-medida/' || v_token
  );
END; $function$
