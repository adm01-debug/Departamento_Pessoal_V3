-- Etapa 8 — Índices preventivos de performance (não-destrutivos)

-- 1. Ordenação alfabética de empresas (446 calls observadas)
CREATE INDEX IF NOT EXISTS idx_empresas_razao_social
  ON public.empresas (razao_social ASC);

-- 2. Feed de notificações por empresa (287 calls, ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa_created
  ON public.notificacoes (empresa_id, created_at DESC);

-- 3. Métricas de processamento cronológicas (1102 calls)
CREATE INDEX IF NOT EXISTS idx_metricas_processamento_timestamp
  ON public.metricas_processamento (timestamp DESC);

-- 4. Colaboradores por empresa (1102 calls, filtro empresa_id)
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_status
  ON public.colaboradores (empresa_id, status)
  WHERE status IS NOT NULL;

-- 5. Query telemetry lookup por operação/severity (245 inserts/sec)
CREATE INDEX IF NOT EXISTS idx_query_telemetry_severity_created
  ON public.query_telemetry (severity, created_at DESC)
  WHERE severity IN ('slow', 'error');

ANALYZE public.empresas;
ANALYZE public.notificacoes;
ANALYZE public.metricas_processamento;
ANALYZE public.colaboradores;
ANALYZE public.query_telemetry;
