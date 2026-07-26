-- ============================================================
-- P3-054: Materialized View para Telemetria do Bridge
-- Criado: 2026-07-24
-- Origem: PLANO_MELHORIAS.md P3-054
-- Descrição: View materializada com agregações por hora
--   para dashboards Grafana e alertas de latência
-- Refresh: a cada 5min via cron ou manual
-- ============================================================

BEGIN;

-- 1. Criar materialized view com agregações hourly
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_telemetry_dashboard
WITH (timescaledb.continuous) AS
SELECT
  date_trunc('hour', created_at) AS hour,
  table_name,
  operation,
  severity,
  COUNT(*)                                              AS query_count,
  AVG(duration_ms)                                      AS avg_ms,
  MIN(duration_ms)                                      AS min_ms,
  MAX(duration_ms)                                      AS max_ms,
  -- P95 via percentile_cont (PostgreSQL nativo)
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_ms) AS p75_ms,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY duration_ms) AS p90_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms,
  -- Erros
  COUNT(*) FILTER (WHERE severity IN ('error', 'fatal')) AS error_count,
  -- Bytes processados
  AVG(bytes_sent) FILTER (WHERE bytes_sent IS NOT NULL) AS avg_bytes_sent,
  SUM(bytes_sent) FILTER (WHERE bytes_sent IS NOT NULL) AS total_bytes_sent
FROM query_telemetry
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2, 3, 4
WITH NO DATA;

-- 2. Índice para acesso rápido por hora (evita full scan)
CREATE INDEX IF NOT EXISTS idx_mv_telemetry_hour
  ON mv_telemetry_dashboard (hour DESC, table_name, operation);

-- 3. Índice para queries de erro
CREATE INDEX IF NOT EXISTS idx_mv_telemetry_errors
  ON mv_telemetry_dashboard (hour DESC, severity)
  WHERE severity IN ('error', 'fatal');

-- 4. Comentário de auditoria
COMMENT ON MATERIALIZED VIEW mv_telemetry_dashboard IS
  'P3-054: Agregações hourly de telemetria do external-db-bridge. Refresh a cada 5min. Retém 90 dias.';

-- 5. View auxiliar: last-hour snapshot (para healthcheck)
CREATE OR REPLACE VIEW v_telemetry_last_hour AS
SELECT
  table_name,
  operation,
  severity,
  COUNT(*)                AS query_count,
  AVG(duration_ms)::int   AS avg_ms,
  MAX(duration_ms)::int   AS max_ms,
  COUNT(*) FILTER (WHERE severity IN ('error', 'fatal')) AS error_count
FROM query_telemetry
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3;

COMMENT ON VIEW v_telemetry_last_hour IS
  'P3-054: Snapshot de telemetria da última hora para healthcheck e alertas.';

-- 6. View: slow queries da última hora (para alerting)
CREATE OR REPLACE VIEW v_telemetry_slow_queries AS
SELECT
  id,
  created_at,
  user_id,
  table_name,
  operation,
  duration_ms,
  severity,
  status_code
FROM query_telemetry
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND duration_ms > 5000
ORDER BY created_at DESC;

COMMENT ON VIEW v_telemetry_slow_queries IS
  'P3-054: Queries com latência > 5s na última hora para alerting P95.';

-- 7. Função de refresh com retry (para cron)
CREATE OR REPLACE FUNCTION public.refresh_telemetry_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh concurrente (não bloqueia reads)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_telemetry_dashboard;
EXCEPTION WHEN feature_not_supported THEN
  -- Fallback para non-concurrent em versões antigas
  REFRESH MATERIALIZED VIEW mv_telemetry_dashboard;
END;
$$;

COMMENT ON FUNCTION public.refresh_telemetry_views() IS
  'P3-054: Refresh a materialized view. Chamar via cron a cada 5min.';

-- 8. Agendamento via pg_cron (se disponível)
-- Nota: requer extensão pg_cron habilitada no banco
-- SELECT cron.schedule('refresh-telemetry', '*/5 * * * *', 'SELECT refresh_telemetry_views()');

COMMIT;

-- 9. População inicial (sem concurrently — primeira vez)
REFRESH MATERIALIZED VIEW mv_telemetry_dashboard;
