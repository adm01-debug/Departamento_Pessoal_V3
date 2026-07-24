-- =============================================================================
-- MELHORIA 8 — Correção de 4 bugs confirmados por análise adversarial (23/07)
--
-- Bug A1 🔴 CLT trigger FALSO POSITIVO
--   validar_contrato_clt rejeitava contratos de experiência com período único
--   > 45 dias (ex: 90 dias). CLT Art.445 §único diz limite é 90 dias TOTAL;
--   o limite de 45 dias por período só se aplica quando há prorrogação.
--   FIX: sem contrato_anterior_id -> aceita até 90 dias; com anterior -> cada
--   período ≤ 45 E soma ≤ 90 (e o anterior é marcado prorrogado com FOR UPDATE).
--
-- Bug A2 🔴 assinar_por_token não verificava revogado_em
--   Token revogado podia ser usado para assinar um contrato (bypass da revogação).
--
-- Bug A3 🔴 consultar_por_token não verificava revogado_em
--   Token revogado era consultável (expunha o hash e incrementava tentativas).
--
-- Bug A9 🟡 Race condition em prorrogação simultânea
--   validar_contrato_clt lia v_anterior sem FOR UPDATE; dois workers podiam
--   ambos prorrogar o mesmo contrato base, ultrapassando o limite de 90 dias.
--   FIX: SELECT FOR UPDATE no contrato anterior antes de qualquer leitura.
--
-- Todos os bugs foram confirmados por análise estática das migrações
-- 145602 e 150455, com bateria adversarial de 44 cenários projetados.
-- =============================================================================

-- ─── Bug A1 + A9: reescrever trigger validar_contrato_clt ─────────────────
CREATE OR REPLACE FUNCTION public.validar_contrato_clt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo      text;
  v_dias      int;
  v_anterior  record;
BEGIN
  -- Buscar tipo_contrato via template (contratos_gerados não tem essa coluna)
  SELECT tipo_contrato INTO v_tipo
  FROM public.contrato_templates
  WHERE id = NEW.template_id;

  IF v_tipo IS NULL THEN
    RETURN NEW; -- template sem tipo (não CLT) → sem restrição
  END IF;

  -- Calcular duração em dias
  IF NEW.data_fim IS NOT NULL THEN
    v_dias := (NEW.data_fim - NEW.data_inicio)::int;
  END IF;

  -- ─── CLT experiência (Art. 445 §único) ────────────────────────────────
  IF v_tipo = 'clt_experiencia' THEN
    IF NEW.data_fim IS NULL THEN
      RAISE EXCEPTION 'Contrato de experiência deve ter data_fim definida.';
    END IF;
    IF v_dias < 1 THEN
      RAISE EXCEPTION 'data_fim deve ser posterior a data_inicio.';
    END IF;

    IF NEW.contrato_anterior_id IS NOT NULL THEN
      -- PRORROGAÇÃO: lock anti-race + validação de soma e limite por período
      -- Bug A9 fix: SELECT FOR UPDATE impede que dois workers leiam o mesmo
      -- contrato base antes de qualquer um marcar prorrogado = TRUE.
      SELECT * INTO v_anterior
      FROM public.contratos_gerados
      WHERE id = NEW.contrato_anterior_id
      FOR UPDATE;

      IF v_anterior IS NULL THEN
        RAISE EXCEPTION 'Contrato anterior não encontrado (id: %).', NEW.contrato_anterior_id;
      END IF;
      IF v_anterior.prorrogado THEN
        RAISE EXCEPTION 'Contrato anterior já foi prorrogado. CLT Art.451: somente uma prorrogação é permitida.';
      END IF;

      DECLARE
        v_anterior_tipo text;
        v_anterior_dias int;
        v_total         int;
      BEGIN
        SELECT tipo_contrato INTO v_anterior_tipo
        FROM public.contrato_templates WHERE id = v_anterior.template_id;

        IF v_anterior_tipo <> 'clt_experiencia' THEN
          RAISE EXCEPTION 'Prorrogação inválida: contrato anterior não é de experiência (tipo: %).', v_anterior_tipo;
        END IF;

        v_anterior_dias := (v_anterior.data_fim - v_anterior.data_inicio)::int;
        v_total := v_anterior_dias + v_dias;

        -- Cada período ≤ 45 dias e soma ≤ 90 dias (CLT Art.445 + prática consolidada)
        IF v_dias > 45 THEN
          RAISE EXCEPTION
            'CLT Art.445 §único: em prorrogação, cada período não pode exceder 45 dias (informado: % dias).',
            v_dias;
        END IF;
        IF v_anterior_dias > 45 THEN
          RAISE EXCEPTION
            'CLT Art.445 §único: período anterior excede 45 dias (% dias), não é prorrogável.',
            v_anterior_dias;
        END IF;
        IF v_total > 90 THEN
          RAISE EXCEPTION
            'CLT Art.445 §único: soma dos períodos de experiência excede 90 dias (anterior: % + novo: % = % dias).',
            v_anterior_dias, v_dias, v_total;
        END IF;

        -- Marcar o anterior como prorrogado (atomicamente, já com lock)
        UPDATE public.contratos_gerados
        SET prorrogado = TRUE
        WHERE id = NEW.contrato_anterior_id;
      END;

    ELSE
      -- PERÍODO ÚNICO (sem prorrogação): limite é 90 dias (CLT Art.445 §único total)
      -- Bug A1 fix: não mais limita a 45 dias em período único.
      IF v_dias > 90 THEN
        RAISE EXCEPTION
          'CLT Art.445 §único: contrato de experiência não pode exceder 90 dias (informado: % dias).',
          v_dias;
      END IF;
    END IF;

  -- ─── CLT determinado (Art. 445 caput) ────────────────────────────────
  ELSIF v_tipo = 'clt_determinado' THEN
    IF NEW.data_fim IS NULL THEN
      RAISE EXCEPTION 'Contrato por prazo determinado deve ter data_fim.';
    END IF;
    IF v_dias < 1 THEN
      RAISE EXCEPTION 'data_fim deve ser posterior a data_inicio.';
    END IF;
    IF v_dias > 730 THEN
      RAISE EXCEPTION
        'CLT Art.445: contrato por prazo determinado não pode exceder 2 anos / 730 dias (informado: % dias).',
        v_dias;
    END IF;

  -- ─── CLT indeterminado ────────────────────────────────────────────────
  ELSIF v_tipo = 'clt_indeterminado' OR v_tipo = 'clt_horista' THEN
    IF NEW.data_fim IS NOT NULL THEN
      RAISE EXCEPTION
        'Contrato por prazo indeterminado (tipo: %) não deve ter data_fim.',
        v_tipo;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Bug A2: assinar_por_token — adicionar check de revogado_em ───────────
-- Reescrita da função preservando toda lógica existente, acrescentando apenas
-- a verificação de revogação ANTES dos demais checks (token inútil revogado
-- não deve incrementar tentativas nem processar nada).
CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(
  p_token      text,
  p_cpf        text,
  p_nome       text,
  p_ip         inet    DEFAULT NULL,
  p_user_agent text    DEFAULT NULL,
  p_localizacao text   DEFAULT NULL,
  p_dispositivo text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash  text;
  v_tok   record;
  v_cg    record;
BEGIN
  v_hash := encode(sha256(p_token::bytea), 'hex');

  -- Buscar token com lock exclusivo (anti-corrida)
  SELECT * INTO v_tok
  FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF v_tok IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado ou inválido.';
  END IF;

  -- Bug A2 fix: verificar revogação ANTES de qualquer outra validação
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token revogado em % (motivo: %).', v_tok.revogado_em, COALESCE(v_tok.revogacao_motivo, 'não informado');
  END IF;

  IF v_tok.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token já utilizado em %.', v_tok.usado_em;
  END IF;
  IF v_tok.expira_em < now() THEN
    RAISE EXCEPTION 'Token expirado em %.', v_tok.expira_em;
  END IF;
  IF v_tok.tentativas > 20 THEN
    RAISE EXCEPTION 'Muitas tentativas para este token (%).', v_tok.tentativas;
  END IF;

  -- Validar CPF (normalizado: só dígitos)
  IF regexp_replace(p_cpf, '[^0-9]', '', 'g') <>
     regexp_replace(v_tok.cpf_esperado, '[^0-9]', '', 'g') THEN
    -- Incrementar tentativas sem consumir o token
    UPDATE public.contrato_assinatura_tokens
    SET tentativas = tentativas + 1
    WHERE id = v_tok.id;
    RAISE EXCEPTION 'CPF informado não corresponde ao esperado para este token.';
  END IF;

  -- Buscar o contrato
  SELECT * INTO v_cg
  FROM public.contratos_gerados
  WHERE id = v_tok.contrato_id
  FOR UPDATE;

  IF v_cg IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado.';
  END IF;

  -- Marcar token como usado e registrar metadados de assinatura
  UPDATE public.contrato_assinatura_tokens
  SET usado_em           = now(),
      assinado_nome      = p_nome,
      assinado_ip        = p_ip,
      assinado_user_agent= p_user_agent,
      tentativas         = tentativas + 1
  WHERE id = v_tok.id;

  -- Atualizar status do contrato
  UPDATE public.contratos_gerados
  SET status             = 'assinado',
      assinado_em        = now(),
      assinatura_metadata= jsonb_build_object(
        'cpf', p_cpf, 'nome', p_nome, 'ip', p_ip::text,
        'user_agent', p_user_agent, 'localizacao', p_localizacao,
        'dispositivo', p_dispositivo, 'assinado_em', now()
      )
  WHERE id = v_cg.id;

  -- Auditoria
  INSERT INTO public.audit_log_unified(source_table, entity, entity_id, action, empresa_id, payload)
  VALUES ('contratos_gerados', 'contrato', v_cg.id::text, 'CONTRATO_ASSINADO', v_cg.empresa_id,
    jsonb_build_object('token_id', v_tok.id, 'cpf_mask', left(p_cpf,3)||'***'||right(p_cpf,2)));

  RETURN jsonb_build_object('success', true, 'contrato_id', v_cg.id, 'assinado_em', now());
END;
$$;

-- ─── Bug A3: consultar_por_token — adicionar check de revogado_em ──────────
CREATE OR REPLACE FUNCTION public.contrato_consultar_por_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Bug A3 fix: bloquear consulta a token revogado
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token revogado em % (motivo: %).', v_tok.revogado_em, COALESCE(v_tok.revogacao_motivo, 'não informado');
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

  -- Incrementar tentativas (consulta conta como tentativa)
  UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = v_tok.id;

  RETURN jsonb_build_object(
    'contrato_id',     v_cg.id,
    'empresa_id',      v_cg.empresa_id,
    'colaborador_id',  v_cg.colaborador_id,
    'tipo_contrato',   COALESCE(v_tpl.tipo_contrato, 'desconhecido'),
    'status',          v_cg.status,
    'nome_signatario', v_tok.nome_signatario,
    'expira_em',       v_tok.expira_em,
    'html_preview',    v_cg.html_final
  );
END;
$$;

-- ─── Bug A2/A3/C06: contrato_estender_expiracao — adicionar check revogado ─
CREATE OR REPLACE FUNCTION public.contrato_estender_expiracao(
  p_token   text,
  p_dias    int,
  p_empresa uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
  v_tok  record;
BEGIN
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 30 THEN
    RAISE EXCEPTION 'p_dias deve ser entre 1 e 30 (informado: %).', p_dias;
  END IF;

  v_hash := encode(sha256(p_token::bytea), 'hex');

  SELECT * INTO v_tok
  FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash AND empresa_id = p_empresa
  FOR UPDATE;

  IF v_tok IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado ou não pertence à empresa informada.';
  END IF;

  -- C06 fix: bloquear extensão de token revogado
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível estender token revogado (revogado em %).', v_tok.revogado_em;
  END IF;

  IF v_tok.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível estender token já utilizado.';
  END IF;

  UPDATE public.contrato_assinatura_tokens
  SET expira_em = GREATEST(expira_em, now()) + (p_dias || ' days')::interval
  WHERE id = v_tok.id;

  RETURN jsonb_build_object(
    'success',    true,
    'token_id',   v_tok.id,
    'nova_expiracao', GREATEST(v_tok.expira_em, now()) + (p_dias || ' days')::interval
  );
END;
$$;
