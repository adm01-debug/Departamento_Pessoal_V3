-- ============================================================
-- P3-060: Tabela e função de log de backup + alerta stale
-- Criado: 2026-07-25
-- Origem: PLANO_MELHORIAS.md P3-060
--
-- Problema: backup é registrado em audit_log junto com 50+ ações.
--   Difícil distinguir "backup real" vs. "outra ação".
--   Além disso: sem retenção documentada, backups podem se acumular
--   indefinidamente no storage.
--
-- Solução:
--   1. Tabela backup_logs: registra cada execução com status/duração
--   2. Função alert_stale_backup(): retorna empresas sem backup > 24h
--   3. Integrada ao healthcheck (P3-056) para alerting upstream
-- ============================================================

BEGIN;

-- ── 1. Tabela de log de backup ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID,                               -- NULL = backup global
  acao            TEXT        NOT NULL DEFAULT 'run',
  status          TEXT        NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'partial', 'error', 'skipped')),
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  duration_ms     INTEGER,
  records_count   INTEGER     DEFAULT 0,
  tables_count    INTEGER     DEFAULT 0,
  error_message   TEXT,
  storage_path    TEXT,        -- path no Supabase Storage (se uso futuro)
  created_by      UUID,        -- user_id que executou (NULL = cron)
  metadata        JSONB       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_empresa
  ON public.backup_logs (empresa_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_logs_started
  ON public.backup_logs (started_at DESC);

COMMENT ON TABLE public.backup_logs IS
  'P3-060: Log de execuções de backup. Usado para retenção, SLA e alertas de backup stale.';

-- ── 2. Função: registra execução de backup ──────────────────
CREATE OR REPLACE FUNCTION public.record_backup_run(
  p_empresa_id   UUID        DEFAULT NULL,
  p_status       TEXT        DEFAULT 'success',
  p_duration_ms  INTEGER     DEFAULT NULL,
  p_records      INTEGER     DEFAULT 0,
  p_tables       INTEGER     DEFAULT 0,
  p_error        TEXT        DEFAULT NULL,
  p_created_by   UUID        DEFAULT NULL,
  p_metadata     JSONB       DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.backup_logs
    (empresa_id, status, started_at, finished_at, duration_ms,
     records_count, tables_count, error_message, created_by, metadata)
  VALUES
    (p_empresa_id, p_status,
     now() - (COALESCE(p_duration_ms, 0) || 'ms')::INTERVAL,
     now(),
     p_duration_ms,
     p_records, p_tables, p_error, p_created_by, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.record_backup_run IS
  'P3-060: Registra execução de backup. SECURITY DEFINER para permitir chamada via cron (anon).';

-- ── 3. Função: verifica backups stale (>24h sem sucesso) ─────
CREATE OR REPLACE FUNCTION public.alert_stale_backup()
RETURNS TABLE(
  empresa_id      UUID,
  empresa_nome    TEXT,
  last_backup_at  TIMESTAMPTZ,
  hours_since     INTEGER,
  records_backup  INTEGER,
  tables_backup   INTEGER
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bl.empresa_id,
    e.nome AS empresa_nome,
    MAX(bl.started_at)              AS last_backup_at,
    EXTRACT(EPOCH FROM (now() - MAX(bl.started_at)))::INTEGER / 3600 AS hours_since,
    MAX(bl.records_count)           AS records_backup,
    MAX(bl.tables_count)           AS tables_backup
  FROM public.backup_logs bl
  LEFT JOIN public.empresas e ON e.id = bl.empresa_id
  WHERE bl.status IN ('success', 'partial')
    AND bl.started_at < now() - INTERVAL '24 hours'
  GROUP BY bl.empresa_id, e.nome
  ORDER BY hours_since DESC;
END;
$$;

COMMENT ON FUNCTION public.alert_stale_backup IS
  'P3-060: Retorna empresas sem backup com sucesso há mais de 24h. Usar no healthcheck/alerta.';

-- ── 4. Retenção de backup_logs ──────────────────────────────
-- Mantém logs de backup por 90 dias (ciclo de 3 meses para forensics).
-- Dados de backup em si (exportados para storage) retidos por política
-- de storage do Supabase (verificar em https://supabase.com/dashboard).

ALTER TABLE public.backup_logs
  ALTER COLUMN started_at SET STATISTICS 500;

COMMENT ON COLUMN public.backup_logs IS
  'Retenção: 90 dias. Backup de dados: política de storage do Supabase (30d padrão em Pro).';

-- ── 5. Integração com lgpd_purge_log (P3-065) ───────────────
-- backup_logs também é limpo pelo purge de LGPD se necessário.
-- Adicionar a config_retencao se for uma tabela de log:
INSERT INTO public.config_retencao (tabela, dias, ativo, batch_size)
VALUES ('backup_logs', 90, true, 1000)
ON CONFLICT (tabela) DO NOTHING;

COMMIT;
