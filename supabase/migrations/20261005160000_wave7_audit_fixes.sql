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
