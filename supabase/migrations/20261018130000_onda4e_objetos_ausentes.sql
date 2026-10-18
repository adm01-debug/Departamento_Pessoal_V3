-- ═══════════════════════════════════════════════════════════════════════════
-- Onda 4e — objetos esperados AUSENTES no canônico (diagnóstico 39122979648).
--
-- O ledger repair marcou as versões históricas, mas os objetos nunca foram
-- criados em produção (drift real). Consumidores quebrados hoje:
--   - tabelas-dominio: cbo, cnae, faixas_irrf, faixas_inss (HTTP 500)
--   - alertas-dp / admin/seguranca: v_login_anomalies
--   - dashboards folha: mv_folha_summary
--   - healthcheck/metrics: health_checks (tolerante, mas reporta ausente)
--
-- Tudo idempotente: CREATE OR REPLACE / IF NOT EXISTS.
-- cbo/cnae/faixas_* nascem vazias (endpoint passa a responder [] em vez de
-- erro); carga dos catálogos fica para o fluxo de importação de domínio.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabelas de domínio consumidas por tabelas-dominio ─────────────────────
CREATE TABLE IF NOT EXISTS public.cbo (
  codigo    text PRIMARY KEY,
  descricao text NOT NULL,
  grupo     text
);
COMMENT ON TABLE public.cbo IS 'Catálogo CBO (Classificação Brasileira de Ocupações). Carga via importação de domínio.';

CREATE TABLE IF NOT EXISTS public.cnae (
  codigo    text PRIMARY KEY,
  descricao text NOT NULL,
  subclasse text
);
COMMENT ON TABLE public.cnae IS 'Catálogo CNAE. Carga via importação de domínio.';

CREATE TABLE IF NOT EXISTS public.faixas_irrf (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  faixa     text NOT NULL,
  aliquota  numeric NOT NULL,
  deducao   numeric
);
COMMENT ON TABLE public.faixas_irrf IS 'Faixas da tabela IRRF. Carga via importação de domínio.';

CREATE TABLE IF NOT EXISTS public.faixas_inss (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  faixa     text NOT NULL,
  aliquota  numeric NOT NULL,
  teto      numeric
);
COMMENT ON TABLE public.faixas_inss IS 'Faixas da tabela INSS. Carga via importação de domínio.';

-- Leitura para logados (catálogos globais, sem tenant); escrita só backend.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cbo','cnae','faixas_irrf','faixas_inss'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_read_auth ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_read_auth ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- ── 2. health_checks (opcional — healthcheck/metrics toleram ausência) ────────
CREATE TABLE IF NOT EXISTS public.health_checks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status     text,
  detalhes   jsonb
);
COMMENT ON TABLE public.health_checks IS 'Registro opcional de execuções de healthcheck (healthcheck/metrics).';
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
-- audit-migration-style: allow-silent-drop recria a policy idempotente logo abaixo
DROP POLICY IF EXISTS health_checks_read_auth ON public.health_checks;
CREATE POLICY health_checks_read_auth ON public.health_checks
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.health_checks TO authenticated;
GRANT SELECT ON public.health_checks TO service_role;

-- ── 3. v_login_anomalies* (DDL de 20260724110000, reaplicada idempotente) ────
CREATE OR REPLACE VIEW v_login_anomalies_ip AS
SELECT
  ip_address,
  COUNT(*)                                                  AS total_attempts,
  COUNT(*) FILTER (WHERE success = false)                   AS failed_attempts,
  COUNT(*) FILTER (WHERE success = true)                    AS successful_attempts,
  ROUND(
    COUNT(*) FILTER (WHERE success = false)::numeric
    / NULLIF(COUNT(*), 0) * 100, 2
  )                                                         AS failure_rate_pct,
  MIN(created_at)                                           AS first_attempt,
  MAX(created_at)                                           AS last_attempt,
  MAX(created_at) - MIN(created_at)                         AS window_duration,
  CASE
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '1 minute'
    THEN COUNT(*) FILTER (WHERE success = false)
         / NULLIF(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))), 0)
         / 60
    ELSE COUNT(*) FILTER (WHERE success = false)
         / NULLIF(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60, 0)
  END                                                       AS failures_per_minute_proj,
  (
    SELECT failure_reason
    FROM public.login_attempts la2
    WHERE la2.ip_address = la1.ip_address
    ORDER BY la2.created_at DESC
    LIMIT 1
  )                                                         AS last_failure_reason,
  CASE
    WHEN ip_address ~ '^10\.' OR ip_address ~ '^172\.(1[6-9]|2[0-9]|3[0-1])\.' OR ip_address ~ '^192\.168\.'
    THEN 'internal'
    WHEN ip_address = '127.0.0.1' OR ip_address = '::1'
    THEN 'localhost'
    ELSE 'external'
  END                                                       AS ip_type
FROM public.login_attempts la1
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING
  COUNT(*) FILTER (WHERE success = false) >= 5
  AND COUNT(*) FILTER (WHERE success = false)::float
      / NULLIF(GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60, 1), 0)
      >= 5
ORDER BY failed_attempts DESC, last_attempt DESC;

CREATE OR REPLACE VIEW v_login_anomalies_email AS
SELECT
  email,
  COUNT(*)                                                  AS total_attempts,
  COUNT(*) FILTER (WHERE success = false)                   AS failed_attempts,
  COUNT(*) FILTER (WHERE success = true)                    AS successful_attempts,
  ROUND(
    COUNT(*) FILTER (WHERE success = false)::numeric
    / NULLIF(COUNT(*), 0) * 100, 2
  )                                                         AS failure_rate_pct,
  MIN(created_at)                                           AS first_attempt,
  MAX(created_at)                                           AS last_attempt,
  COUNT(*) FILTER (WHERE success = false)
  / NULLIF(GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60, 1), 0)
                                                              AS failures_per_minute_proj,
  (
    SELECT ip_address
    FROM public.login_attempts la2
    WHERE la2.email = la1.email
    ORDER BY la2.created_at DESC
    LIMIT 1
  )                                                         AS last_ip,
  (
    SELECT failure_reason
    FROM public.login_attempts la2
    WHERE la2.email = la1.email
    ORDER BY la2.created_at DESC
    LIMIT 1
  )                                                         AS last_failure_reason
FROM public.login_attempts la1
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING
  COUNT(*) FILTER (WHERE success = false) >= 3
  AND COUNT(*) FILTER (WHERE success = false)::float
      / NULLIF(GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60, 1), 0)
      >= 3
ORDER BY failed_attempts DESC;

CREATE OR REPLACE VIEW v_login_anomalies AS
SELECT
  'ip'                                                      AS anomaly_type,
  ip_address                                                AS identifier,
  failed_attempts,
  successful_attempts,
  failure_rate_pct,
  first_attempt,
  last_attempt,
  NULLIF(failures_per_minute_proj, 'NaN')                  AS failures_per_minute,
  last_failure_reason,
  NULL::text                                                AS last_ip,
  NULL::text                                                AS ip_type
FROM v_login_anomalies_ip
UNION ALL
SELECT
  'email'                                                   AS anomaly_type,
  email                                                     AS identifier,
  failed_attempts,
  successful_attempts,
  failure_rate_pct,
  first_attempt,
  last_attempt,
  NULLIF(failures_per_minute_proj, 'NaN')                  AS failures_per_minute,
  last_failure_reason,
  last_ip,
  NULL::text                                                AS ip_type
FROM v_login_anomalies_email
ORDER BY failed_attempts DESC, last_attempt DESC;

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_hour
  ON public.login_attempts (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_hour
  ON public.login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_hour
  ON public.login_attempts (success, created_at DESC);

COMMENT ON VIEW v_login_anomalies IS
  'P3-057: Anomalias de login (brute force) combinadas IP+email. Threshold: >=3 falhas/min.';

-- ── 4. mv_folha_summary (DDL de 20260724140000, reaplicada idempotente) ───────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_folha_summary
WITH (fillfactor = 80) AS
SELECT
  f.empresa_id,
  to_date(f.competencia || '-01', 'YYYY-MM-DD') AS competencia_month,
  SUM(f.total_colaboradores)                               AS headcount_folha,
  SUM(f.total_proventos)                                   AS total_bruto,
  SUM(f.total_descontos)                                   AS total_descontos,
  SUM(f.total_liquido)                                     AS total_liquido,
  SUM(f.total_fgts)                                        AS total_fgts,
  SUM(f.total_inss_patronal)                               AS total_inss,
  SUM(f.total_proventos) / NULLIF(SUM(f.total_colaboradores), 0)
                                                           AS salario_medio,
  MIN(f.total_proventos / NULLIF(f.total_colaboradores, 0)) AS piso_salarial,
  MAX(f.total_proventos / NULLIF(f.total_colaboradores, 0)) AS teto_salarial,
  SUM(f.total_proventos) / NULLIF(SUM(f.total_colaboradores), 0)
                                                           AS custo_medio
FROM public.folhas_pagamento f
WHERE to_date(f.competencia || '-01', 'YYYY-MM-DD') >= NOW() - INTERVAL '3 years'
GROUP BY 1, 2
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_folha_summary_pk
  ON mv_folha_summary (empresa_id, competencia_month);

REFRESH MATERIALIZED VIEW mv_folha_summary;
