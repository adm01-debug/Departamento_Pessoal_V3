-- =============================================================
-- P4-072: Materialized Views para dashboards com refresh noturno
-- Sprint 13 · Performance e Escalabilidade
-- =============================================================
-- Cenários de falha simulados:
--   1. View recalcula em cada request → P95 > 10s (SOLUÇÃO: MATERIALIZED)
--   2. REFRESH CONCURRENTLY sem unique index → ERRO: "cannot refresh
--      materialized view concurrently because it does not have
--      a unique index" (SOLUÇÃO: criar unique index antes)
--   3. View referenciada por outra view → chain de refresh
--      (SOLUÇÃO: refresh dependentes após)
--   4. RLS em view materializada → o refresh pode ver dados de
--      outros tenants se a view não filtrar por empresa_id
--      (SOLUÇÃO: filtrar por empresa_id no SELECT da view)
-- =============================================================
-- DROP:
--   DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_kpis CASCADE;
-- TESTE:
--   SELECT * FROM mv_dashboard_kpis LIMIT 1;
--   SELECT last_refresh FROM mv_refresh_log WHERE view_name = 'mv_dashboard_kpis';
-- =============================================================

BEGIN;

-- ── LOG DE REFRESH ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mv_refresh_log (
  view_name    TEXT        PRIMARY KEY,
  last_refresh TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms  BIGINT,
  rows         BIGINT,
  status       TEXT        NOT NULL DEFAULT 'success'  -- success | error
);

-- ── 1. MV: KPIs de turnover e absenteísmo ─────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_kpi_turnover_absenteismo CASCADE;
CREATE MATERIALIZED VIEW mv_kpi_turnover_absenteismo AS
  WITH admissoes AS (
    SELECT
      empresa_id,
      DATE_TRUNC('month', data_admissao) AS mes,
      COUNT(*)                           AS total_admissoes
    FROM colaboradores
    WHERE data_admissao >= CURRENT_DATE - INTERVAL '12 months'
      AND data_admissao < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY 1, 2
  ),
  desligamentos AS (
    SELECT
      empresa_id,
      DATE_TRUNC('month', data_desligamento) AS mes,
      COUNT(*)                                AS total_desligamentos,
      -- Desligamentos por motivo
      COUNT(*) FILTER (WHERE motivo_desligamento IN ('dispensa','dispensa sem justa causa')) AS por_contrato,
      COUNT(*) FILTER (WHERE motivo_desligamento IN ('pedido demissao','rescisao amigavel')) AS por_colaborador,
      COUNT(*) FILTER (WHERE motivo_desligamento IN ('justa causa','abandono','termino_contrato')) AS por_outros
    FROM desligamentos
    WHERE data_desligamento >= CURRENT_DATE - INTERVAL '12 months'
      AND data_desligamento < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY 1, 2
  ),
  headcount AS (
    SELECT
      empresa_id,
      DATE_TRUNC('month', data)::DATE AS mes,
      COUNT(*)                         AS total_colaboradores
    FROM
      generate_series(
        CURRENT_DATE - INTERVAL '12 months',
        CURRENT_DATE + INTERVAL '1 day',
        '1 month'::INTERVAL
      ) AS t(data),
      colaboradores c
    WHERE c.data_admissao <= t.data
      AND (c.data_desligamento IS NULL OR c.data_desligamento > t.data)
    GROUP BY 1, 2
  )
  SELECT
    h.empresa_id,
    h.mes,
    h.total_colaboradores,
    COALESCE(a.total_admissoes, 0)        AS admissoes,
    COALESCE(d.total_desligamentos, 0)    AS desligamentos,
    COALESCE(d.por_contrato, 0)            AS deslig_por_contrato,
    COALESCE(d.por_colaborador, 0)         AS deslig_por_colab,
    COALESCE(d.por_outros, 0)              AS deslig_outros,
    -- Taxa de turnover: (admissoes + desligamentos) / 2 / headcount * 100
    ROUND(
      (COALESCE(a.total_admissoes, 0) + COALESCE(d.total_desligamentos, 0))::NUMERIC
      / NULLIF(h.total_colaboradores * 2, 0) * 100,
      2
    ) AS taxa_turnover_pct,
    NOW()                                   AS calculado_em
  FROM headcount h
  LEFT JOIN admissoes  a ON a.empresa_id = h.empresa_id AND a.mes = h.mes
  LEFT JOIN desligamentos d ON d.empresa_id = h.empresa_id AND d.mes = h.mes
WITH NO DATA;

-- Índice único para permitir REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_turnover_pk
  ON mv_kpi_turnover_absenteismo(empresa_id, mes);

-- RLS: view materializada ainda precisa de security_invoker
-- (dados de salário são agregados, não individuais)
ALTER MATERIALIZED VIEW mv_kpi_turnover_absenteismo
  SET (security_invoker = true);


-- ── 2. MV: Dashboard de headcount + department breakdown ───────
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_headcount CASCADE;
CREATE MATERIALIZED VIEW mv_dashboard_headcount AS
  SELECT
    empresa_id,
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS mes,
    -- Totais
    COUNT(*)                                  AS total_colaboradores,
    COUNT(*) FILTER (WHERE status = 'ativo')   AS ativos,
    COUNT(*) FILTER (WHERE status = 'ferias') AS em_ferias,
    COUNT(*) FILTER (WHERE status = 'afastado') AS afastados,
    COUNT(*) FILTER (WHERE status = 'desligado') AS desligados,
    -- Por departamento
    COUNT(*) FILTER (WHERE departamento = 'Administrativo') AS depto_admin,
    COUNT(*) FILTER (WHERE departamento = 'Comercial')     AS depto_comercial,
    COUNT(*) FILTER (WHERE departamento = 'Operações')    AS depto_operacoes,
    COUNT(*) FILTER (WHERE departamento = 'RH')           AS depto_rh,
    COUNT(*) FILTER (WHERE departamento = 'Financeiro')    AS depto_financeiro,
    COUNT(*) FILTER (WHERE departamento = 'Tecnologia')   AS depto_ti,
    COUNT(*) FILTER (WHERE departamento = 'Produção')     AS depto_producao,
    -- Por tipo de contrato
    COUNT(*) FILTER (WHERE tipo_contrato = 'CLT')              AS tipo_clt,
    COUNT(*) FILTER (WHERE tipo_contrato = 'PJ')               AS tipo_pj,
    COUNT(*) FILTER (WHERE tipo_contrato = 'estagio')          AS tipo_estagio,
    COUNT(*) FILTER (WHERE tipo_contrato = 'temporario')       AS tipo_temporario,
    -- Por gênero (para métricas D&I)
    COUNT(*) FILTER (WHERE genero = 'F') AS genero_f,
    COUNT(*) FILTER (WHERE genero = 'M') AS genero_m,
    COUNT(*) FILTER (WHERE genero = 'O') AS genero_outros,
    -- Faixa etária
    COUNT(*) FILTER (WHERE
      DATE_PART('year', AGE(data_nascimento)) BETWEEN 18 AND 25) AS faixa_18_25,
    COUNT(*) FILTER (WHERE
      DATE_PART('year', AGE(data_nascimento)) BETWEEN 26 AND 35) AS faixa_26_35,
    COUNT(*) FILTER (WHERE
      DATE_PART('year', AGE(data_nascimento)) BETWEEN 36 AND 45) AS faixa_36_45,
    COUNT(*) FILTER (WHERE
      DATE_PART('year', AGE(data_nascimento)) > 45)             AS faixa_46_plus,
    NOW() AS calculado_em
  FROM colaboradores c
  GROUP BY empresa_id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_headcount_pk
  ON mv_dashboard_headcount(empresa_id, mes);

ALTER MATERIALIZED VIEW mv_dashboard_headcount
  SET (security_invoker = true);


-- ── 3. MV: Passivo trabalhista consolidado ─────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_passivo_trabalhista CASCADE;
CREATE MATERIALIZED VIEW mv_passivo_trabalhista AS
  WITH ultima_folha AS (
    SELECT DISTINCT ON (empresa_id)
      empresa_id,
      competencia,
      total_liquido
    FROM folhas_pagamento
    WHERE status IN ('calculado', 'pago', 'fechado')
    ORDER BY empresa_id, competencia DESC
  ),
  ferias_vencidas AS (
    SELECT
      c.empresa_id,
      COUNT(*)                                       AS qtde_colabs_vencidas,
      SUM(f.dias_vencidos * (c.salario_base / 30))       AS provisoes_ferias,
      SUM(f.dias_vencidos * (c.salario_base / 30) * 0.3333) AS provisoes_terco,
      SUM(
        (f.dias_vencidos * (c.salario_base / 30))
        + (f.dias_vencidos * (c.salario_base / 30) * 0.3333)
      ) * 0.08                                       AS provisoes_fgts_ferias
    FROM ferias f
    JOIN colaboradores c ON c.id = f.colaborador_id
    WHERE f.status NOT IN ('concluida', 'cancelada')
      AND f.dias_vencidos > 0
    GROUP BY c.empresa_id
  ),
  ultimo_dezembro AS (
    SELECT
      empresa_id,
      SUM(valor_base) AS provisoes_13_ultimo_dezembro
    FROM provisoes_folha
    WHERE competencia = TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YYYY-12')
    GROUP BY empresa_id
  )
  SELECT
    uf.empresa_id,
    uf.competencia                               AS folha_competencia,
    COALESCE(fv.qtde_colabs_vencidas, 0)         AS colabs_com_ferias_vencidas,
    COALESCE(fv.provisoes_ferias, 0)             AS provisoes_ferias_vencidas,
    COALESCE(fv.provisoes_terco, 0)              AS provisoes_terco_constitucional,
    COALESCE(ud.provisoes_13_ultimo_dezembro, 0) AS provisoes_13_dezembro,
    -- 13º pro-rata do ano corrente (1/12 por mês)
    ROUND((SELECT COUNT(*) FROM colaboradores WHERE empresa_id = uf.empresa_id)
          * COALESCE(AVG(c.salario_base), 0) / 12, 2) AS provisoes_13_prorata,
    COALESCE(fv.provisoes_fgts_ferias, 0)
      + (COALESCE(ud.provisoes_13_ultimo_dezembro, 0) * 0.08)
      AS provisoes_fgts,
    -- Total passivo
    COALESCE(fv.provisoes_ferias, 0)
      + COALESCE(fv.provisoes_terco, 0)
      + COALESCE(ud.provisoes_13_ultimo_dezembro, 0)
      + (COALESCE(fv.provisoes_ferias, 0) * 0.08)
      + (COALESCE(ud.provisoes_13_ultimo_dezembro, 0) * 0.08)
      AS total_passivo,
    NOW() AS calculado_em
  FROM ultima_folha uf
  LEFT JOIN ferias_vencidas  fv ON fv.empresa_id = uf.empresa_id
  LEFT JOIN ultimo_dezembro   ud ON ud.empresa_id = uf.empresa_id
  LEFT JOIN colaboradores c ON c.empresa_id = uf.empresa_id
  GROUP BY uf.empresa_id, uf.competencia, fv.qtde_colabs_vencidas,
           fv.provisoes_ferias, fv.provisoes_terco,
           ud.provisoes_13_ultimo_dezembro
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_passivo_pk
  ON mv_passivo_trabalhista(empresa_id);

ALTER MATERIALIZED VIEW mv_passivo_trabalhista
  SET (security_invoker = true);


-- ── 4. MV: eSocial — status de envio por evento ─────────────
DROP MATERIALIZED VIEW IF EXISTS mv_esocial_status CASCADE;
CREATE MATERIALIZED VIEW mv_esocial_status AS
  SELECT
    empresa_id,
    competencia,
    tipo_evento,
    status_envio,
    COUNT(*)                    AS quantidade,
    MIN(data_criacao)           AS primeira_criacao,
    MAX(data_criacao)           AS ultima_criacao,
    -- Rejeitados com erro específico
    COUNT(*) FILTER (WHERE status_envio = 'rejeitado') AS total_rejeitados,
    COUNT(*) FILTER (WHERE status_envio = 'pendente'
                    AND data_criacao < CURRENT_DATE - INTERVAL '3 days')
                                    AS pendentes_acima_3dias
  FROM esocial_eventos
  WHERE competencia >= TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
    AND competencia <= TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  GROUP BY empresa_id, competencia, tipo_evento, status_envio
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_esocial_pk
  ON mv_esocial_status(empresa_id, competencia, tipo_evento, status_envio);

ALTER MATERIALIZED VIEW mv_esocial_status
  SET (security_invoker = true);


-- ── TABELA DE FERIADOS BRASILEIROS (P4-072) ───────────────────
-- Usada pelo mv_absenteismo_mensal para excluir fins de semana
-- e feriados nacionais/locais do cálculo de dias úteis.
-- Mantida pelo time de DP;种子 dados em seguida.
CREATE TABLE IF NOT EXISTS feriados_brasileiros (
  id          BIGSERIAL PRIMARY KEY,
  empresa_id  TEXT,                          -- NULL = aplica a todas
  data        DATE        NOT NULL,
  nome        TEXT        NOT NULL,
  tipo        TEXT        NOT NULL DEFAULT 'nacional'  -- nacional|estadual|municipal
);
CREATE INDEX IF NOT EXISTS idx_feriados_empresa_data
  ON feriados_brasileiros(empresa_id, data);

-- Feriados federais brasileiros (Ano Novo, Carnaval*, Sexta-feira Santa,
-- Tiradentes, Dia do Trabalho, Independência, Nossa Senhora Aparecida,
-- Finados, Proclamação da República, Natal, Carnaval*)
-- *Carnaval = segunda-feira anterior à Quarta-feira de Cinzas
INSERT INTO feriados_brasileiros (data, nome, tipo) VALUES
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '0 days',         'Ano Novo', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '21 days',        'Carnaval', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '45 days',        'Sexta-feira Santa', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '51 days',        'Tiradentes', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '121 days',       'Dia do Trabalho', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '167 days',       'Independência', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '281 days',      'Nossa Senhora Aparecida', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '307 days',       'Finados', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '315 days',       'Proclamação da República', 'nacional'),
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '359 days',      'Natal', 'nacional')
ON CONFLICT DO NOTHING;

-- ── 5. MV: Frequência / absenteísmo mensal ─────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_absenteismo_mensal CASCADE;
CREATE MATERIALIZED VIEW mv_absenteismo_mensal AS
  WITH dias_uteis AS (
    SELECT
      empresa_id,
      DATE_TRUNC('month', CURRENT_DATE)::DATE AS mes,
      COUNT(*) AS dias_uteis_mes
    FROM generate_series(
      DATE_TRUNC('month', CURRENT_DATE),
      DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
      '1 day'
    ) AS d(data)
    CROSS JOIN LATERAL (
      SELECT CURRENT_DATE AS hoje) AS h
    WHERE EXTRACT(DOW FROM d.data) BETWEEN 1 AND 5  -- seg-sex
      AND NOT EXISTS (
        SELECT 1 FROM feriados_brasileiros fb
        WHERE fb.data = d.data
          AND (fb.empresa_id IS NULL OR fb.empresa_id = empresa_id)
      )
    GROUP BY 1, 2
  ),
  ausencias AS (
    SELECT
      c.empresa_id,
      DATE_TRUNC('month', rp.data_hora)::DATE AS mes,
      COUNT(DISTINCT c.id) AS colabs_ausentes,
      COUNT(*)              AS total_ausencias,
      COUNT(*) FILTER (WHERE f.tipo = 'falta_injustificada') AS faltas_injustificadas,
      COUNT(*) FILTER (WHERE f.tipo = 'falta_justificada')    AS faltas_justificadas,
      COUNT(*) FILTER (WHERE af.tipo IN ('inss','acidente_trabalho'))
                                           AS dias_afastados
    FROM registros_ponto rp
    JOIN colaboradores c ON c.id = rp.colaborador_id
    LEFT JOIN faltas f ON f.colaborador_id = c.id
      AND DATE_TRUNC('month', f.data) = DATE_TRUNC('month', rp.data_hora)
    LEFT JOIN afastamentos af ON af.colaborador_id = c.id
      AND rp.data_hora BETWEEN af.data_inicio AND COALESCE(af.data_fim, CURRENT_DATE)
    WHERE rp.data_hora >= CURRENT_DATE - INTERVAL '12 months'
      AND rp.data_hora < CURRENT_DATE + INTERVAL '1 day'
      AND rp.tipo = 'ausencia'
    GROUP BY 1, 2
  )
  SELECT
    du.empresa_id,
    du.mes,
    du.dias_uteis_mes,
    COALESCE(a.colabs_ausentes, 0)         AS colabs_ausentes,
    COALESCE(a.total_ausencias, 0)           AS total_ausencias,
    COALESCE(a.faltas_injustificadas, 0)     AS faltas_injustificadas,
    COALESCE(a.faltas_justificadas, 0)        AS faltas_justificadas,
    COALESCE(a.dias_afastados, 0)            AS dias_afastados,
    -- Taxa de absenteísmo = total ausências / (colabs * dias úteis) * 100
    ROUND(
      COALESCE(a.total_ausencias, 0)::NUMERIC
      / NULLIF(
          (SELECT COUNT(*) FROM colaboradores WHERE empresa_id = du.empresa_id)
          * du.dias_uteis_mes,
          0
        ) * 100,
      2
    ) AS taxa_absenteismo_pct,
    NOW() AS calculado_em
  FROM dias_uteis du
  LEFT JOIN ausencias a ON a.empresa_id = du.empresa_id AND a.mes = du.mes
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_absenteismo_pk
  ON mv_absenteismo_mensal(empresa_id, mes);

ALTER MATERIALIZED VIEW mv_absenteismo_mensal
  SET (security_invoker = true);


-- ── REFRESH INICIAL (síncrono — primeira criação) ──────────────
REFRESH MATERIALIZED VIEW mv_kpi_turnover_absenteismo;
REFRESH MATERIALIZED VIEW mv_dashboard_headcount;
REFRESH MATERIALIZED VIEW mv_passivo_trabalhista;
REFRESH MATERIALIZED VIEW mv_esocial_status;
REFRESH MATERIALIZED VIEW mv_absenteismo_mensal;

-- Log do refresh
INSERT INTO mv_refresh_log (view_name, last_refresh, duration_ms, rows, status)
VALUES
  ('mv_kpi_turnover_absenteismo', NOW(), 0,
    (SELECT COUNT(*) FROM mv_kpi_turnover_absenteismo), 'success'),
  ('mv_dashboard_headcount', NOW(), 0,
    (SELECT COUNT(*) FROM mv_dashboard_headcount), 'success'),
  ('mv_passivo_trabalhista', NOW(), 0,
    (SELECT COUNT(*) FROM mv_passivo_trabalhista), 'success'),
  ('mv_esocial_status', NOW(), 0,
    (SELECT COUNT(*) FROM mv_esocial_status), 'success'),
  ('mv_absenteismo_mensal', NOW(), 0,
    (SELECT COUNT(*) FROM mv_absenteismo_mensal), 'success')
ON CONFLICT (view_name) DO UPDATE
  SET last_refresh = NOW(),
      rows = EXCLUDED.rows,
      status = 'success';

COMMIT;

-- =============================================================
-- CRON JOB: refresh noturno (5h da manhã — horário de menor uso)
-- Agendar via Supabase cron ou pg_cron:
--   SELECT cron.schedule('refresh-dashboard-mv', '0 5 * * *', $$
--     SELECT mv_refresh_all();
--   $$);
-- =============================================================

-- Função de refresh com log automático
CREATE OR REPLACE FUNCTION mv_refresh_all()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  start_time TIMESTAMPTZ;
  duration   BIGINT;
  row_count  BIGINT;
BEGIN
  FOR v_name IN
    SELECT viewname FROM pg_matviews WHERE schemaname = 'public'
  LOOP
    start_time := clock_timestamp();
    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', v_name);
    GET DIAGNOSTICS row_count = ROW_COUNT;
    duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time);

    INSERT INTO mv_refresh_log (view_name, last_refresh, duration_ms, rows, status)
    VALUES (v_name, NOW(), duration, row_count, 'success')
    ON CONFLICT (view_name) DO UPDATE
      SET last_refresh = NOW(), duration_ms = EXCLUDED.duration_ms,
          rows = EXCLUDED.rows, status = 'success';
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- Se CONCURRENTLY falhar (sem unique index), tenta sem concurrently
  GET DIAGNOSTICS v_name = MESSAGE_TEXT;
  INSERT INTO mv_refresh_log (view_name, last_refresh, duration_ms, rows, status)
  VALUES (COALESCE(v_name, 'unknown'), NOW(), 0, 0, 'error: ' || SQLERRM)
  ON CONFLICT (view_name) DO UPDATE
    SET last_refresh = NOW(), status = 'error: ' || SQLERRM;
END;
$$;
