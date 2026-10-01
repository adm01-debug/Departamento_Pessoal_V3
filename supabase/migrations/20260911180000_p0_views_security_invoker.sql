-- P0: Close unauthenticated access through owner-rights public views.
--
-- The same corrective statements are part of the rebaseline artifact.  This
-- forward migration makes the canonical deployment auditable without replaying
-- the historical migration chain.

DO $$
BEGIN
  IF to_regclass('public.dp_audit_log_colaborador') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."dp_audit_log_colaborador" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."dp_audit_log_colaborador" FROM anon';
  ELSE
    RAISE NOTICE 'view public.dp_audit_log_colaborador ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.dp_audit_log_rh') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."dp_audit_log_rh" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."dp_audit_log_rh" FROM anon';
  ELSE
    RAISE NOTICE 'view public.dp_audit_log_rh ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.dp_data_catalog_public') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."dp_data_catalog_public" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."dp_data_catalog_public" FROM anon';
  ELSE
    RAISE NOTICE 'view public.dp_data_catalog_public ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.dp_security_advisors') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."dp_security_advisors" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."dp_security_advisors" FROM anon';
  ELSE
    RAISE NOTICE 'view public.dp_security_advisors ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.dp_slow_queries') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."dp_slow_queries" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."dp_slow_queries" FROM anon';
  ELSE
    RAISE NOTICE 'view public.dp_slow_queries ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.excecoes_ponto') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."excecoes_ponto" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."excecoes_ponto" FROM anon';
  ELSE
    RAISE NOTICE 'view public.excecoes_ponto ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.pontos_abertos') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."pontos_abertos" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."pontos_abertos" FROM anon';
  ELSE
    RAISE NOTICE 'view public.pontos_abertos ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_alertas_timeout') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_alertas_timeout" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_alertas_timeout" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_alertas_timeout ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_audit_events_unified') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_audit_events_unified" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_audit_events_unified" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_audit_events_unified ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_audit_legacy') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_audit_legacy" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_audit_legacy" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_audit_legacy ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_audit_trail') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_audit_trail" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_audit_trail" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_audit_trail ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_contrato_token_timeline') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_contrato_token_timeline" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_contrato_token_timeline" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_contrato_token_timeline ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_contratos_assinatura_kpi') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_contratos_assinatura_kpi" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_contratos_assinatura_kpi" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_contratos_assinatura_kpi ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_contratos_tokens_pendentes') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_contratos_tokens_pendentes" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_contratos_tokens_pendentes" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_contratos_tokens_pendentes ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_contratos_vencendo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_contratos_vencendo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_contratos_vencendo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_contratos_vencendo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_ferias_adiant13_elegibilidade') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_ferias_adiant13_elegibilidade" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_ferias_adiant13_elegibilidade" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_ferias_adiant13_elegibilidade ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_ferias_alerta_pagamento_d2') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_ferias_alerta_pagamento_d2" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_ferias_alerta_pagamento_d2" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_ferias_alerta_pagamento_d2 ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_ferias_alertas_criticos') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_ferias_alertas_criticos" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_ferias_alertas_criticos" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_ferias_alertas_criticos ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_ferias_folha_reconciliacao') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_ferias_folha_reconciliacao" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_ferias_folha_reconciliacao" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_ferias_folha_reconciliacao ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_idempotency_metrics') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_idempotency_metrics" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_idempotency_metrics" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_idempotency_metrics ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.v_slow_queries_top50') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."v_slow_queries_top50" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."v_slow_queries_top50" FROM anon';
  ELSE
    RAISE NOTICE 'view public.v_slow_queries_top50 ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_alertas_compensacao') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_alertas_compensacao" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_alertas_compensacao" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_alertas_compensacao ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_alertas_rh') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_alertas_rh" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_alertas_rh" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_alertas_rh ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_banco_horas_saldo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_banco_horas_saldo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_banco_horas_saldo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_banco_horas_saldo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_batidas_dia') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_batidas_dia" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_batidas_dia" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_batidas_dia ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_batidas_resumo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_batidas_resumo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_batidas_resumo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_batidas_resumo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_cadastro_incompleto') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_cadastro_incompleto" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_cadastro_incompleto" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_cadastro_incompleto ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_colaboradores_completo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_colaboradores_completo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_colaboradores_completo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_colaboradores_completo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_dashboard_time') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_dashboard_time" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_dashboard_time" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_dashboard_time ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_espelho_ponto_mensal') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_espelho_ponto_mensal" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_espelho_ponto_mensal" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_espelho_ponto_mensal ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_faltas_mensal') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_faltas_mensal" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_faltas_mensal" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_faltas_mensal ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_ferias_resumo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_ferias_resumo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_ferias_resumo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_ferias_resumo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_folha_compliance') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_folha_compliance" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_folha_compliance" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_folha_compliance ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_folha_ponto_mensal') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_folha_ponto_mensal" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_folha_ponto_mensal" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_folha_ponto_mensal ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_kpi_absenteismo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_kpi_absenteismo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_kpi_absenteismo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_kpi_absenteismo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_kpi_beneficios_custo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_kpi_beneficios_custo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_kpi_beneficios_custo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_kpi_beneficios_custo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_kpi_ponto_resumo') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_kpi_ponto_resumo" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_kpi_ponto_resumo" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_kpi_ponto_resumo ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_kpi_turnover') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_kpi_turnover" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_kpi_turnover" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_kpi_turnover ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_matriz_nine_box') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_matriz_nine_box" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_matriz_nine_box" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_matriz_nine_box ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_metricas_fila') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_metricas_fila" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_metricas_fila" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_metricas_fila ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_passivo_trabalhista_consolidado') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_passivo_trabalhista_consolidado" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_passivo_trabalhista_consolidado" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_passivo_trabalhista_consolidado ausente (drift) — ACL não alterada';
  END IF;
  IF to_regclass('public.vw_saldo_compensacao_mensal') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public."vw_saldo_compensacao_mensal" SET (security_invoker = true)';
    EXECUTE 'REVOKE SELECT ON public."vw_saldo_compensacao_mensal" FROM anon';
  ELSE
    RAISE NOTICE 'view public.vw_saldo_compensacao_mensal ausente (drift) — ACL não alterada';
  END IF;
END $$;

