-- 1) Coluna de hash + backfill idempotente
ALTER TABLE public.medidas_ciencia_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

UPDATE public.medidas_ciencia_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Descarta tokens legados irrecuperáveis (nenhum em base, mas mantém a invariante)
DELETE FROM public.medidas_ciencia_tokens WHERE token_hash IS NULL;

ALTER TABLE public.medidas_ciencia_tokens ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE public.medidas_ciencia_tokens DROP COLUMN token;

CREATE UNIQUE INDEX IF NOT EXISTS uq_medidas_ciencia_tokens_hash
  ON public.medidas_ciencia_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_medidas_ciencia_tokens_ativos
  ON public.medidas_ciencia_tokens (expires_at) WHERE used_at IS NULL;

-- 2) Remove políticas anônimas (RPCs SECURITY DEFINER não dependem delas)
DROP POLICY IF EXISTS "Validação pública por token (anon consulta)" ON public.medidas_ciencia_tokens;
DROP POLICY IF EXISTS "Registro público de ciência via token" ON public.medidas_ciencia_tokens;
REVOKE ALL ON public.medidas_ciencia_tokens FROM anon;

-- 3) Geração: guarda apenas o hash, devolve o token só uma vez ao chamador
CREATE OR REPLACE FUNCTION public.medida_gerar_link_ciencia(p_medida_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.medidas_ciencia_tokens
    (medida_id, empresa_id, colaborador_id, token_hash, created_by)
  VALUES
    (v_medida.id, v_medida.empresa_id, v_medida.colaborador_id,
     encode(digest(v_token, 'sha256'), 'hex'), auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'token_id', v_id,
    'expires_at', now() + interval '7 days',
    'url_path', '/ciencia-medida/' || v_token
  );
END;
$$;

-- 4) Consulta pública: lookup por hash
CREATE OR REPLACE FUNCTION public.medida_consultar_por_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_medida_id UUID;
  v_hash TEXT;
BEGIN
  v_hash := encode(digest(coalesce(p_token,''), 'sha256'), 'hex');

  IF NOT public.check_ciencia_rate_limit('medida_consultar_por_token', left(v_hash, 16)) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Muitas tentativas. Aguarde 10 minutos.';
  END IF;

  SELECT medida_id INTO v_medida_id
  FROM public.medidas_ciencia_tokens
  WHERE token_hash = v_hash
    AND expires_at > now()
    AND used_at IS NULL;

  IF v_medida_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'token_invalid_or_expired');
  END IF;

  SELECT jsonb_build_object(
    'valid', true,
    'medida_id', md.id,
    'tipo', md.tipo,
    'motivo', md.motivo,
    'descricao', md.descricao,
    'data_ocorrencia', md.data_ocorrencia,
    'empresa_nome', e.nome_fantasia,
    'colaborador_nome', c.nome_completo
  ) INTO v_result
  FROM public.medidas_disciplinares md
  JOIN public.colaboradores c ON c.id = md.colaborador_id
  JOIN public.empresas e ON e.id = md.empresa_id
  WHERE md.id = v_medida_id;

  RETURN v_result;
END;
$$;

-- 5) Registro público: lookup por hash + assinatura derivada do hash
CREATE OR REPLACE FUNCTION public.medida_registrar_ciencia_publica(
  p_token text,
  p_acao text,
  p_motivo_recusa text DEFAULT NULL::text,
  p_ip text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text,
  p_geo jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tok RECORD;
  v_hash TEXT;
  v_lookup TEXT;
BEGIN
  IF p_acao NOT IN ('ciencia','recusa') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  v_lookup := encode(digest(coalesce(p_token,''), 'sha256'), 'hex');

  IF NOT public.check_ciencia_rate_limit('medida_registrar_ciencia_publica', left(v_lookup, 16)) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Muitas tentativas. Aguarde 10 minutos.';
  END IF;

  SELECT * INTO v_tok FROM public.medidas_ciencia_tokens
  WHERE token_hash = v_lookup AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;

  IF p_acao = 'recusa' AND (p_motivo_recusa IS NULL OR length(trim(p_motivo_recusa)) < 10) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo de recusa obrigatório (mín. 10 caracteres)');
  END IF;

  v_hash := encode(digest(
    v_tok.token_hash || '|' || p_acao || '|' || coalesce(p_motivo_recusa,'') || '|' || now()::text || '|' || coalesce(p_ip,''),
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
END;
$$;
