-- P0: Close unauthenticated access through owner-rights public views.
--
-- The same corrective statements are part of the rebaseline artifact.  This
-- forward migration makes the canonical deployment auditable without replaying
-- the historical migration chain.

DO $$
DECLARE
  view_name text;
  expected_views text[] := ARRAY[
    'dp_audit_log_colaborador',
    'dp_audit_log_rh',
    'dp_data_catalog_public',
    'dp_security_advisors',
    'dp_slow_queries',
    'excecoes_ponto',
    'pontos_abertos',
    'v_alertas_timeout',
    'v_audit_events_unified',
    'v_audit_legacy',
    'v_audit_trail',
    'v_contrato_token_timeline',
    'v_contratos_assinatura_kpi',
    'v_contratos_tokens_pendentes',
    'v_contratos_vencendo',
    'v_ferias_adiant13_elegibilidade',
    'v_ferias_alerta_pagamento_d2',
    'v_ferias_alertas_criticos',
    'v_ferias_folha_reconciliacao',
    'v_idempotency_metrics',
    'v_slow_queries_top50',
    'vw_alertas_compensacao',
    'vw_alertas_rh',
    'vw_banco_horas_saldo',
    'vw_batidas_dia',
    'vw_batidas_resumo',
    'vw_cadastro_incompleto',
    'vw_colaboradores_completo',
    'vw_dashboard_time',
    'vw_espelho_ponto_mensal',
    'vw_faltas_mensal',
    'vw_ferias_resumo',
    'vw_folha_compliance',
    'vw_folha_ponto_mensal',
    'vw_kpi_absenteismo',
    'vw_kpi_beneficios_custo',
    'vw_kpi_ponto_resumo',
    'vw_kpi_turnover',
    'vw_matriz_nine_box',
    'vw_metricas_fila',
    'vw_passivo_trabalhista_consolidado',
    'vw_saldo_compensacao_mensal'
  ];
BEGIN
  FOREACH view_name IN ARRAY expected_views LOOP
    IF to_regclass('public.' || view_name) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', view_name);
    ELSE
      RAISE NOTICE 'view public.% ausente (drift) — ACL não alterada', view_name;
    END IF;
  END LOOP;
END $$;
