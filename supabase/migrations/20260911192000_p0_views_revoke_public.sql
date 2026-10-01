-- P0: eliminate PUBLIC grants left behind by historical view hardening.
--
-- `REVOKE ... FROM anon` alone is insufficient in PostgreSQL: privileges
-- inherited from the implicit PUBLIC role still let the anon PostgREST role
-- read a view. The canonical audit observed exactly that condition on these
-- views. This forward migration is deliberately append-only and idempotent.

DO $migration$
DECLARE
  view_name text;
  expected_views text[] := ARRAY[
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
  ];
  missing_views text[];
  invalid_relations text[];
BEGIN
  SELECT array_agg(name ORDER BY name)
    INTO missing_views
  FROM unnest(expected_views) AS expected(name)
  WHERE to_regclass(format('public.%I', name)) IS NULL;

  -- Fail-closed: se NENHUMA das views esperadas existe, o pré-requisito não foi
  -- atendido (banco errado ou camada de views ausente) — aborta em vez de
  -- passar silenciosamente. Drift parcial é tolerado com WARNING.
  IF missing_views IS NOT NULL
     AND array_length(missing_views, 1) = array_length(expected_views, 1) THEN
    RAISE EXCEPTION
      'P0 view ACL remediation requires all % expected views (nenhuma encontrada)',
      array_length(expected_views, 1);
  END IF;

  IF missing_views IS NOT NULL THEN
    RAISE WARNING
      'P0 view ACL remediation: % views ausentes (drift) serão puladas: %',
      array_length(missing_views, 1), array_to_string(missing_views, ', ');
    expected_views := (SELECT array_agg(name) FROM unnest(expected_views) AS expected(name)
                       WHERE to_regclass(format('public.%I', name)) IS NOT NULL);
  END IF;

  SELECT array_agg(expected.name ORDER BY expected.name)
    INTO invalid_relations
  FROM unnest(expected_views) AS expected(name)
  JOIN pg_class AS relation ON relation.oid = to_regclass(format('public.%I', expected.name))
  WHERE relation.relkind <> 'v';

  IF invalid_relations IS NOT NULL THEN
    RAISE WARNING
      'P0 view ACL remediation: relações não-view puladas: %',
      array_to_string(invalid_relations, ', ');
    expected_views := (SELECT array_agg(expected.name) FROM unnest(expected_views) AS expected(name)
                       JOIN pg_class AS relation ON relation.oid = to_regclass(format('public.%I', expected.name))
                       WHERE relation.relkind = 'v');
  END IF;

  FOREACH view_name IN ARRAY COALESCE(expected_views, '{}') LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
    -- PUBLIC is implicit for anon/authenticated roles; revoke it explicitly.
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon', view_name);
  END LOOP;
END
$migration$;
