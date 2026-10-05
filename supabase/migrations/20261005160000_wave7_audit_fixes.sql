-- =============================================================================
-- Onda 7 — correções da validação adversarial pós-onda-6
--
-- 1. record_pii_access: IP da trilha LGPD era split_part(xff,',',1) — o
--    PRIMEIRO elemento, que o cliente forja livremente. Agora usa o ÚLTIMO
--    elemento de XFF (o que o gateway/PostgREST anexa — peer real).
-- 2. pii_access_logs: service_role tinha DELETE numa trilha declarada
--    imutável → revoga DELETE (SELECT+INSERT bastam).
-- 3. admin_list_profiles: pg_default_acl deixa EXECUTE para anon — revoga
--    explicitamente (o gate interno já exige is_admin; é defesa em profundidade).
-- 4. Tabelas legadas apenas no canônico (eventos_rh, folha_pagamento,
--    ponto_registros, rubricas): RLS OFF + 0 policies + grants abertos de
--    anon/authenticated → RLS ON sem policies (deny-all) + REVOKE. Guardadas
--    por to_regclass — no-op onde não existem.
-- 5. admissao_assinar_contrato: parâmetro _ip era gravado verbatim em
--    ip_assinatura — qualquer anon forjava a evidência de IP da assinatura.
--    Agora deriva o IP server-side do último elemento de request.headers
--    x-forwarded-for (PostgREST expõe os headers via GUC request.headers).
--    O parâmetro _ip é mantido apenas por compatibilidade de assinatura e
--    passa a ser IGNORADO (exceto quando o caller é service_role — usos
--    internos legítimos).
-- 6. Default privileges: objetos novos nasciam com arwdDxtm para
--    anon+authenticated (pg_default_acl) — REVOKE FROM PUBLIC não removia
--    isso. Revoga os defaults para que objetos futuros nasçam deny-by-default
--    e dependam de GRANT explícito.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. record_pii_access — IP rightmost de XFF
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_pii_access(
  p_empresa_id uuid,
  p_tabela text,
  p_acao text DEFAULT 'select',
  p_registro_id text DEFAULT NULL,
  p_registro_count integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_headers jsonb := '{}'::jsonb;
  v_xff text := '';
  v_ip text := 'unknown';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_empresa_id IS NULL OR NOT public.user_belongs_to_empresa(v_uid, p_empresa_id) THEN
    RAISE EXCEPTION 'TENANT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_tabela IS NULL OR p_tabela !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'INVALID_TABLE' USING ERRCODE = '22023';
  END IF;
  IF p_acao IS NULL OR p_acao NOT IN ('select', 'export', 'print', 'download') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;
  IF p_registro_count IS NULL OR p_registro_count NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_COUNT' USING ERRCODE = '22023';
  END IF;
  IF p_registro_id IS NOT NULL AND length(p_registro_id) > 256 THEN
    RAISE EXCEPTION 'INVALID_RECORD_ID' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN invalid_text_representation THEN
    v_headers := '{}'::jsonb;
  END;

  -- XFF: o último elemento é o que o gateway anexa (peer TCP real).
  -- split_part(...,1) lia o primeiro — forjável pelo cliente.
  v_xff := COALESCE(v_headers->>'x-forwarded-for', '');
  IF v_xff <> '' THEN
    v_ip := left(btrim(split_part(v_xff, ',', -1)), 64);
  END IF;
  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := 'unknown';
  END IF;

  INSERT INTO public.pii_access_logs (
    user_id, empresa_id, tabela, acao, registro_id, registro_count, ip, user_agent
  ) VALUES (
    v_uid, p_empresa_id, p_tabela, p_acao, p_registro_id, p_registro_count,
    v_ip,
    left(COALESCE(v_headers->>'user-agent', ''), 1024)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_pii_access(uuid, text, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pii_access(uuid, text, text, text, integer)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Trilha LGPD é imutável — service_role não precisa de DELETE
-- ----------------------------------------------------------------------------
REVOKE DELETE ON public.pii_access_logs FROM service_role;

-- ----------------------------------------------------------------------------
-- 3. admin_list_profiles — remove EXECUTE deixado pelo default acl
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regproc('public.admin_list_profiles') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon';
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Tabelas legadas com RLS OFF e grants abertos (só existem no canônico)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN VALUES
    ('eventos_rh'), ('folha_pagamento'), ('ponto_registros'), ('rubricas')
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- Sem policies = deny-all para clientes; service_role ignora RLS.
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. admissao_assinar_contrato — IP derivado server-side
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admissao_assinar_contrato(
  _token TEXT,
  _assinatura_base64 TEXT,
  _ip TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.admissao_tokens;
  v_headers jsonb := '{}'::jsonb;
  v_xff text := '';
  v_ip text := 'unknown';
  v_jwt_role text := '';
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;
  IF _assinatura_base64 IS NULL OR length(_assinatura_base64) < 100 THEN
    RAISE EXCEPTION 'assinatura ausente ou invalida' USING ERRCODE = '22023';
  END IF;

  -- IP: só service_role pode informar _ip explicitamente (chamadas internas
  -- confiáveis). Para anon/authenticated o IP é derivado do último elemento
  -- de x-forwarded-for exposto pelo PostgREST — o caller não forja evidência.
  BEGIN
    v_jwt_role := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := '';
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := left(COALESCE(NULLIF(_ip, ''), 'unknown'), 64);
  ELSE
    BEGIN
      v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    EXCEPTION WHEN invalid_text_representation THEN
      v_headers := '{}'::jsonb;
    END;
    v_xff := COALESCE(v_headers->>'x-forwarded-for', '');
    IF v_xff <> '' THEN
      v_ip := left(btrim(split_part(v_xff, ',', -1)), 64);
    END IF;
    IF v_ip IS NULL OR v_ip = '' THEN
      v_ip := 'unknown';
    END IF;
  END IF;

  UPDATE public.admissao_tokens
  SET contrato_assinado = true,
      assinado_em = now(),
      assinatura_base64 = _assinatura_base64,
      ip_assinatura = v_ip,
      updated_at = now()
  WHERE id = v_token.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admissao_assinar_contrato(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Default privileges — deny-by-default em objetos futuros
--    (pg_default_acl original dava arwdDxtm a anon+authenticated automaticamente)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r text;
BEGIN
  FOR r IN VALUES ('postgres'), ('supabase_admin')
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      -- FOR ROLE exige membership no role-alvo; se o runner não for membro,
      -- loga warning e segue (o revoke vira no-op em vez de abortar o batch).
      BEGIN
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated', r);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated', r);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'default privileges % não alterados: %', r, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. CHECK de formato em folhas_pagamento.competencia (achado #30)
--    NOT VALID: aplica a novos writes sem escanear/rejeitar dados legados.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'folhas_pagamento_competencia_fmt'
  ) THEN
    ALTER TABLE public.folhas_pagamento
      ADD CONSTRAINT folhas_pagamento_competencia_fmt
      CHECK (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$') NOT VALID;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. IP derivado server-side nas RPCs de assinatura/verificação de contrato
--    Mesma classe de bug da seção 5: p_ip fornecido pelo chamador virava
--    evidência legal (assinado_ip / metadata.ip) e chave de rate-limit — ambos
--    forjáveis. Agora honra p_ip só quando o caller é service_role; caso
--    contrário deriva do rightmost XFF que o gateway anexa.
-- ----------------------------------------------------------------------------
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
  v_ip INET;
  v_xff TEXT;
  v_jwt_role TEXT;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RAISE EXCEPTION 'Token inválido'; END IF;
  IF p_nome_completo IS NULL OR length(trim(p_nome_completo)) < 5 THEN
    RAISE EXCEPTION 'Nome completo obrigatório';
  END IF;

  v_cpf_limpo := regexp_replace(COALESCE(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf_limpo) <> 11 THEN RAISE EXCEPTION 'CPF inválido'; END IF;

  -- IP confiável: p_ip só é honrado para service_role; demais callers usam o
  -- rightmost XFF do gateway (elemento que o gateway anexa — não forjável).
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := p_ip;
  ELSE
    BEGIN
      v_xff := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_xff := NULL;
    END;
    BEGIN
      v_ip := NULLIF(btrim(split_part(v_xff, ',', -1)), '')::inet;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

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
    now()::text || COALESCE(v_ip::text,''),
    'sha256'
  ), 'hex');

  UPDATE public.contrato_assinatura_tokens
  SET usado_em = now(),
      assinado_ip = v_ip,
      assinado_ua = p_user_agent,
      assinatura_hash = v_assinatura_hash
  WHERE id = v_tok.id;

  UPDATE public.contratos_gerados
  SET status = 'assinado',
      assinado_em = now(),
      assinatura_metadata = jsonb_build_object(
        'cpf', v_cpf_limpo,
        'nome', upper(trim(p_nome_completo)),
        'ip', v_ip::text,
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

CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade_v2(
  p_hash text,
  p_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_row record;
  v_ip text;
  v_xff text;
  v_jwt_role text;
  v_count integer;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;

  -- Rate-limit pela fonte real da conexão: p_ip só para service_role; demais
  -- callers são limitados pelo rightmost XFF (chave não forjável).
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := COALESCE(p_ip, 'unknown');
  ELSE
    BEGIN
      v_xff := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_xff := NULL;
    END;
    v_ip := COALESCE(NULLIF(btrim(split_part(v_xff, ',', -1)), ''), 'unknown');
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.ciencia_rate_limits
  WHERE identifier = 'verif_contrato:' || v_ip
    AND created_at > now() - interval '10 minutes';

  IF v_count >= 20 THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', 'Muitas tentativas. Aguarde 10 minutos e tente novamente.'
    );
  END IF;

  INSERT INTO public.ciencia_rate_limits (identifier, rpc_name, ip_address, success)
  VALUES ('verif_contrato:' || v_ip, 'contrato_verificar_autenticidade_v2', v_ip::inet, true);

  v_hash := lower(trim(p_hash));

  SELECT
    cg.id, cg.status, cg.assinado_em,
    cg.sha256 AS documento_hash,
    cg.data_inicio, cg.data_fim,
    e.razao_social AS empresa_nome,
    c.nome_completo AS colaborador_nome,
    c.cpf AS colaborador_cpf,
    t.assinatura_hash
  INTO v_row
  FROM public.contratos_gerados cg
  LEFT JOIN public.contrato_assinatura_tokens t ON t.contrato_id = cg.id AND t.usado_em IS NOT NULL
  LEFT JOIN public.empresas e ON e.id = cg.empresa_id
  LEFT JOIN public.colaboradores c ON c.id = cg.colaborador_id
  WHERE lower(cg.sha256) = v_hash
     OR lower(t.assinatura_hash) = v_hash
  ORDER BY cg.assinado_em DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Contrato não encontrado');
  END IF;

  RETURN jsonb_build_object(
    'valido', v_row.status = 'assinado' AND v_row.assinado_em IS NOT NULL,
    'status', v_row.status,
    'assinado_em', v_row.assinado_em,
    'documento_hash', v_row.documento_hash,
    'assinatura_hash', v_row.assinatura_hash,
    'empresa', v_row.empresa_nome,
    'data_inicio', v_row.data_inicio,
    'data_fim', v_row.data_fim,
    'signatario_nome', CASE
      WHEN v_row.colaborador_nome IS NULL THEN NULL
      ELSE regexp_replace(v_row.colaborador_nome, '(\S+)(\s+\S)?.*', '\1\2***')
    END,
    'signatario_cpf_mascarado', CASE
      WHEN v_row.colaborador_cpf IS NULL THEN NULL
      ELSE '***.' || substr(regexp_replace(v_row.colaborador_cpf, '\D', '', 'g'), 4, 3)
           || '.' || substr(regexp_replace(v_row.colaborador_cpf, '\D', '', 'g'), 7, 3) || '-**'
    END
  );
EXCEPTION WHEN OTHERS THEN
  -- Se falhar o insert do rate-limit (ex.: IP inválido), degrada com segurança
  RETURN jsonb_build_object('valido', false, 'motivo', 'Erro na verificação. Tente novamente.');
END;
$$;
