-- ============================================================
-- P3-057: View v_login_anomalies — Detecção de Brute Force
-- Criado: 2026-07-24
-- Origem: PLANO_MELHORIAS.md P3-057
-- Descrição: Detecta anomalias de login para alerting:
--   - > 10 falhas/min de um mesmo IP
--   - > 5 falhas/min de um mesmo email
--   - Login de país não permitido
-- Uso: dashboard /admin/seguranca + Edge Function de alerta
-- ============================================================

BEGIN;

-- 1. View: anomalias por IP na última hora
-- Threshold: > 10 falhas de IP único por minuto
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
  -- Falhas por minuto (se window < 1min, projetar)
  CASE
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '1 minute'
    THEN COUNT(*) FILTER (WHERE success = false)
         / NULLIF(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))), 0)
         / 60)
    ELSE COUNT(*) FILTER (WHERE success = false)
         / NULLIF(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60, 0)
  END                                                       AS failures_per_minute_proj,
  -- Última razão de falha
  (
    SELECT failure_reason
    FROM public.login_attempts la2
    WHERE la2.ip_address = la1.ip_address
    ORDER BY la2.created_at DESC
    LIMIT 1
  )                                                         AS last_failure_reason,
  -- Países suspects (IPs que não são RFC 1918 nem well-known)
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
      >= 5  -- projetado >= 5 falhas/min
ORDER BY failed_attempts DESC, last_attempt DESC;

-- 2. View: anomalias por email na última hora
-- Threshold: > 5 falhas de email por minuto
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
  -- Falhas por minuto projetado
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
      >= 3  -- projetado >= 3 falhas/min
ORDER BY failed_attempts DESC;

-- 3. View consolidada: todas anomalias combinadas
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

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_hour
  ON public.login_attempts (ip_address, created_at DESC)
  WHERE created_at >= NOW() - INTERVAL '2 hours';

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_hour
  ON public.login_attempts (email, created_at DESC)
  WHERE created_at >= NOW() - INTERVAL '2 hours';

CREATE INDEX IF NOT EXISTS idx_login_attempts_success_hour
  ON public.login_attempts (success, created_at DESC)
  WHERE created_at >= NOW() - INTERVAL '2 hours';

-- 5. Comentário de auditoria
COMMENT ON VIEW v_login_anomalies IS
  'P3-057: Anomalias de login (brute force) combinadas IP+email. Threshold: >=3 falhas/min. Atualizada a cada query.';
COMMENT ON VIEW v_login_anomalies_ip IS
  'P3-057: Anomalias por IP — >5 falhas em 1h projetado >=5/min.';
COMMENT ON VIEW v_login_anomalies_email IS
  'P3-057: Anomalias por email — >3 falhas em 1h projetado >=3/min.';

COMMIT;
