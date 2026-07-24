-- =============================================================================
-- MELHORIA 13 — Correção de bugs de coluna na migração M8 (170000)
--
-- Detectados via teste exaustivo pós-M8:
--
-- M8.1 🔴 contrato_assinar_por_token: usa 'assinado_user_agent' mas a tabela
--   contrato_assinatura_tokens tem 'assinado_ua' (nome original de 145602).
--   → UPDATE falha com "column assinado_user_agent does not exist"
--
-- M8.2 🔴 contrato_assinar_por_token: armazena p_nome em 'assinado_nome',
--   coluna que não existe na tabela. → UPDATE falha.
--   FIX: ADD COLUMN assinado_nome text + usar coluna correta.
--
-- M8.3 🔴 contrato_consultar_por_token: lê v_tok.nome_signatario mas
--   contrato_assinatura_tokens não tem essa coluna. → runtime error.
--   FIX: retornar campo do colaborador via JOIN em contratos_gerados.
-- =============================================================================

-- M8.2 fix: adicionar coluna assinado_nome (estava sendo referenciada sem existir)
ALTER TABLE public.contrato_assinatura_tokens
  ADD COLUMN IF NOT EXISTS assinado_nome text;

-- Reescrever contrato_assinar_por_token com nomes de coluna corretos
CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(
  p_token       text,
  p_cpf         text,
  p_nome        text,
  p_ip          inet    DEFAULT NULL,
  p_user_agent  text    DEFAULT NULL,
  p_localizacao text    DEFAULT NULL,
  p_dispositivo text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_tok  record;
  v_cg   record;
BEGIN
  v_hash := encode(sha256(p_token::bytea), 'hex');

  SELECT * INTO v_tok
  FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF v_tok IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado ou inválido.';
  END IF;

  -- Bug A2 fix: bloquear token revogado
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token revogado em % (motivo: %).', v_tok.revogado_em,
                    COALESCE(v_tok.revogacao_motivo, 'não informado');
  END IF;

  IF v_tok.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token já utilizado em %.', v_tok.usado_em;
  END IF;

  IF v_tok.expira_em < now() THEN
    RAISE EXCEPTION 'Token expirado em %.', v_tok.expira_em;
  END IF;

  -- Verificar CPF
  IF v_tok.cpf_esperado IS NOT NULL AND v_tok.cpf_esperado <> p_cpf THEN
    UPDATE public.contrato_assinatura_tokens
    SET tentativas = tentativas + 1
    WHERE id = v_tok.id;
    RAISE EXCEPTION 'CPF informado não corresponde ao esperado para este token.';
  END IF;

  -- Buscar contrato
  SELECT * INTO v_cg
  FROM public.contratos_gerados
  WHERE id = v_tok.contrato_id
  FOR UPDATE;

  IF v_cg IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado.';
  END IF;

  -- Marcar token como usado — M8.1 fix: assinado_ua (não assinado_user_agent)
  --                            M8.2 fix: assinado_nome (agora existe via ADD COLUMN)
  UPDATE public.contrato_assinatura_tokens
  SET usado_em      = now(),
      assinado_nome = p_nome,          -- M8.2: coluna adicionada acima
      assinado_ip   = p_ip,
      assinado_ua   = p_user_agent,    -- M8.1: era assinado_user_agent (errado)
      tentativas    = tentativas + 1
  WHERE id = v_tok.id;

  -- Atualizar contrato
  UPDATE public.contratos_gerados
  SET status             = 'assinado',
      assinado_em        = now(),
      assinatura_metadata = jsonb_build_object(
        'cpf',        p_cpf,
        'nome',       p_nome,
        'ip',         p_ip::text,
        'user_agent', p_user_agent,
        'localizacao', p_localizacao,
        'dispositivo', p_dispositivo,
        'assinado_em', now()
      )
  WHERE id = v_cg.id;

  -- Inserir evento
  BEGIN
    INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ip)
    VALUES (v_tok.empresa_id, v_tok.id, v_tok.contrato_id, 'assinado',
            jsonb_build_object('cpf', p_cpf, 'nome', p_nome, 'ip', p_ip::text),
            p_ip);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Registrar em audit_log
  BEGIN
    INSERT INTO public.audit_log_unified(source_table, source_id, empresa_id, action, entity, entity_id, payload, ip_address, user_agent)
    VALUES ('contratos_gerados', v_cg.id, v_cg.empresa_id, 'ASSINAR', 'contrato', v_cg.id::text,
            jsonb_build_object('cpf', p_cpf, 'nome', p_nome), p_ip, p_user_agent);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'sucesso',       true,
    'contrato_id',   v_cg.id,
    'empresa_id',    v_cg.empresa_id,
    'assinado_em',   now(),
    'status',        'assinado'
  );
END;
$$;

-- Reescrever contrato_consultar_por_token — M8.3 fix: remover v_tok.nome_signatario
CREATE OR REPLACE FUNCTION public.contrato_consultar_por_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_tok  record;
  v_cg   record;
  v_tpl  record;
BEGIN
  v_hash := encode(sha256(p_token::bytea), 'hex');

  SELECT * INTO v_tok
  FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash;

  IF v_tok IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado ou inválido.';
  END IF;

  -- Bug A3 fix: bloquear token revogado
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token revogado em % (motivo: %).', v_tok.revogado_em,
                    COALESCE(v_tok.revogacao_motivo, 'não informado');
  END IF;

  IF v_tok.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token já utilizado.';
  END IF;

  IF v_tok.expira_em < now() THEN
    RAISE EXCEPTION 'Token expirado.';
  END IF;

  IF v_tok.tentativas > 20 THEN
    RAISE EXCEPTION 'Muitas tentativas para este token.';
  END IF;

  SELECT * INTO v_cg FROM public.contratos_gerados WHERE id = v_tok.contrato_id;
  IF v_cg IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado.'; END IF;

  SELECT * INTO v_tpl FROM public.contrato_templates WHERE id = v_cg.template_id;

  UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = v_tok.id;

  RETURN jsonb_build_object(
    'contrato_id',      v_cg.id,
    'empresa_id',       v_cg.empresa_id,
    'colaborador_id',   v_cg.colaborador_id,
    'tipo_contrato',    COALESCE(v_tpl.tipo_contrato, 'desconhecido'),
    'status',           v_cg.status,
    -- M8.3 fix: usar email_destinatario (existe) em vez de nome_signatario (não existe)
    'email_destinatario', v_tok.email_destinatario,
    'expira_em',        v_tok.expira_em,
    'html_preview',     v_cg.html_final
  );
END;
$$;
