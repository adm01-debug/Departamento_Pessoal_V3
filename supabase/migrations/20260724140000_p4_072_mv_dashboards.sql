-- ============================================================
-- P4-072: Materialized Views para Dashboards com Refresh Noturno
-- Criado: 2026-07-24
-- Origem: PLANO_MELHORIAS.md P4-072
--
-- Refresh: a cada 24h via pg_cron (5:00 AM BRT — horário de menor carga).
-- Em produção usar:
--   SELECT cron.schedule('refresh-dashboards', '0 5 * * *', 'SELECT refresh_dashboard_views()');
--
-- CONCURRENTLY: não bloqueia reads durante o refresh.
-- Para usar CONCURRENTLY, cada MV precisa de um UNIQUE index.
-- ============================================================

BEGIN;

-- ── 1. mv_headcount_daily ──────────────────────────────────
-- Headcount por empresa + departamento + status por dia.
-- Útil para: gráfico de evolução, turnover rate, taxa de absenteísmo.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_headcount_daily
WITH (fillfactor = 80) AS
SELECT
  empresa_id,
  DATE_TRUNC('day', created_at)::DATE AS snapshot_date,
  status,
  departamento,
  COUNT(*) AS headcount,
  COUNT(*) FILTER (WHERE status = 'ativo')  AS ativos,
  COUNT(*) FILTER (WHERE status = 'desligado') AS desligados,
  COUNT(*) FILTER (WHERE status = 'ferias')  AS em_ferias,
  COUNT(*) FILTER (WHERE status = 'afastado') AS afastados
FROM public.colaboradores
WHERE created_at >= NOW() - INTERVAL '3 years'
GROUP BY 1, 2, 3, 4
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_headcount_daily_pk
  ON mv_headcount_daily (empresa_id, snapshot_date, status, departamento);

-- ── 2. mv_folha_summary ────────────────────────────────────
-- Resumo mensal de folha de pagamento por empresa.
-- Colunas: total_bruto, total_descontos, total_liquido, total_fgts,headcount_folha.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_folha_summary
WITH (fillfactor = 80) AS
SELECT
  f.empresa_id,
  DATE_TRUNC('month', f.competencia)::DATE AS competencia_month,
  COUNT(DISTINCT f.colaborador_id)                     AS headcount_folha,
  SUM(f.total_bruto)   FILTER (WHERE f.total_bruto IS NOT NULL)   AS total_bruto,
  SUM(f.total_descontos) FILTER (WHERE f.total_descontos IS NOT NULL) AS total_descontos,
  SUM(f.total_liquido) FILTER (WHERE f.total_liquido IS NOT NULL)  AS total_liquido,
  SUM(f.total_fgts)    FILTER (WHERE f.total_fgts IS NOT NULL)    AS total_fgts,
  SUM(f.total_inss)    FILTER (WHERE f.total_inss IS NOT NULL)    AS total_inss,
  AVG(f.total_bruto)   FILTER (WHERE f.total_bruto IS NOT NULL)   AS salario_medio,
  MIN(f.total_bruto)   FILTER (WHERE f.total_bruto IS NOT NULL)   AS piso_salarial,
  MAX(f.total_bruto)   FILTER (WHERE f.total_bruto IS NOT NULL)   AS teto_salarial,
  SUM(f.total_bruto)   FILTER (WHERE f.total_bruto IS NOT NULL)
    / NULLIF(COUNT(DISTINCT f.colaborador_id), 0)
    FILTER (WHERE f.total_bruto IS NOT NULL)               AS custo_medio
FROM public.folhas f
WHERE f.competencia >= NOW() - INTERVAL '3 years'
GROUP BY 1, 2
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_folha_summary_pk
  ON mv_folha_summary (empresa_id, competencia_month);

-- ── 3. mv_turnover_rate ────────────────────────────────────
-- Taxa de turnover mensal por empresa.
-- Fórmula: (admissões + desligamentos) / headcount_inicio * 100.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_turnover_rate
WITH (fillfactor = 80) AS
WITH mensal AS (
  SELECT
    empresa_id,
    DATE_TRUNC('month', created_at)::DATE AS mes,
    COUNT(*) FILTER (WHERE status = 'admissao')  AS admissoes,
    COUNT(*) FILTER (WHERE status = 'desligado') AS desligamentos
  FROM public.colaboradores
  WHERE created_at >= NOW() - INTERVAL '3 years'
  GROUP BY 1, 2
)
SELECT
  m.empresa_id,
  m.mes,
  m.admissoes,
  m.desligamentos,
  m.admissoes + m.desligamentos AS total_movimentacao,
  -- Headcount no início do mês (lookup simples)
  (
    SELECT COUNT(*)
    FROM public.colaboradores c
    WHERE c.empresa_id = m.empresa_id
      AND c.data_admissao < m.mes + INTERVAL '1 month'
      AND (c.data_demissao IS NULL OR c.data_demissao >= m.mes)
  ) AS headcount_inicio,
  -- Headcount no fim do mês
  (
    SELECT COUNT(*)
    FROM public.colaboradores c
    WHERE c.empresa_id = m.empresa_id
      AND c.data_admissao <= m.mes + INTERVAL '1 month' - INTERVAL '1 day'
      AND (c.data_demissao IS NULL OR c.data_demissao >= m.mes + INTERVAL '1 month' - INTERVAL '1 day')
  ) AS headcount_fim,
  -- Taxa de turnover: média dos dois headcounts
  ROUND(
    (m.admissoes + m.desligamentos)::numeric
    / NULLIF(
        (
          (SELECT COUNT(*) FROM public.colaboradores c
           WHERE c.empresa_id = m.empresa_id
             AND c.data_admissao < m.mes + INTERVAL '1 month'
             AND (c.data_demissao IS NULL OR c.data_demissao >= m.mes)
          )
        +
          (SELECT COUNT(*) FROM public.colaboradores c
           WHERE c.empresa_id = m.empresa_id
             AND c.data_admissao <= m.mes + INTERVAL '1 month' - INTERVAL '1 day'
             AND (c.data_demissao IS NULL OR c.data_demissao >= m.mes + INTERVAL '1 month' - INTERVAL '1 day')
          )
        )::numeric / 2, 0
      ) * 100, 2
  ) AS turnover_rate_pct
FROM mensal m
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_turnover_rate_pk
  ON mv_turnover_rate (empresa_id, mes);

-- ── 4. mv_ferias_balance ────────────────────────────────────
-- Saldo de férias por colaborador (vencidas + em aberto).
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ferias_balance
WITH (fillfactor = 80) AS
SELECT
  c.empresa_id,
  c.departamento,
  c.id AS colaborador_id,
  c.nome AS colaborador_nome,
  c.data_admissao,
  -- Dias de direito por ano trabalhado (30 dias por ano)
  GREATEST(0, (EXTRACT(YEAR FROM AGE(NOW(), c.data_admissao)) * 30
    - COALESCE(
        (SELECT SUM(f.dias_ferias)
         FROM public.ferias f WHERE f.colaborador_id = c.id),
        0
      )
    - COALESCE(
        (SELECT SUM(f.dias_vencidos_utilizados)
         FROM public.ferias f WHERE f.colaborador_id = c.id),
        0
      )
  )) AS saldo_dias,
  EXTRACT(YEAR FROM AGE(NOW(), c.data_admissao)) AS anos_trabalhados,
  (
    SELECT COUNT(*)
    FROM public.ferias f
    WHERE f.colaborador_id = c.id
      AND f.status = 'concluida'
      AND f.data_fim >= NOW() - INTERVAL '12 months'
  ) AS gozos_12m
FROM public.colaboradores c
WHERE c.status IN ('ativo', 'ferias')
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ferias_balance_pk
  ON mv_ferias_balance (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_mv_ferias_balance_dept
  ON mv_ferias_balance (empresa_id, departamento, saldo_dias DESC);

-- ── 5. mv_afastamento_summary ─────────────────────────────────
-- Resumo de afastamentos por tipo + custo (se disponível).
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_afastamento_summary
WITH (fillfactor = 80) AS
SELECT
  a.empresa_id,
  DATE_TRUNC('month', a.data_inicio)::DATE AS mes,
  a.tipo_afastamento,
  COUNT(*)                                            AS total_afastamentos,
  SUM(a.dias_afastamento) FILTER (WHERE a.dias_afastamento IS NOT NULL)
                                                      AS dias_totais,
  AVG(a.dias_afastamento) FILTER (WHERE a.dias_afastamento IS NOT NULL)
                                                      AS media_dias,
  COUNT(*) FILTER (WHERE a.status = 'ativo')         AS em_andamento,
  COUNT(*) FILTER (WHERE a.status = 'encerrado')     AS encerrados
FROM public.afastamentos a
WHERE a.data_inicio >= NOW() - INTERVAL '3 years'
GROUP BY 1, 2, 3
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_afastamento_summary_pk
  ON mv_afastamento_summary (empresa_id, mes, tipo_afastamento);

-- ── 6. View de refresh status ──────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_refresh_status AS
SELECT
  'mv_headcount_daily'         AS view_name, relname AS table_name,
  n_live_tup::BIGINT          AS row_count,
  last_vacuum, last_autovacuum, last_analyze, last_autoanalyze,
  GREATEST(COALESCE(last_autovacuum, last_vacuum),
           COALESCE(last_autoanalyze, last_analyze)) AS last_refresh_hint
FROM pg_stat_user_tables
JOIN pg_class ON relname = 'mv_headcount_daily'
UNION ALL
SELECT 'mv_folha_summary', relname, n_live_tup::BIGINT,
  last_vacuum, last_autovacuum, last_analyze, last_autoanalyze,
  GREATEST(COALESCE(last_autovacuum, last_vacuum),
           COALESCE(last_autoanalyze, last_analyze))
FROM pg_stat_user_tables JOIN pg_class ON relname = 'mv_folha_summary'
UNION ALL
SELECT 'mv_turnover_rate', relname, n_live_tup::BIGINT,
  last_vacuum, last_autovacuum, last_analyze, last_autoanalyze,
  GREATEST(COALESCE(last_autovacuum, last_vacuum),
           COALESCE(last_autoanalyze, last_analyze))
FROM pg_stat_user_tables JOIN pg_class ON relname = 'mv_turnover_rate'
UNION ALL
SELECT 'mv_ferias_balance', relname, n_live_tup::BIGINT,
  last_vacuum, last_autovacuum, last_analyze, last_autoanalyze,
  GREATEST(COALESCE(last_autovacuum, last_vacuum),
           COALESCE(last_autoanalyze, last_analyze))
FROM pg_stat_user_tables JOIN pg_class ON relname = 'mv_ferias_balance'
UNION ALL
SELECT 'mv_afastamento_summary', relname, n_live_tup::BIGINT,
  last_vacuum, last_autovacuum, last_analyze, last_autoanalyze,
  GREATEST(COALESCE(last_autovacuum, last_vacuum),
           COALESCE(last_autoanalyze, last_analyze))
FROM pg_stat_user_tables JOIN pg_class ON relname = 'mv_afastamento_summary';

-- ── 7. Função de refresh com concurrently (não bloqueia reads) ─
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'Refresh dashboards: starting at %', NOW();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_headcount_daily;
  RAISE NOTICE '  mv_headcount_daily OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_summary;
  RAISE NOTICE '  mv_folha_summary OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_turnover_rate;
  RAISE NOTICE '  mv_turnover_rate OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ferias_balance;
  RAISE NOTICE '  mv_ferias_balance OK';
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_afastamento_summary;
  RAISE NOTICE '  mv_afastamento_summary OK — done at %', NOW();
END;
$$;

COMMENT ON FUNCTION public.refresh_dashboard_views() IS
  'P4-072: Refresh todas as materialized views de dashboard. Rodar via cron às 5h BRT. Usa CONCURRENTLY (não bloqueia reads).';

-- ── 8. Agendamento pg_cron (descomentar após habilitar extensão) ─
-- Requer: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-dashboards', '0 5 * * *', 'SELECT refresh_dashboard_views()');

-- ── 9. População inicial ────────────────────────────────────
REFRESH MATERIALIZED VIEW mv_headcount_daily;
REFRESH MATERIALIZED VIEW mv_folha_summary;
REFRESH MATERIALIZED VIEW mv_turnover_rate;
REFRESH MATERIALIZED VIEW mv_ferias_balance;
REFRESH MATERIALIZED VIEW mv_afastamento_summary;

COMMIT;
