-- ============================================================
-- P5-077: Passivo Trabalhista — materialized views + refresh
-- Criado: 2026-07-25  |  Corrigido: 2026-07-25 (auditoria exaustiva)
-- Origem: PLANO_MELHORIAS.md P5-077
--
-- AUDITORIA DE COLUNAS (2026-07-25):
--   colaboradores     : salario EXISTS, empresa_id EXISTS, data_admissao EXISTS, data_desligamento=ISNULL
--   ferias            : empresa_id EXISTS, status EXISTS, created_at EXISTS
--                      periodo_aquisitivo_inicio/fim (não periodo_inicio/fim)
--                      dias_gozo=total dias fruídos (não dias_ferias_totais)
--                      dias_abono, dias_vendidos EXIST
--                      SEM "dias_ferias_gozados" — usar dias_gozo
--   provisoes_folha   : empresa_id EXISTS, competencia EXISTS
--                      valor_ferias (não valor_provisao)
--                      valor_13_salario (não 13_provisao)
--   TimescaleDB       : NÃO DISPONÍVEL em Supabase standard
--                      → REMOVIDO "WITH (timescaledb.continuous)"
--
-- Passivo trabalhista = provisões contábeis de obrigações trabalhistas futuras:
--   1. Férias (1/12 por mês gozado + 1/3 adicional CLT)
--   2. 13º salário (1/12 por mês trabalhado)
--   3. FGTS (8% sobre salário bruto mensal)
--   4. FGTS multa 40% (devida apenas no desligamento)
--   5. INSS empregador (20% + 3% RAT + 8% Salário-Educação = 31%)
-- ============================================================

BEGIN;

-- ── 1. View: saldo de férias por colaborador ──────────────────
-- Tabela: ferias
-- Colunas reais: periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
--                dias_gozo (total dias fruídos), dias_abono, dias_vendidos
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_saldo_ferias AS
SELECT
  f.id                                  AS ferias_id,
  f.colaborador_id,
  c.empresa_id,
  c.nome                                AS colaborador_nome,
  c.data_admissao,
  f.periodo_aquisitivo_inicio,
  f.periodo_aquisitivo_fim,
  f.dias_gozo                           AS dias_totais,
  -- Saldo = dias totais - dias já gojados (dias_gozo = dias já usados)
  -- CLT: 30 dias de férias = 22 dias úteis + 8 dias de abono
  -- Se dias_gozo = 0 → ainda não gozhou; se > 0 → já gojou
  GREATEST(0, 30 - COALESCE(f.dias_gozo, 0))::INTEGER AS dias_saldo,
  -- Provisão mensal de férias (1/12 do salário + 1/3 sobre o 1/12)
  -- = (salário / 30) * 30 / 12 * (1 + 1/3) = salário / 12 * 4/3
  ROUND(
    (c.salario / 12) * (1 + 1.0/3.0)
  , 2)                                  AS provisao_mensal_ferias,
  -- Valor total provisioned: saldo em dias × diária + 1/3
  ROUND(
    GREATEST(0, 30 - COALESCE(f.dias_gozo, 0)) * (c.salario / 30)
    + (GREATEST(0, 30 - COALESCE(f.dias_gozo, 0)) * (c.salario / 30) / 3)
  , 2)                                  AS valor_provisao_ferias,
  f.status                              AS status_periodo,
  f.dias_abono,
  f.dias_vendidos,
  c.salario,
  NOW()                                 AS computed_at
FROM public.ferias f
JOIN public.colaboradores c ON c.id = f.colaborador_id
WHERE c.status IN ('ativo', 'ferias')
  AND f.status NOT IN ('cancelado', 'excluido')
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_saldo_ferias_pk
  ON public.mv_saldo_ferias (ferias_id);

CREATE INDEX IF NOT EXISTS idx_mv_saldo_ferias_empresa
  ON public.mv_saldo_ferias (empresa_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_mv_saldo_ferias_colab
  ON public.mv_saldo_ferias (colaborador_id, periodo_aquisitivo_fim DESC);

-- ── 2. View: provisão de 13º ──────────────────────────────────
-- Colunas reais de colaboradores: salario EXISTS
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_provisao_13 AS
SELECT
  c.id                              AS colaborador_id,
  c.empresa_id,
  c.nome                            AS colaborador_nome,
  c.salario,
  -- Provisão mensal = salário / 12
  ROUND(c.salario / 12, 2)          AS provisao_mensal_13,
  -- Meses devidos até mês atual
  GREATEST(0, EXTRACT(MONTH FROM CURRENT_DATE) - 1) AS meses_devidos,
  -- Valor acumulado: salário / 12 × meses devidos
  ROUND(
    c.salario / 12 * GREATEST(0, EXTRACT(MONTH FROM CURRENT_DATE) - 1)
  , 2)                              AS valor_acumulado_13,
  -- 13º completo em dezembro
  CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 12
    THEN c.salario ELSE 0 END        AS valor_dezembro,
  -- Primeiro ano: fração proporcional
  CASE
    WHEN EXTRACT(YEAR FROM c.data_admissao) = EXTRACT(YEAR FROM CURRENT_DATE)
    THEN ROUND(c.salario / 12
      * GREATEST(0, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.data_admissao)))
    , 2)
    ELSE 0
  END                               AS fracao_primeiro_ano,
  c.data_admissao,
  NOW()                             AS computed_at
FROM public.colaboradores c
WHERE c.status IN ('ativo', 'ferias')
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_provisao_13_pk
  ON public.mv_provisao_13 (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_mv_provisao_13_empresa
  ON public.mv_provisao_13 (empresa_id);

-- ── 3. View: FGTS mensal e multa ───────────────────────────────
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_fgts_passivo AS
SELECT
  c.id                              AS colaborador_id,
  c.empresa_id,
  c.nome                            AS colaborador_nome,
  c.salario,
  -- FGTS empregador = 8% do salário
  ROUND(c.salario * 0.08, 2)      AS fgts_mensal,
  -- Provisão mensal de FGTS = salário / 12 * 0.08
  ROUND(c.salario * 0.08 / 12, 2) AS provisao_mensal_fgts,
  -- Multa 40% sobre saldo estimado (≈ salário × 3.2 = 8% × 40% × 12 meses)
  ROUND(c.salario * 3.2, 2)       AS provisao_multa_estimada,
  -- INSS Patronal: 20% + 3% RAT + 8% Salário-Educação = 31%
  ROUND(c.salario * 0.31 / 12, 2) AS provisao_inss_patronal_mensal,
  c.data_admissao,
  c.data_desligamento,
  (c.data_desligamento IS NOT NULL) AS is_desligado,
  NOW()                             AS computed_at
FROM public.colaboradores c
WHERE c.status IN ('ativo', 'ferias', 'desligado')
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_fgts_passivo_pk
  ON public.mv_fgts_passivo (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_mv_fgts_passivo_empresa
  ON public.mv_fgts_passivo (empresa_id);

-- ── 4. View consolidada: passivo total ─────────────────────────
CREATE OR REPLACE MATERIALIZED VIEW IF NOT EXISTS public.mv_passivo_trabalhista AS
SELECT
  f.empresa_id,
  f.colaborador_id,
  f.colaborador_nome,
  COALESCE(sf.valor_provisao_ferias, 0)       AS provisao_ferias,
  COALESCE(sf.provisao_mensal_ferias, 0)      AS provisao_mensal_ferias,
  COALESCE(t13.valor_acumulado_13, 0)          AS provisao_13,
  COALESCE(t13.provisao_mensal_13, 0)          AS provisao_mensal_13,
  COALESCE(fgts.provisao_mensal_fgts, 0)      AS provisao_mensal_fgts,
  CASE WHEN fgts.is_desligado
    THEN COALESCE(fgts.provisao_multa_estimada, 0) ELSE 0
  END                                        AS provisao_multa_fgts,
  COALESCE(fgts.provisao_inss_patronal_mensal, 0) AS provisao_inss_patronal,
  (
    COALESCE(sf.valor_provisao_ferias, 0)
    + COALESCE(t13.valor_acumulado_13, 0)
    + COALESCE(fgts.provisao_mensal_fgts, 0)
    + CASE WHEN fgts.is_desligado THEN COALESCE(fgts.provisao_multa_estimada, 0) ELSE 0 END
    + COALESCE(fgts.provisao_inss_patronal_mensal, 0)
  )::DECIMAL(15,2)                           AS total_passivo,
  (
    COALESCE(sf.provisao_mensal_ferias, 0)
    + COALESCE(t13.provisao_mensal_13, 0)
    + COALESCE(fgts.provisao_mensal_fgts, 0)
    + COALESCE(fgts.provisao_inss_patronal_mensal, 0)
  )::DECIMAL(15,2)                           AS total_provisao_mensal,
  f.data_admissao,
  f.salario,
  f.data_desligamento,
  fgts.is_desligado,
  f.computed_at,
  NOW()                                       AS updated_at
FROM public.mv_fgts_passivo f
LEFT JOIN public.mv_saldo_ferias sf  ON sf.colaborador_id = f.colaborador_id
LEFT JOIN public.mv_provisao_13  t13 ON t13.colaborador_id = f.colaborador_id
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_mv_passivo_empresa
  ON public.mv_passivo_trabalhista (empresa_id, total_passivo DESC);

CREATE INDEX IF NOT EXISTS idx_mv_passivo_colab
  ON public.mv_passivo_trabalhista (colaborador_id);

-- ── 5. Função de refresh (CONCURRENTLY para não bloquear reads) ─
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
  'P5-077: Atualiza todas as MVs de passivo trabalhista. Agendar via pg_cron (diário às 23h BRT). Não bloqueia leituras (CONCURRENTLY).';

-- ── 6. View rápida: resumo por empresa ─────────────────────────
CREATE OR REPLACE VIEW public.v_passivo_summary AS
SELECT
  empresa_id,
  COUNT(*)                                       AS total_colaboradores,
  SUM(total_passivo)::DECIMAL(15,2)             AS total_passivo_empresa,
  SUM(provisao_ferias)::DECIMAL(15,2)           AS total_ferias,
  SUM(provisao_13)::DECIMAL(15,2)               AS total_13,
  SUM(provisao_mensal_fgts)::DECIMAL(15,2)     AS total_fgts_mensal,
  SUM(provisao_multa_fgts)::DECIMAL(15,2)      AS total_multa_fgts,
  SUM(provisao_inss_patronal)::DECIMAL(15,2)   AS total_inss_patronal,
  SUM(total_provisao_mensal)::DECIMAL(15,2)     AS total_provisao_mensal,
  AVG(total_passivo / NULLIF(salario, 0))::DECIMAL(5,2) AS meses_salarios_passivo,
  MAX(updated_at)                               AS ultimo_calculo,
  COUNT(CASE WHEN is_desligado THEN 1 END)      AS desligados_com_passivo
FROM public.mv_passivo_trabalhista
GROUP BY empresa_id;

COMMENT ON VIEW public.v_passivo_summary IS
  'P5-077: Resumo consolidado de passivo trabalhista por empresa. Atualizar junto com refresh_passivo_trabalhista().';

-- ── 7. Cron: refresh diário às 23h BRT ──────────────────────
-- ATIVAR APÓS validação em staging:
-- SELECT cron.schedule(
--   'refresh-passivo-23h',
--   '0 23 * * *',
--   'SELECT public.refresh_passivo_trabalhista();'
-- );

COMMIT;
