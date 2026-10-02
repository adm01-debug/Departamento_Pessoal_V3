-- ============================================================================
-- P0: Furos críticos de isolamento/criptografia encontrados na validação
--     pós-auditoria (replay completo das migrations + inspeção de ACL/policies).
-- Idempotente: seguro reaplicar em qualquer ambiente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. contas_bancarias_decrypted — view SECURITY DEFINER implícita
--
-- Views executam com os direitos do OWNER (supabase_admin, que é
-- BYPASSRLS). Como a view retorna dados DESCRIPTOGRAFADOS e tinha
-- GRANT SELECT para `authenticated`, qualquer usuário autenticado lia
-- agência/conta/PIX descriptografados de TODOS os tenants — bypass total
-- de RLS e da criptografia pgcrypto implementada em 2026-08.
--
-- security_invoker = true faz a view respeitar a RLS do CHAMADOR sobre
-- contas_bancarias (isolamento de tenant já garantido pelas policies da
-- tabela), mantendo o propósito da view (leitura descriptografada).
-- REVOKE em `anon` elimina o acesso anônimo remanescente.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.contas_bancarias_decrypted') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.contas_bancarias_decrypted SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.contas_bancarias_decrypted FROM anon';
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. colaboradores_pii_select USING(true) — policy permissiva total
--
-- Policies permissivas combinam por OR: qualquer USING(true) torna
-- colaboradores legível por QUALQUER authenticated de QUALQUER tenant,
-- expondo CPF/PIS/salário/descrição criptografada cross-tenant. O acesso
-- legítimo continua garantido pela colaboradores_tenant_select
-- (rls_tenant_or_admin(empresa_id)).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.colaboradores') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "colaboradores_pii_select" ON public.colaboradores';
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Materialized views — GRANT ALL para anon/authenticated sem RLS
--
-- Postgres não suporta RLS em matviews, e os DEFAULT PRIVILEGES da
-- baseline concederam ALL a anon/authenticated na criação. Resultado:
-- qualquer usuário (inclusive anônimo) lia agregados de TODAS as empresas
-- (folha, férias, FGTS, passivo trabalhista, headcount, turnover).
-- Nenhum código do app consulta mv_* diretamente — acesso legítimo é via
-- service_role (edge functions / refresh). Revoga tudo e reconcede apenas
-- SELECT ao service_role.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v text;
  mvs text[] := ARRAY[
    'mv_absenteismo_mensal',
    'mv_afastamento_summary',
    'mv_anomalies_hourly',
    'mv_dashboard_headcount',
    'mv_esocial_status',
    'mv_ferias_balance',
    'mv_fgts_passivo',
    'mv_folha_summary',
    'mv_headcount_daily',
    'mv_kpi_turnover_absenteismo',
    'mv_passivo_trabalhista',
    'mv_provisao_13',
    'mv_saldo_ferias',
    'mv_status_change_daily',
    'mv_telemetry_dashboard',
    'mv_turnover_rate'
  ];
BEGIN
  FOREACH v IN ARRAY mvs LOOP
    IF to_regclass(format('public.%I', v)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated, PUBLIC', v);
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', v);
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Portal público /contratacao — RPCs de escrita por token
--
-- Desde 2026-07 (P0-004) INSERT/UPDATE/DELETE em admissao_tokens estão
-- revogados de anon E authenticated, mas a página pública fazia writes
-- diretos — o fluxo inteiro (salvar dados, marcar documentos, assinar
-- contrato) estava quebrado. Estas RPCs SECURITY DEFINER restauram o
-- fluxo com validação de token idêntica à get_admissao_por_token
-- (entropia >= 16 chars + não expirado). O candidato só escreve no
-- PRÓPRIO processo de admissão — nada além.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._admissao_token_row(_token TEXT)
RETURNS public.admissao_tokens
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.*
  FROM public.admissao_tokens t
  WHERE t.token = _token
    AND _token IS NOT NULL
    AND length(_token) >= 16
    AND (t.data_expiracao IS NULL OR t.data_expiracao > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._admissao_token_row(TEXT) FROM PUBLIC;

-- 4a. Salvar dados pessoais do candidato (etapa 1 do portal)
CREATE OR REPLACE FUNCTION public.admissao_salvar_dados(
  _token TEXT,
  _nome TEXT,
  _cpf TEXT,
  _data_nascimento DATE,
  _email TEXT,
  _telefone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.admissao_tokens;
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.admissoes
  SET nome = COALESCE(NULLIF(trim(_nome), ''), nome),
      cpf = COALESCE(NULLIF(trim(_cpf), ''), cpf),
      data_nascimento = COALESCE(_data_nascimento, data_nascimento),
      email = COALESCE(NULLIF(trim(_email), ''), email),
      telefone = COALESCE(NULLIF(trim(_telefone), ''), telefone),
      updated_at = now()
  WHERE id = v_token.admissao_id;

  UPDATE public.admissao_tokens
  SET dados_preenchidos = true, updated_at = now()
  WHERE id = v_token.id;
END;
$$;

-- 4b. Marcar etapa de documentos enviados
CREATE OR REPLACE FUNCTION public.admissao_marcar_documentos(_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.admissao_tokens;
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.admissao_tokens
  SET documentos_enviados = true, updated_at = now()
  WHERE id = v_token.id;
END;
$$;

-- 4c. Assinar contrato (etapa final — grava assinatura + IP de auditoria)
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
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;
  IF _assinatura_base64 IS NULL OR length(_assinatura_base64) < 100 THEN
    RAISE EXCEPTION 'assinatura ausente ou invalida' USING ERRCODE = '22023';
  END IF;

  UPDATE public.admissao_tokens
  SET contrato_assinado = true,
      assinado_em = now(),
      assinatura_base64 = _assinatura_base64,
      ip_assinatura = _ip,
      updated_at = now()
  WHERE id = v_token.id;
END;
$$;

-- 4d. Registrar metadados de um documento enviado (o arquivo vai pela
--     edge function admissao-publica, que faz upload com service_role e
--     depois chama esta RPC com o storage path gerado)
CREATE OR REPLACE FUNCTION public.admissao_registrar_documento(
  _token TEXT,
  _tipo TEXT,
  _nome_arquivo TEXT,
  _url TEXT,
  _tamanho_bytes BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.admissao_tokens;
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;
  IF _url IS NULL OR _url NOT LIKE 'admissao_%/%' THEN
    RAISE EXCEPTION 'path de documento fora do escopo da admissao' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.documentos_admissao (admissao_id, tipo, nome_arquivo, url, tamanho_bytes, validado)
  VALUES (v_token.admissao_id, _tipo, _nome_arquivo, _url, _tamanho_bytes, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admissao_salvar_dados(TEXT, TEXT, TEXT, DATE, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admissao_marcar_documentos(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admissao_assinar_contrato(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admissao_registrar_documento(TEXT, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated;
