
-- =========================================================================
-- FÁBRICA DE CONTRATOS v2 — Assinatura digital + travas CLT Art. 445
-- =========================================================================

-- 1) Rastreamento de vigência e tipo de prazo (CLT Art. 443, 445, 451)
ALTER TABLE public.contratos_gerados
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_fim DATE,
  ADD COLUMN IF NOT EXISTS prorrogado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contrato_anterior_id UUID REFERENCES public.contratos_gerados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alerta_vencimento_enviado_em TIMESTAMPTZ;

-- Backfill de data_inicio a partir da admissão (se disponível)
UPDATE public.contratos_gerados cg
SET data_inicio = a.data_prevista
FROM public.admissoes a
WHERE cg.admissao_id = a.id AND cg.data_inicio IS NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_gerados_vencimento
  ON public.contratos_gerados (data_fim)
  WHERE data_fim IS NOT NULL AND status IN ('gerado','enviado','assinado');

-- 2) Trigger de validação CLT (Art. 445 - máx 2 anos; experiência 45+45)
CREATE OR REPLACE FUNCTION public.validar_contrato_clt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo TEXT;
  v_dias INTEGER;
  v_anterior_dias INTEGER;
BEGIN
  SELECT tipo_contrato INTO v_tipo FROM public.contrato_templates WHERE id = NEW.template_id;

  IF NEW.data_inicio IS NOT NULL AND NEW.data_fim IS NOT NULL THEN
    v_dias := (NEW.data_fim - NEW.data_inicio);

    IF v_dias < 0 THEN
      RAISE EXCEPTION 'CLT: data_fim não pode ser anterior a data_inicio';
    END IF;

    -- Experiência: máx 45 dias por período, 90 no total (Art. 445 §único)
    IF v_tipo = 'clt_experiencia' THEN
      IF v_dias > 45 THEN
        RAISE EXCEPTION 'CLT Art. 445 §único: contrato de experiência não pode exceder 45 dias por período (informado: % dias)', v_dias;
      END IF;

      IF NEW.contrato_anterior_id IS NOT NULL THEN
        SELECT (data_fim - data_inicio) INTO v_anterior_dias
        FROM public.contratos_gerados WHERE id = NEW.contrato_anterior_id;

        IF COALESCE(v_anterior_dias,0) + v_dias > 90 THEN
          RAISE EXCEPTION 'CLT Art. 445 §único: soma dos períodos de experiência (45+45) não pode exceder 90 dias';
        END IF;

        -- Marca o anterior como prorrogado
        UPDATE public.contratos_gerados SET prorrogado = TRUE WHERE id = NEW.contrato_anterior_id;
      END IF;
    END IF;

    -- Determinado: máx 2 anos (Art. 445 caput)
    IF v_tipo = 'clt_determinado' AND v_dias > 730 THEN
      RAISE EXCEPTION 'CLT Art. 445: contrato por prazo determinado não pode exceder 2 anos';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_contrato_clt ON public.contratos_gerados;
CREATE TRIGGER trg_validar_contrato_clt
  BEFORE INSERT OR UPDATE OF data_inicio, data_fim, contrato_anterior_id
  ON public.contratos_gerados
  FOR EACH ROW EXECUTE FUNCTION public.validar_contrato_clt();

-- 3) Tabela de tokens públicos de assinatura (padrão medidas ciência)
CREATE TABLE IF NOT EXISTS public.contrato_assinatura_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos_gerados(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  cpf_esperado TEXT,
  email_destinatario TEXT,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  assinado_ip INET,
  assinado_ua TEXT,
  assinatura_hash TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contrato_assinatura_tokens TO authenticated;
GRANT ALL ON public.contrato_assinatura_tokens TO service_role;

ALTER TABLE public.contrato_assinatura_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_tokens_read" ON public.contrato_assinatura_tokens
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "contrato_tokens_write" ON public.contrato_assinatura_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
  );

CREATE INDEX IF NOT EXISTS idx_contrato_tokens_contrato ON public.contrato_assinatura_tokens(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_tokens_expira ON public.contrato_assinatura_tokens(expira_em) WHERE usado_em IS NULL;

-- 4) RPC pública para gerar token de assinatura (chamada pelo painel)
CREATE OR REPLACE FUNCTION public.contrato_gerar_token_assinatura(
  p_contrato_id UUID,
  p_email TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_validade_dias INTEGER DEFAULT 7
)
RETURNS TABLE(token TEXT, expira_em TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_status TEXT;
  v_token TEXT;
  v_hash TEXT;
  v_exp TIMESTAMPTZ;
BEGIN
  SELECT empresa_id, status INTO v_empresa, v_status
  FROM public.contratos_gerados WHERE id = p_contrato_id;

  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;

  IF NOT public.user_belongs_to_empresa(auth.uid(), v_empresa)
    OR NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
  THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_status = 'assinado' THEN RAISE EXCEPTION 'Contrato já assinado'; END IF;
  IF v_status = 'cancelado' THEN RAISE EXCEPTION 'Contrato cancelado'; END IF;

  -- Token de 32 chars, retornado apenas uma vez em claro; armazena SHA-256
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := regexp_replace(v_token, '[^A-Za-z0-9]', '', 'g');
  v_token := substr(v_token || encode(gen_random_bytes(12),'hex'), 1, 32);
  v_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_exp := now() + make_interval(days => GREATEST(1, LEAST(30, p_validade_dias)));

  INSERT INTO public.contrato_assinatura_tokens(
    contrato_id, empresa_id, token_hash, cpf_esperado, email_destinatario, expira_em, created_by
  ) VALUES (p_contrato_id, v_empresa, v_hash, p_cpf, p_email, v_exp, auth.uid());

  UPDATE public.contratos_gerados SET status = 'enviado' WHERE id = p_contrato_id AND status = 'gerado';

  RETURN QUERY SELECT v_token, v_exp;
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_gerar_token_assinatura(UUID,TEXT,TEXT,INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contrato_gerar_token_assinatura(UUID,TEXT,TEXT,INTEGER) TO authenticated;

-- 5) RPC pública (sem login) para consultar contrato pelo token
CREATE OR REPLACE FUNCTION public.contrato_consultar_por_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_tok RECORD;
  v_c RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RAISE EXCEPTION 'Token inválido'; END IF;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_tok FROM public.contrato_assinatura_tokens WHERE token_hash = v_hash;
  IF v_tok IS NULL THEN RAISE EXCEPTION 'Token não encontrado'; END IF;
  IF v_tok.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado'; END IF;
  IF v_tok.expira_em < now() THEN RAISE EXCEPTION 'Token expirado'; END IF;
  IF v_tok.tentativas > 20 THEN RAISE EXCEPTION 'Muitas tentativas'; END IF;

  UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = v_tok.id;

  SELECT id, empresa_id, status, sha256, storage_path, data_inicio, data_fim, template_id
    INTO v_c FROM public.contratos_gerados WHERE id = v_tok.contrato_id;

  RETURN jsonb_build_object(
    'contrato_id', v_c.id,
    'status', v_c.status,
    'sha256', v_c.sha256,
    'data_inicio', v_c.data_inicio,
    'data_fim', v_c.data_fim,
    'requer_cpf', (v_tok.cpf_esperado IS NOT NULL),
    'expira_em', v_tok.expira_em
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_consultar_por_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_consultar_por_token(TEXT) TO anon, authenticated;

-- 6) RPC pública para assinar contrato
CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(
  p_token TEXT,
  p_cpf TEXT,
  p_nome_completo TEXT,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_tok RECORD;
  v_assinatura_hash TEXT;
  v_cpf_limpo TEXT;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RAISE EXCEPTION 'Token inválido'; END IF;
  IF p_nome_completo IS NULL OR length(trim(p_nome_completo)) < 5 THEN
    RAISE EXCEPTION 'Nome completo obrigatório';
  END IF;

  v_cpf_limpo := regexp_replace(COALESCE(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf_limpo) <> 11 THEN RAISE EXCEPTION 'CPF inválido'; END IF;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_tok FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash FOR UPDATE;

  IF v_tok IS NULL THEN RAISE EXCEPTION 'Token não encontrado'; END IF;
  IF v_tok.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado'; END IF;
  IF v_tok.expira_em < now() THEN RAISE EXCEPTION 'Token expirado'; END IF;

  IF v_tok.cpf_esperado IS NOT NULL
    AND regexp_replace(v_tok.cpf_esperado, '\D', '', 'g') <> v_cpf_limpo THEN
    RAISE EXCEPTION 'CPF não confere com o destinatário';
  END IF;

  -- Hash de assinatura: contrato_sha256 + cpf + nome + timestamp + ip
  v_assinatura_hash := encode(digest(
    COALESCE((SELECT sha256 FROM public.contratos_gerados WHERE id = v_tok.contrato_id),'') ||
    v_cpf_limpo || upper(trim(p_nome_completo)) ||
    now()::text || COALESCE(p_ip::text,''),
    'sha256'
  ), 'hex');

  UPDATE public.contrato_assinatura_tokens
  SET usado_em = now(),
      assinado_ip = p_ip,
      assinado_ua = p_user_agent,
      assinatura_hash = v_assinatura_hash
  WHERE id = v_tok.id;

  UPDATE public.contratos_gerados
  SET status = 'assinado',
      assinado_em = now(),
      assinatura_metadata = jsonb_build_object(
        'cpf', v_cpf_limpo,
        'nome', upper(trim(p_nome_completo)),
        'ip', p_ip::text,
        'user_agent', p_user_agent,
        'assinatura_hash', v_assinatura_hash,
        'assinado_em', now()
      )
  WHERE id = v_tok.contrato_id;

  RETURN jsonb_build_object(
    'success', true,
    'contrato_id', v_tok.contrato_id,
    'assinatura_hash', v_assinatura_hash,
    'assinado_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_assinar_por_token(TEXT,TEXT,TEXT,INET,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_assinar_por_token(TEXT,TEXT,TEXT,INET,TEXT) TO anon, authenticated;

-- 7) View de contratos próximos ao vencimento (D-7)
CREATE OR REPLACE VIEW public.v_contratos_vencendo
WITH (security_invoker = true) AS
SELECT
  cg.id,
  cg.empresa_id,
  cg.admissao_id,
  cg.colaborador_id,
  cg.data_inicio,
  cg.data_fim,
  cg.status,
  cg.prorrogado,
  ct.tipo_contrato,
  ct.nome AS template_nome,
  (cg.data_fim - CURRENT_DATE) AS dias_para_vencer,
  CASE
    WHEN cg.data_fim < CURRENT_DATE THEN 'vencido'
    WHEN (cg.data_fim - CURRENT_DATE) <= 3 THEN 'critico'
    WHEN (cg.data_fim - CURRENT_DATE) <= 7 THEN 'atencao'
    ELSE 'ok'
  END AS severidade
FROM public.contratos_gerados cg
JOIN public.contrato_templates ct ON ct.id = cg.template_id
WHERE cg.data_fim IS NOT NULL
  AND cg.status IN ('gerado','enviado','assinado')
  AND ct.tipo_contrato IN ('clt_experiencia','clt_determinado','estagio','temporario');

GRANT SELECT ON public.v_contratos_vencendo TO authenticated;

-- 8) RPC para gerar notificações D-7 de contratos vencendo (chamada por cron)
CREATE OR REPLACE FUNCTION public.contratos_alertar_vencimentos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT cg.id, cg.empresa_id, cg.data_fim, (cg.data_fim - CURRENT_DATE) AS dias,
           ct.tipo_contrato, ct.nome AS tnome
    FROM public.contratos_gerados cg
    JOIN public.contrato_templates ct ON ct.id = cg.template_id
    WHERE cg.data_fim IS NOT NULL
      AND cg.status IN ('gerado','enviado','assinado')
      AND (cg.data_fim - CURRENT_DATE) BETWEEN 0 AND 7
      AND (cg.alerta_vencimento_enviado_em IS NULL
           OR cg.alerta_vencimento_enviado_em < now() - interval '3 days')
  LOOP
    INSERT INTO public.notificacoes(empresa_id, user_id, tipo, titulo, mensagem, link, prioridade)
    SELECT r.empresa_id, ur.user_id, 'contrato_vencendo',
           'Contrato próximo ao vencimento',
           format('Contrato "%s" vence em %s dia(s) — %s. Prorrogue ou converta antes do prazo para evitar conversão automática em prazo indeterminado (CLT Art. 451).',
                  r.tnome, r.dias, to_char(r.data_fim,'DD/MM/YYYY')),
           format('/admissoes?contrato=%s', r.id),
           CASE WHEN r.dias <= 3 THEN 'alta' ELSE 'media' END
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id AND ue.empresa_id = r.empresa_id
    WHERE ur.role IN ('admin','rh');

    UPDATE public.contratos_gerados SET alerta_vencimento_enviado_em = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.contratos_alertar_vencimentos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contratos_alertar_vencimentos() TO service_role;

-- 9) Cron diário 08:00 BRT (11:00 UTC)
SELECT cron.unschedule('contratos-alertar-vencimentos') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'contratos-alertar-vencimentos'
);

SELECT cron.schedule(
  'contratos-alertar-vencimentos',
  '0 11 * * *',
  $$SELECT public.contratos_alertar_vencimentos();$$
);
