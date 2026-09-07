-- 2026-09-02: fecha o P0 mais grave desta rodada de auditoria — reproduzido
-- em produção com `SET LOCAL ROLE anon; SELECT count(*) FROM vw_colaboradores_completo`
-- retornando 12 linhas com CPF e e-mail. A chave anon é pública (embarcada no
-- bundle do frontend); qualquer pessoa com a URL do projeto conseguia ler
-- CPF/e-mail de todo colaborador direto via PostgREST, sem sessão nenhuma.
--
-- Causa: 42 das 44 views do schema public rodam como o DONO (postgres) por
-- padrão, não como quem consulta — então elas atravessam o RLS das tabelas
-- de origem por completo, e todas tinham SELECT concedido a anon.
--
-- security_invoker=true faz a view rodar com os privilégios de quem a
-- consulta, então o RLS (já corrigido nas migrations anteriores desta
-- pasta) volta a valer para authenticated. REVOKE de anon fecha o acesso
-- direto sem sessão. As duas exceções (v_system_health, v_pii_access_suspeitos)
-- já estavam corretas antes desta migration e não são tocadas aqui.
--
-- Nenhuma Edge Function consome estas views com a chave anon — metrics,
-- metabase-embed e healthcheck usam SUPABASE_SERVICE_ROLE_KEY, que ignora
-- RLS/grants por definição. O REVOKE abaixo não afeta esses fluxos.

ALTER VIEW public."dp_audit_log_colaborador" SET (security_invoker = true);
REVOKE SELECT ON public."dp_audit_log_colaborador" FROM anon;
ALTER VIEW public."dp_audit_log_rh" SET (security_invoker = true);
REVOKE SELECT ON public."dp_audit_log_rh" FROM anon;
ALTER VIEW public."dp_data_catalog_public" SET (security_invoker = true);
REVOKE SELECT ON public."dp_data_catalog_public" FROM anon;
ALTER VIEW public."dp_security_advisors" SET (security_invoker = true);
REVOKE SELECT ON public."dp_security_advisors" FROM anon;
ALTER VIEW public."dp_slow_queries" SET (security_invoker = true);
REVOKE SELECT ON public."dp_slow_queries" FROM anon;
ALTER VIEW public."excecoes_ponto" SET (security_invoker = true);
REVOKE SELECT ON public."excecoes_ponto" FROM anon;
ALTER VIEW public."pontos_abertos" SET (security_invoker = true);
REVOKE SELECT ON public."pontos_abertos" FROM anon;
ALTER VIEW public."v_alertas_timeout" SET (security_invoker = true);
REVOKE SELECT ON public."v_alertas_timeout" FROM anon;
ALTER VIEW public."v_audit_events_unified" SET (security_invoker = true);
REVOKE SELECT ON public."v_audit_events_unified" FROM anon;
ALTER VIEW public."v_audit_legacy" SET (security_invoker = true);
REVOKE SELECT ON public."v_audit_legacy" FROM anon;
ALTER VIEW public."v_audit_trail" SET (security_invoker = true);
REVOKE SELECT ON public."v_audit_trail" FROM anon;
ALTER VIEW public."v_contrato_token_timeline" SET (security_invoker = true);
REVOKE SELECT ON public."v_contrato_token_timeline" FROM anon;
ALTER VIEW public."v_contratos_assinatura_kpi" SET (security_invoker = true);
REVOKE SELECT ON public."v_contratos_assinatura_kpi" FROM anon;
ALTER VIEW public."v_contratos_tokens_pendentes" SET (security_invoker = true);
REVOKE SELECT ON public."v_contratos_tokens_pendentes" FROM anon;
ALTER VIEW public."v_contratos_vencendo" SET (security_invoker = true);
REVOKE SELECT ON public."v_contratos_vencendo" FROM anon;
ALTER VIEW public."v_ferias_adiant13_elegibilidade" SET (security_invoker = true);
REVOKE SELECT ON public."v_ferias_adiant13_elegibilidade" FROM anon;
ALTER VIEW public."v_ferias_alerta_pagamento_d2" SET (security_invoker = true);
REVOKE SELECT ON public."v_ferias_alerta_pagamento_d2" FROM anon;
ALTER VIEW public."v_ferias_alertas_criticos" SET (security_invoker = true);
REVOKE SELECT ON public."v_ferias_alertas_criticos" FROM anon;
ALTER VIEW public."v_ferias_folha_reconciliacao" SET (security_invoker = true);
REVOKE SELECT ON public."v_ferias_folha_reconciliacao" FROM anon;
ALTER VIEW public."v_idempotency_metrics" SET (security_invoker = true);
REVOKE SELECT ON public."v_idempotency_metrics" FROM anon;
ALTER VIEW public."v_slow_queries_top50" SET (security_invoker = true);
REVOKE SELECT ON public."v_slow_queries_top50" FROM anon;
ALTER VIEW public."vw_alertas_compensacao" SET (security_invoker = true);
REVOKE SELECT ON public."vw_alertas_compensacao" FROM anon;
ALTER VIEW public."vw_alertas_rh" SET (security_invoker = true);
REVOKE SELECT ON public."vw_alertas_rh" FROM anon;
ALTER VIEW public."vw_banco_horas_saldo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_banco_horas_saldo" FROM anon;
ALTER VIEW public."vw_batidas_dia" SET (security_invoker = true);
REVOKE SELECT ON public."vw_batidas_dia" FROM anon;
ALTER VIEW public."vw_batidas_resumo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_batidas_resumo" FROM anon;
ALTER VIEW public."vw_cadastro_incompleto" SET (security_invoker = true);
REVOKE SELECT ON public."vw_cadastro_incompleto" FROM anon;
ALTER VIEW public."vw_colaboradores_completo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_colaboradores_completo" FROM anon;
ALTER VIEW public."vw_dashboard_time" SET (security_invoker = true);
REVOKE SELECT ON public."vw_dashboard_time" FROM anon;
ALTER VIEW public."vw_espelho_ponto_mensal" SET (security_invoker = true);
REVOKE SELECT ON public."vw_espelho_ponto_mensal" FROM anon;
ALTER VIEW public."vw_faltas_mensal" SET (security_invoker = true);
REVOKE SELECT ON public."vw_faltas_mensal" FROM anon;
ALTER VIEW public."vw_ferias_resumo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_ferias_resumo" FROM anon;
ALTER VIEW public."vw_folha_compliance" SET (security_invoker = true);
REVOKE SELECT ON public."vw_folha_compliance" FROM anon;
ALTER VIEW public."vw_folha_ponto_mensal" SET (security_invoker = true);
REVOKE SELECT ON public."vw_folha_ponto_mensal" FROM anon;
ALTER VIEW public."vw_kpi_absenteismo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_kpi_absenteismo" FROM anon;
ALTER VIEW public."vw_kpi_beneficios_custo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_kpi_beneficios_custo" FROM anon;
ALTER VIEW public."vw_kpi_ponto_resumo" SET (security_invoker = true);
REVOKE SELECT ON public."vw_kpi_ponto_resumo" FROM anon;
ALTER VIEW public."vw_kpi_turnover" SET (security_invoker = true);
REVOKE SELECT ON public."vw_kpi_turnover" FROM anon;
ALTER VIEW public."vw_matriz_nine_box" SET (security_invoker = true);
REVOKE SELECT ON public."vw_matriz_nine_box" FROM anon;
ALTER VIEW public."vw_metricas_fila" SET (security_invoker = true);
REVOKE SELECT ON public."vw_metricas_fila" FROM anon;
ALTER VIEW public."vw_passivo_trabalhista_consolidado" SET (security_invoker = true);
REVOKE SELECT ON public."vw_passivo_trabalhista_consolidado" FROM anon;
ALTER VIEW public."vw_saldo_compensacao_mensal" SET (security_invoker = true);
REVOKE SELECT ON public."vw_saldo_compensacao_mensal" FROM anon;
