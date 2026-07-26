-- ============================================================
-- P5-077: Passivo Trabalhista — materialized views + refresh
-- Criado: 2026-07-25
-- Origem: PLANO_MELHORIAS.md P5-077
--
-- Passivo trabalhista = provisões contábeis de obrigações
-- trabalhistas futuras. Componentes:
--   1. Férias (1/12 por mês gozado + 1/3 adicional)
--   2. 13º salário (1/12 por mês trabalhado)
--   3. FGTS (8% sobre salário bruto mensal)
--   4. FGTS multa 40% (devido apenas no desligamento)
--   5. INSS empregador (20% sobre salário + 3% RAT + 8% Salário-Educação)
--
-- Ref.: AUDIT_REPORT.md §4 item 1 — alta prioridade.
-- Views existentes: vw_passivo_trabalhista_consolidado (validar).
-- ============================================================

BEGIN;

-- ── 1. View: saldo de férias por colaborador ──────────────────
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_saldo_ferias
WITH (timescaledb.continuous) AS
SELECT
  c.id                              AS colaborador_id,
  c.empresa_id,
  c.nome                            AS colaborador_nome,
  c.data_admissao,
  -- Períodos aquisitivos
  pa.periodo_inicio,
  pa.periodo_fim,
  pa.dias_ferias_totais,
  pa.dias_ferias_gozados,
  (pa.dias_ferias_totais - COALESCE(pa.dias_ferias_gozados, 0))::INTEGER AS dias_saldo,
  -- Valor (usa salário atual do colaborador)
  c.salario,
  ROUND(
    (c.salario / 30) * (pa.dias_ferias_totais - COALESCE(pa.dias_ferias_gozados, 0))
    + (((c.salario / 30) * (pa.dias_ferias_totais - COALESCE(pa.dias_ferias_gozados, 0))) / 3)
  , 2)                              AS valor_provisao_ferias,
  -- Provisão mensal de férias (1/12 do total por mês)
  ROUND(
    ((c.salario / 30) * pa.dias_ferias_totais / 12)
    + (((c.salario / 30) * pa.dias_ferias_totais / 12) / 3)
  , 2)                              AS provisao_mensal_ferias,
  pa.status                          AS status_periodo,
  NOW()                             AS computed_at
FROM public.colaboradores c
JOIN public.periodos_aquisitivos pa ON pa.colaborador_id = c.id
WHERE c.status IN ('ativo', 'ferias')
  AND pa.status != 'cancelado'
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_saldo_ferias_pk
  ON public.mv_saldo_ferias (colaborador_id, periodo_inicio);

CREATE INDEX IF NOT EXISTS idx_mv_saldo_ferias_empresa
  ON public.mv_saldo_ferias (empresa_id, computed_at DESC);

-- ── 2. View: provisão de 13º ──────────────────────────────────
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_provisao_13
WITH (timescaledb.continuous) AS
SELECT
  c.id                              AS colaborador_id,
  c.empresa_id,
  c.nome                            AS colaborador_nome,
  c.salario,
  -- 13º = 1/12 do salário por mês trabalhado (até novembro)
  -- Provisão mensal = salário / 12
  ROUND(c.salario / 12, 2)          AS provisao_mensal_13,
  -- 13º devido até 20/12: quantos meses do ano já passaram?
  GREATEST(0, EXTRACT(MONTH FROM CURRENT_DATE) - 1) AS meses_devidos,
  ROUND(
    c.salario / 12 * GREATEST(0, EXTRACT(MONTH FROM CURRENT_DATE) - 1)
  , 2)                              AS valor_acumulado_13,
  -- 13º completo (dezembro): salário integral
  CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 12 THEN c.salario
    ELSE 0
  END                               AS valor_dezembro,
  c.data_admissao,
  -- Primeiro ano: fração do ano
  CASE
    WHEN EXTRACT(YEAR FROM c.data_admissao) = EXTRACT(YEAR FROM CURRENT_DATE)
    THEN ROUND(c.salario / 12 * EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.data_admissao)), 2)
    ELSE 0
  END                               AS fracao_primeiro_ano,
  NOW()                             AS computed_at
FROM public.colaboradores c
WHERE c.status IN ('ativo', 'ferias')
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_provisao_13_pk
  ON public.mv_provisao_13 (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_mv_provisao_13_empresa
  ON public.mv_provisao_13 (empresa_id);

-- ── 3. View: FGTS mensal e multa ───────────────────────────────
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_fgts_passivo
WITH (timescaledb.continuous) AS
SELECT
  c.id                              AS colaborador_id,
  c.empresa_id,
  c.nome                            AS colaborador_nome,
  c.salario,
  -- FGTS empregador = 8% do salário
  ROUND(c.salario * 0.08, 2)       AS fgts_mensal,
  -- Provisão mensal de FGTS = salário / 12 * 0.08
  ROUND(c.salario * 0.08 / 12, 2)  AS provisao_mensal_fgts,
  -- Multa 40% sobre saldo (devida apenas no desligamento)
  -- Estimativa: salário * 3.2 (≈ saldo de 8% * 40% de 12 meses)
  ROUND(c.salario * 3.2, 2)        AS provisao_multa_estimada,
  -- INSS Patronal: 20% + 3% RAT + 8% Salário-Educação = 31%
  ROUND(c.salario * 0.31 / 12, 2) AS provisao_inss_patronal_mensal,
  c.data_admissao,
  c.data_desligamento,
  CASE WHEN c.data_desligamento IS NOT NULL THEN true ELSE false END AS is_desligado,
  NOW()                             AS computed_at
FROM public.colaboradores c
WHERE c.status IN ('ativo', 'ferias', 'desligado')
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_fgts_passivo_pk
  ON public.mv_fgts_passivo (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_mv_fgts_passivo_empresa
  ON public.mv_fgts_passivo (empresa_id);

-- ── 4. View consolidada: passivo total ─────────────────────────
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_passivo_trabalhista
WITH (timescaledb.continuous) AS
SELECT
  f.empresa_id,
  f.colaborador_id,
  f.colaborador_nome,
  COALESCE(ferias.valor_provisao_ferias, 0)         AS provisao_ferias,
  COALESCE(ferias.provisao_mensal_ferias, 0)        AS provisao_mensal_ferias,
  COALESCE(t13.valor_acumulado_13, 0)              AS provisao_13,
  COALESCE(t13.provisao_mensal_13, 0)              AS provisao_mensal_13,
  COALESCE(fgts.provisao_mensal_fgts, 0)           AS provisao_mensal_fgts,
  CASE
    WHEN fgts.is_desligado THEN COALESCE(fgts.provisao_multa_estimada, 0)
    ELSE 0
  END                                              AS provisao_multa_fgts,
  COALESCE(fgts.provisao_inss_patronal_mensal, 0) AS provisao_inss_patronal,
  -- TOTAL: soma de todos os componentes
  (
    COALESCE(ferias.valor_provisao_ferias, 0)
    + COALESCE(t13.valor_acumulado_13, 0)
    + COALESCE(fgts.provisao_mensal_fgts, 0)
    + CASE WHEN fgts.is_desligado THEN COALESCE(fgts.provisao_multa_estimada, 0) ELSE 0 END
    + COALESCE(fgts.provisao_inss_patronal_mensal, 0)
  )::DECIMAL(15,2)                                 AS total_passivo,
  -- TOTAL mensal (para provisionamento contábil mensal)
  (
    COALESCE(ferias.provisao_mensal_ferias, 0)
    + COALESCE(t13.provisao_mensal_13, 0)
    + COALESCE(fgts.provisao_mensal_fgts, 0)
    + COALESCE(fgts.provisao_inss_patronal_mensal, 0)
  )::DECIMAL(15,2)                                AS total_provisao_mensal,
  f.data_admissao,
  f.salario,
  f.data_desligamento,
  fgts.is_desligado,
  NOW()                                           AS computed_at
FROM public.mv_fgts_passivo f
LEFT JOIN public.mv_saldo_ferias     ferias ON ferias.colaborador_id = f.colaborador_id
LEFT JOIN public.mv_provisao_13       t13    ON t13.colaborador_id = f.colaborador_id
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_mv_passivo_empresa
  ON public.mv_passivo_trabalhista (empresa_id, total_passivo DESC);

CREATE INDEX IF NOT EXISTS idx_mv_passivo_colab
  ON public.mv_passivo_trabalhista (colaborador_id);

-- ── 5. Função de refresh ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_passivo_trabalhista()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_saldo_ferias;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_provisao_13;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_fgts_passivo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_passivo_trabalhista;
END;
$$;

COMMENT ON FUNCTION public.refresh_passivo_trabalhista IS
  'P5-077: Atualiza todas as MVs de passivo trabalhista. Agendar via cron (diário às 23h BRT).';

-- ── 6. View rápida (não-materialized): status atual por empresa ─
CREATE OR REPLACE VIEW public.v_passivo_summary AS
SELECT
  empresa_id,
  COUNT(*)                                         AS total_colaboradores,
  SUM(total_passivo)::DECIMAL(15,2)                AS total_passivo_empresa,
  SUM(provisao_ferias)::DECIMAL(15,2)             AS total_ferias,
  SUM(provisao_13)::DECIMAL(15,2)                  AS total_13,
  SUM(provisao_mensal_fgts)::DECIMAL(15,2)       AS total_fgts_mensal,
  SUM(provisao_multa_fgts)::DECIMAL(15,2)         AS total_multa_fgts,
  SUM(total_provisao_mensal)::DECIMAL(15,2)       AS total_provisao_mensal,
  AVG(total_passivo / NULLIF(salario, 0))::DECIMAL(5,2) AS meses_salarios_passivo,
  MAX(computed_at)                                 AS ultimo_calculo,
  COUNT(CASE WHEN is_desligado THEN 1 END)         AS desligados_com_passivo
FROM public.mv_passivo_trabalhista
GROUP BY empresa_id;

COMMENT ON VIEW public.v_passivo_summary IS
  'P5-077: Resumo consolidado de passivo trabalhista por empresa. Atualizado junto com refresh_passivo_trabalhista().';

-- ── 7. Cron: refresh diário às 23h BRT ─────────────────────────
-- ATIVAR APÓS validação em staging:
-- SELECT cron.schedule('refresh-passivo-23h', '0 23 * * *', 'SELECT public.refresh_passivo_trabalhista();');

COMMIT;
