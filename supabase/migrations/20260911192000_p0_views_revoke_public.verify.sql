-- Sidecar de 20260911192000_p0_views_revoke_public.sql
-- Só leitura. Para cada view da lista que EXISTE como view: security_invoker
-- ligado e nenhum privilégio para PUBLIC (grantee 0 no aclexplode) nem para
-- anon. A migration tolera drift parcial com WARNING, então views ausentes não
-- reprovam; o que reprova é não existir nenhuma delas (mesma trava fail-closed
-- da migration) ou alguma existente estar frouxa.
WITH esperadas(name) AS (
  SELECT unnest(ARRAY[
    'dp_audit_log_colaborador', 'dp_audit_log_rh', 'dp_data_catalog_public',
    'dp_security_advisors', 'dp_slow_queries', 'excecoes_ponto', 'pontos_abertos',
    'v_alertas_timeout', 'v_audit_events_unified', 'v_audit_legacy', 'v_audit_trail',
    'v_contrato_token_timeline', 'v_contratos_assinatura_kpi',
    'v_contratos_tokens_pendentes', 'v_contratos_vencendo',
    'v_ferias_adiant13_elegibilidade', 'v_ferias_alerta_pagamento_d2',
    'v_ferias_alertas_criticos', 'v_ferias_folha_reconciliacao',
    'v_idempotency_metrics', 'v_slow_queries_top50', 'vw_alertas_compensacao',
    'vw_alertas_rh', 'vw_banco_horas_saldo', 'vw_batidas_dia', 'vw_batidas_resumo',
    'vw_cadastro_incompleto', 'vw_colaboradores_completo', 'vw_dashboard_time',
    'vw_espelho_ponto_mensal', 'vw_faltas_mensal', 'vw_ferias_resumo',
    'vw_folha_compliance', 'vw_folha_ponto_mensal', 'vw_kpi_absenteismo',
    'vw_kpi_beneficios_custo', 'vw_kpi_ponto_resumo', 'vw_kpi_turnover',
    'vw_matriz_nine_box', 'vw_metricas_fila', 'vw_passivo_trabalhista_consolidado',
    'vw_saldo_compensacao_mensal'
  ])
), presentes AS (
  SELECT c.oid, c.relname, c.reloptions, c.relacl
  FROM esperadas e
  JOIN pg_class c ON c.oid = to_regclass(format('public.%I', e.name))
  WHERE c.relkind = 'v'
)
SELECT 'ok'
WHERE EXISTS (SELECT 1 FROM presentes)
AND NOT EXISTS (
  SELECT 1 FROM presentes p
  WHERE COALESCE(array_to_string(p.reloptions, ','), '') NOT LIKE '%security_invoker=true%'
)
AND NOT EXISTS (
  SELECT 1
  FROM presentes p
  CROSS JOIN LATERAL aclexplode(p.relacl) AS a
  WHERE a.grantee = 0
     OR a.grantee = (SELECT r.oid FROM pg_roles r WHERE r.rolname = 'anon')
);
