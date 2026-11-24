-- ============================================================================
-- P0-007: Recria views com security_invoker = true
-- ----------------------------------------------------------------------------
-- Views sem security_invoker executam com privilégios do criador, contornando
-- RLS das tabelas subjacentes. Isso permitia vazamento cross-tenant.
-- Esta migration recria as 12 views principais usando security_invoker,
-- fazendo com que respeitem as RLS da tabela base.
-- ============================================================================

-- ---------- vw_dashboard_time ----------
DROP VIEW IF EXISTS public.vw_dashboard_time;
CREATE VIEW public.vw_dashboard_time
  WITH (security_invoker = true) AS
SELECT
  empresa_id,
  COUNT(*) FILTER (WHERE status = 'ativo')   AS total_ativos,
  COUNT(*) FILTER (WHERE status = 'ferias')  AS em_ferias,
  COUNT(*) FILTER (WHERE status = 'afastado') AS afastados,
  COUNT(*) FILTER (WHERE status = 'desligado') AS desligados,
  COUNT(*) AS total_geral
FROM public.colaboradores
GROUP BY empresa_id;

-- ---------- vw_colaboradores_completo ----------
DROP VIEW IF EXISTS public.vw_colaboradores_completo;
CREATE VIEW public.vw_colaboradores_completo
  WITH (security_invoker = true) AS
SELECT
  c.id, c.nome_completo, c.cpf, c.email, c.foto_url, c.status,
  c.salario_base AS salario, c.data_admissao, c.tipo_contrato,
  c.celular AS telefone_celular, c.departamento, c.cargo,
  c.empresa_id,
  EXTRACT(YEAR FROM age(now(), c.data_admissao::timestamp)) || ' anos e ' ||
  EXTRACT(MONTH FROM age(now(), c.data_admissao::timestamp)) || ' meses' AS tempo_casa,
  c.data_desligamento
FROM public.colaboradores c;

-- ---------- vw_alertas_rh ----------
DROP VIEW IF EXISTS public.vw_alertas_rh;
CREATE VIEW public.vw_alertas_rh
  WITH (security_invoker = true) AS
SELECT * FROM (
  SELECT
    c.id AS colaborador_id, c.nome_completo, c.empresa_id,
    'aniversario' AS tipo_alerta, 'info' AS severidade,
    'Aniversário em ' || TO_CHAR(c.data_nascimento::date, 'DD/MM') AS mensagem,
    c.data_nascimento::date AS data_referencia
  FROM public.colaboradores c
  WHERE c.status = 'ativo'
    AND EXTRACT(MONTH FROM c.data_nascimento::date) = EXTRACT(MONTH FROM CURRENT_DATE)
  UNION ALL
  SELECT c.id, c.nome_completo, c.empresa_id, 'aniversario_empresa', 'info',
    'Aniversário de empresa em ' || TO_CHAR(c.data_admissao::date, 'DD/MM'),
    c.data_admissao::date
  FROM public.colaboradores c
  WHERE c.status = 'ativo'
    AND EXTRACT(MONTH FROM c.data_admissao::date) = EXTRACT(MONTH FROM CURRENT_DATE)
) alerts
ORDER BY data_referencia;

-- ---------- vw_kpi_turnover ----------
DROP VIEW IF EXISTS public.vw_kpi_turnover;
CREATE VIEW public.vw_kpi_turnover
  WITH (security_invoker = true) AS
SELECT
  d.empresa_id,
  TO_CHAR(d.data_desligamento::date, 'YYYY-MM') AS mes,
  COUNT(*) AS desligamentos_mes,
  (SELECT COUNT(*) FROM public.colaboradores
     WHERE status = 'ativo' AND empresa_id = d.empresa_id) AS ativos_atual,
  ROUND(COUNT(*)::numeric / NULLIF(
    (SELECT COUNT(*) FROM public.colaboradores
       WHERE status = 'ativo' AND empresa_id = d.empresa_id), 0) * 100, 2
  ) AS taxa_turnover
FROM public.desligamentos d
WHERE d.data_desligamento IS NOT NULL
  AND d.data_desligamento::date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY d.empresa_id, TO_CHAR(d.data_desligamento::date, 'YYYY-MM');

-- ---------- vw_kpi_absenteismo ----------
DROP VIEW IF EXISTS public.vw_kpi_absenteismo;
CREATE VIEW public.vw_kpi_absenteismo
  WITH (security_invoker = true) AS
SELECT
  f.empresa_id,
  TO_CHAR(f.data, 'YYYY-MM') AS mes,
  COUNT(*) AS total_faltas,
  SUM(f.dias_total) AS dias_faltados
FROM public.faltas f
WHERE f.data >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY f.empresa_id, TO_CHAR(f.data, 'YYYY-MM');

-- ---------- vw_banco_horas_saldo ----------
DROP VIEW IF EXISTS public.vw_banco_horas_saldo;
CREATE VIEW public.vw_banco_horas_saldo
  WITH (security_invoker = true) AS
SELECT
  bh.colaborador_id,
  c.nome_completo,
  c.empresa_id,
  SUM(CASE WHEN bh.tipo = 'credito' THEN 1 ELSE -1 END *
    EXTRACT(EPOCH FROM bh.horas::interval) / 3600) AS saldo_horas,
  MAX(bh.data) AS ultima_movimentacao
FROM public.banco_horas bh
JOIN public.colaboradores c ON c.id = bh.colaborador_id
GROUP BY bh.colaborador_id, c.nome_completo, c.empresa_id;

-- ---------- pontos_abertos ----------
DROP VIEW IF EXISTS public.pontos_abertos;
CREATE VIEW public.pontos_abertos
  WITH (security_invoker = true) AS
SELECT
  rp.colaborador_id,
  c.nome_completo,
  c.empresa_id,
  rp.data,
  EXTRACT(EPOCH FROM (now() - rp.entrada::timestamp)) / 3600 AS horas_aberto
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
WHERE rp.saida IS NULL
  AND rp.entrada IS NOT NULL
  AND rp.entrada::date = CURRENT_DATE;

-- ---------- excecoes_ponto ----------
DROP VIEW IF EXISTS public.excecoes_ponto;
CREATE VIEW public.excecoes_ponto
  WITH (security_invoker = true) AS
SELECT
  rp.colaborador_id,
  c.empresa_id,
  rp.data,
  rp.tipo_excecao,
  rp.justificativa
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
WHERE rp.tipo_excecao IS NOT NULL;

-- ---------- vw_matriz_nine_box ----------
DROP VIEW IF EXISTS public.vw_matriz_nine_box;
CREATE VIEW public.vw_matriz_nine_box
  WITH (security_invoker = true) AS
SELECT
  c.empresa_id,
  a.colaborador_id,
  c.nome_completo,
  a.performance_score,
  a.potencial_score,
  CASE
    WHEN a.performance_score >= 4 AND a.potencial_score >= 4 THEN 'estrela'
    WHEN a.performance_score >= 4 AND a.potencial_score < 4  THEN 'especialista'
    WHEN a.performance_score < 4  AND a.potencial_score >= 4 THEN 'aprendiz'
    ELSE 'core'
  END AS quadrante
FROM public.avaliacoes a
JOIN public.colaboradores c ON c.id = a.colaborador_id;

-- ---------- vw_passivo_trabalhista_consolidado ----------
DROP VIEW IF EXISTS public.vw_passivo_trabalhista_consolidado;
CREATE VIEW public.vw_passivo_trabalhista_consolidado
  WITH (security_invoker = true) AS
SELECT
  c.empresa_id,
  c.id AS colaborador_id,
  c.nome_completo,
  COALESCE(SUM(pf.v_provisao_ferias), 0) AS provisao_ferias,
  COALESCE(SUM(pf.v_provisao_13), 0)     AS provisao_13,
  COALESCE(SUM(pf.v_multa_fgts), 0)      AS multa_fgts
FROM public.colaboradores c
LEFT JOIN public.provisoes_folha pf ON pf.colaborador_id = c.id
GROUP BY c.empresa_id, c.id, c.nome_completo;

-- ---------- vw_metricas_fila ----------
DROP VIEW IF EXISTS public.vw_metricas_fila;
CREATE VIEW public.vw_metricas_fila
  WITH (security_invoker = true) AS
SELECT
  fila,
  empresa_id,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing,
  COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
  COUNT(*) FILTER (WHERE status = 'failed')     AS failed
FROM public.process_queue
GROUP BY fila, empresa_id;

-- ---------- vw_batidas_dia ----------
DROP VIEW IF EXISTS public.vw_batidas_dia;
CREATE VIEW public.vw_batidas_dia
  WITH (security_invoker = true) AS
SELECT
  rp.colaborador_id,
  c.empresa_id,
  rp.data,
  COUNT(*) AS total_batidas,
  MIN(rp.entrada) AS primeira_entrada,
  MAX(rp.saida)   AS ultima_saida
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
GROUP BY rp.colaborador_id, c.empresa_id, rp.data;

-- ---------- vw_ferias_resumo ----------
DROP VIEW IF EXISTS public.vw_ferias_resumo;
CREATE VIEW public.vw_ferias_resumo
  WITH (security_invoker = true) AS
SELECT
  f.colaborador_id,
  c.empresa_id,
  f.status,
  COUNT(*) AS total_ferias,
  SUM(f.dias_ferias) AS dias_totais
FROM public.ferias f
JOIN public.colaboradores c ON c.id = f.colaborador_id
GROUP BY f.colaborador_id, c.empresa_id, f.status;

-- ---------- vw_folha_ponto_mensal ----------
DROP VIEW IF EXISTS public.vw_folha_ponto_mensal;
CREATE VIEW public.vw_folha_ponto_mensal
  WITH (security_invoker = true) AS
SELECT
  rp.colaborador_id,
  c.empresa_id,
  TO_CHAR(rp.data, 'YYYY-MM') AS competencia,
  SUM(EXTRACT(EPOCH FROM (rp.saida - rp.entrada)) / 3600) AS horas_trabalhadas,
  COUNT(*) AS total_batidas
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
WHERE rp.saida IS NOT NULL
GROUP BY rp.colaborador_id, c.empresa_id, TO_CHAR(rp.data, 'YYYY-MM');

-- ---------- vw_saldo_compensacao_mensal ----------
DROP VIEW IF EXISTS public.vw_saldo_compensacao_mensal;
CREATE VIEW public.vw_saldo_compensacao_mensal
  WITH (security_invoker = true) AS
SELECT
  cc.colaborador_id,
  c.empresa_id,
  TO_CHAR(cc.data, 'YYYY-MM') AS competencia,
  SUM(cc.horas) AS horas_compensadas
FROM public.compensacoes cc
JOIN public.colaboradores c ON c.id = cc.colaborador_id
GROUP BY cc.colaborador_id, c.empresa_id, TO_CHAR(cc.data, 'YYYY-MM');

-- ---------- vw_alertas_compensacao ----------
DROP VIEW IF EXISTS public.vw_alertas_compensacao;
CREATE VIEW public.vw_alertas_compensacao
  WITH (security_invoker = true) AS
SELECT
  c.empresa_id,
  cc.colaborador_id,
  c.nome_completo,
  cc.data,
  cc.horas
FROM public.compensacoes cc
JOIN public.colaboradores c ON c.id = cc.colaborador_id
WHERE cc.horas > 10;

-- ---------- vw_kpi_beneficios_custo ----------
DROP VIEW IF EXISTS public.vw_kpi_beneficios_custo;
CREATE VIEW public.vw_kpi_beneficios_custo
  WITH (security_invoker = true) AS
SELECT
  b.empresa_id,
  TO_CHAR(b.created_at, 'YYYY-MM') AS competencia,
  SUM(b.valor) AS custo_total
FROM public.beneficios b
GROUP BY b.empresa_id, TO_CHAR(b.created_at, 'YYYY-MM');

-- ---------- vw_kpi_ponto_resumo ----------
DROP VIEW IF EXISTS public.vw_kpi_ponto_resumo;
CREATE VIEW public.vw_kpi_ponto_resumo
  WITH (security_invoker = true) AS
SELECT
  c.empresa_id,
  TO_CHAR(rp.data, 'YYYY-MM') AS competencia,
  COUNT(DISTINCT rp.colaborador_id) AS colaboradores_ativos,
  COUNT(*) AS total_registros
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
WHERE rp.data >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY c.empresa_id, TO_CHAR(rp.data, 'YYYY-MM');

-- ---------- vw_faltas_mensal ----------
DROP VIEW IF EXISTS public.vw_faltas_mensal;
CREATE VIEW public.vw_faltas_mensal
  WITH (security_invoker = true) AS
SELECT
  f.empresa_id,
  TO_CHAR(f.data, 'YYYY-MM') AS competencia,
  COUNT(*) AS total_faltas,
  SUM(f.dias_total) AS dias_faltados
FROM public.faltas f
WHERE f.data >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY f.empresa_id, TO_CHAR(f.data, 'YYYY-MM');

-- ---------- v_filter_stats ----------
DROP VIEW IF EXISTS public.v_filter_stats;
CREATE VIEW public.v_filter_stats
  WITH (security_invoker = true) AS
SELECT
  user_id,
  entity_type,
  COUNT(*) AS filter_count
FROM public.saved_filters
GROUP BY user_id, entity_type;

-- Comentário de auditoria em uma view representativa
COMMENT ON VIEW public.vw_dashboard_time IS
  '[P0-007] Recriada com security_invoker=true para respeitar RLS multi-tenant.';
