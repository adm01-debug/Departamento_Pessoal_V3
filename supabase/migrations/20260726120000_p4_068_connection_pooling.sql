-- P4-068: Configuração de Connection Pooling (PgBouncer)
-- Data: 2026-07-26
-- CORRIGIDO: Nomes de tabelas verificados nas migrations existentes

-- =============================================================================
-- 1. CONFIGURAÇÃO PGBOUNCER (Supabase)
-- =============================================================================

-- No Supabase Dashboard > Database > Connection Pooling:
-- Mode: Transaction mode (recomendado para serverless)
-- Default pool size: 20 (máximo recomendado)
-- Max client connections: 100

-- =============================================================================
-- 2. OTIMIZAÇÕES DE CONEXÃO (aplicar no postgres.conf)
-- =============================================================================

-- Configurações recomendadas para PgBouncer em modo transaction:

-- -- Connection settings --
-- max_connections = 100
-- reserved_connections = 3  (para admin connections)

-- -- Memory --
-- max_client_conn = 100
-- default_pool_size = 20

-- =============================================================================
-- 3. FUNÇÕES PARA MONITORAR POOL
-- =============================================================================

-- View de estatísticas do pool
CREATE OR REPLACE VIEW admin.v_pgbouncer_stats AS
SELECT
  datname as database,
  sum(num_connections) as total_connections,
  sum(num_active_connections) as active_connections,
  sum(num_idle_connections) as idle_connections,
  sum(num_waited) as total_waits,
  avg(avg_wait) as avg_wait_ms,
  sum(avg_sent) as bytes_sent,
  sum(avg_recv) as bytes_received
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname;

-- =============================================================================
-- 4. ÍNDICES COMPOSTOS PARA REDUZIR CONEXÕES
-- =============================================================================
-- AUDITORIA DE COLUNAS (2026-07-26):
--   folhas_pagamento : SEM empresa_id (tabela consolidada sem FK direta)
--   registros_ponto   : SEM empresa_id (via colaborador); SEM data_hora (é "data" DATE)
--   documentos        : verificar existência de empresa_id + ativo
-- =============================================================================

-- Índices que otimizam queries frequentes (NÃO bloqueiam — CONCURRENTLY)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_empresa_ativo_sw
  ON public.colaboradores(empresa_id, status)
  WHERE status = 'ativo';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_competencia_sw
  ON public.folhas_pagamento(competencia DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folhas_pagamento_status_sw
  ON public.folhas_pagamento(status, competencia DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_ponto_colab_data_sw
  ON public.registros_ponto(colaborador_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ajustes_ponto_status_sw
  ON public.ajustes_ponto(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_solicitacoes_ajuste_ponto_status_sw
  ON public.solicitacoes_ajuste_ponto(status, created_at DESC);

-- =============================================================================
-- 5. FUNÇÃO DE LIMPEZA DE CONEXÕES óRFÃS (COM TRATAMENTO DE ERROS)
-- =============================================================================

CREATE OR REPLACE FUNCTION admin.clean_idle_connections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Termina conexões ociosas há mais de 30 minutos
  BEGIN
    PERFORM pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle'
      AND state_change < NOW() - INTERVAL '30 minutes'
      AND pid <> pg_backend_pid()
      AND application_name LIKE '%pgbouncer%';
  EXCEPTION WHEN OTHERS THEN
    -- Log error mas não quebra a função
    RAISE NOTICE 'Erro ao limpar conexões: %', SQLERRM;
  END;
END;
$$;

-- =============================================================================
-- 6. MONITORAMENTO DE QUERIES LENTAS
-- =============================================================================

CREATE OR REPLACE VIEW admin.v_slow_queries AS
SELECT
  now() - query_start as duration,
  usename as user,
  datname as database,
  state,
  left(query, 200) as query_preview,
  wait_event,
  pid
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > INTERVAL '5 seconds'
ORDER BY duration DESC
LIMIT 20;

-- =============================================================================
-- 7. ALERTAS (para métricas)
-- =============================================================================

-- Query para verificar se pool está próximo do limite
CREATE OR REPLACE FUNCTION admin.check_pool_health()
RETURNS TABLE (
  metric TEXT,
  value BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'active_connections'::TEXT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) > 15 THEN 'WARNING'  -- 75% de 20
      WHEN COUNT(*) > 18 THEN 'CRITICAL' -- 90% de 20
      ELSE 'OK'
    END::TEXT
  FROM pg_stat_activity
  WHERE state = 'active';

  RETURN QUERY
  SELECT
    'waiting_connections'::TEXT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) > 0 THEN 'WARNING'
      ELSE 'OK'
    END::TEXT
  FROM pg_stat_activity
  WHERE wait_event IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION admin.check_pool_health IS
  'Verifica saúde do connection pool. Rode periodicamente para monitorar.';

-- =============================================================================
-- 8. CONFIGURAÇÃO TIMEOUTS
-- =============================================================================

-- Timeouts para liberar conexões rapidamente
ALTER DATABASE postgres SET idle_session_timeout = '10min';
ALTER DATABASE postgres SET statement_timeout = '30s';

-- =============================================================================
-- 9. POOL MODE OTIMIZADO POR TIPO DE QUERY
-- =============================================================================

-- Para queries de longa duração (ETL, exports), usar pool_mode=session
-- Para queries curtas (API), usar pool_mode=transaction

-- Views para identificar queries que precisam de sessão dedicada
CREATE OR REPLACE VIEW admin.v_long_running_queries AS
SELECT
  pid,
  usename,
  application_name,
  state,
  query,
  now() - query_start as duration,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > INTERVAL '1 minute'
ORDER BY duration DESC;

-- Queries com transações abertas (precisam de session mode)
CREATE OR REPLACE VIEW admin.v_open_transactions AS
SELECT
  pid,
  usename,
  now() - xact_start as transaction_duration,
  state,
  left(query, 100) as query_preview
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
  AND state = 'idle in transaction'
ORDER BY transaction_duration DESC;

-- =============================================================================
-- 10. DOCUMENTAÇÃO
-- =============================================================================

-- Readme para configurações de produção:
-- 1. PgBouncer em transaction mode: ideal para APIs
-- 2. Pool size 20: suporta ~100 conexões simultâneas
-- 3. statement_timeout 30s: previne queries bloqueantes
-- 4. idle_session_timeout 10min: libera memória de conexões órfãs
-- 5. Índices compostos: reduz necessidade de sequential scans
