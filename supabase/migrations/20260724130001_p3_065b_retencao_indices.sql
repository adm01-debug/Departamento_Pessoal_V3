-- ============================================================
-- P3-065 (b): Índices para DELETE em batch (performance)
-- Criado: 2026-07-24
-- Requisito: sem índice em created_at, DELETE faz full scan.
--   Em tabelas com 10M+ linhas, isso bloqueia o banco.
-- ============================================================

BEGIN;

-- query_telemetry: índice já existente mas garantir
CREATE INDEX IF NOT EXISTS idx_query_telemetry_created_at
  ON public.query_telemetry (created_at DESC);

-- audit_log: партицийовий seria ideal mas índice simples é o mínimo
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC)
  WHERE created_at IS NOT NULL;

-- login_attempts: alta rotatividade — índice composto
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at
  ON public.login_attempts (created_at DESC);

-- auditoria_logs: se existir
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_created_at
  ON public.auditoria_logs (created_at DESC)
  WHERE created_at IS NOT NULL;

-- auditoria (se existir)
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at
  ON public.auditoria (created_at DESC)
  WHERE created_at IS NOT NULL;

-- lgpd_fila_limpeza: índice para delete em batch
CREATE INDEX IF NOT EXISTS idx_lgpd_fila_limpeza_data_programada
  ON public.lgpd_fila_limpeza (data_programada ASC)
  WHERE executado = false;

-- lgpd_purge_log: retido por 60 dias — índice para consulta
CREATE INDEX IF NOT EXISTS idx_lgpd_purge_log_executed_at
  ON public.lgpd_purge_log (executed_at DESC);

COMMIT;
