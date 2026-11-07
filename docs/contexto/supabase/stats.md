# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 57.8 MB |
| schema public | 24.3 MB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.audit_log_unified | ~1.7k | 2.0 MB | 1016.0 KB | 768.0 KB | ~20 | ~30 | ~1.1k | 2026-09-15 |
| public.login_attempts | ~1.9k | 1016.0 KB | 288.0 KB | 688.0 KB | 1 | ~60 | ~40 | 2026-10-21 |
| public.rate_limits | ~1.2k | 1008.0 KB | 320.0 KB | 648.0 KB | 2 | ~940 | ~212.3k | 2026-11-07 |
| public.audit_log | ~290 | 736.0 KB | 392.0 KB | 240.0 KB | ~50 | ~80 | ~16.4k |  |
| public.sec_policy_regressions | ~2.8k | 704.0 KB | 456.0 KB | 208.0 KB | 0 | 4 | ~10 | 2026-10-31 |
| public.colaboradores | ~20 | 408.0 KB | 8.0 KB | 392.0 KB | 3 | ~18.4k | ~77.4k |  |
| public.auditoria_logs | ~50 | 336.0 KB | 64.0 KB | 128.0 KB | 5 | ~30 | 5 |  |
| public.registros_ponto | ~120 | 216.0 KB | 40.0 KB | 144.0 KB | 0 | ~50 | ~370 |  |
| public.notificacoes | 0 | 208.0 KB | 8.0 KB | 176.0 KB | 3 | ~11.9k | ~8.1k | 2026-11-05 |
| public.asos | 0 | 200.0 KB | 8.0 KB | 184.0 KB | 0 | ~50 | ~40 |  |
| public.dp_audit_log_2026_07 | ~50 | 200.0 KB | 16.0 KB | 152.0 KB | 2 | ~40 | ~10 |  |
| public.query_telemetry | ~260 | 200.0 KB | 56.0 KB | 112.0 KB | 0 | ~1.3k | ~79.4k |  |
| public.folhas_pagamento | 5 | 192.0 KB | 8.0 KB | 176.0 KB | ~10 | ~500 | ~6.3k |  |
| public.ferias_audit_log | 0 | 184.0 KB | 56.0 KB | 96.0 KB | ~40 | ~30 | 3 |  |
| public.desligamentos | 0 | 176.0 KB | 8.0 KB | 160.0 KB | 0 | ~2.2k | ~7.4k |  |
| public.ferias | 0 | 176.0 KB | 8.0 KB | 160.0 KB | 8 | ~800 | ~9.3k |  |
| public.dp_audit_log_2026_08 | 0 | 168.0 KB | 16.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.dp_audit_log_2026_09 | 0 | 168.0 KB | 16.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.dp_audit_log_2026_10 | 0 | 168.0 KB | 16.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.sst_cat | 0 | 160.0 KB | 8.0 KB | 144.0 KB | 0 | ~40 | ~90 |  |
| public.sst_extintores | 0 | 160.0 KB | 8.0 KB | 144.0 KB | 0 | ~30 | ~20 |  |
| public.afastamentos | 0 | 144.0 KB | 8.0 KB | 128.0 KB | 0 | ~50 | ~4.2k |  |
| public.beneficios_colaborador | 0 | 128.0 KB | 8.0 KB | 112.0 KB | 1 | ~60 | ~50 |  |
| public.dp_audit_log_2026_11 | 0 | 128.0 KB | 8.0 KB | 112.0 KB | 0 | ~40 | ~10 |  |
| public.batidas_ponto | 0 | 120.0 KB | 0 B | 112.0 KB | 0 | ~2.5k | ~1.6k |  |
| public.cnab_remessas | 3 | 120.0 KB | 8.0 KB | 104.0 KB | 0 | ~210 | ~80 |  |
| public.pii_access_logs | ~50 | 120.0 KB | 24.0 KB | 64.0 KB | 0 | ~70 | ~30 |  |
| public.workflows_execucoes | 0 | 120.0 KB | 24.0 KB | 64.0 KB | ~40 | ~30 | ~20 |  |
| public.admissoes | 0 | 112.0 KB | 16.0 KB | 64.0 KB | ~50 | ~4k | ~1.9k |  |
| public.despesas | 8 | 112.0 KB | 8.0 KB | 96.0 KB | ~20 | ~70 | ~80 |  |
| public.escalas_trabalho | ~100 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | ~30 | 5 |  |
| public.onboarding_colaborador | 0 | 112.0 KB | 8.0 KB | 96.0 KB | ~30 | ~30 | ~140 |  |
| public.onboarding_tarefas | 0 | 112.0 KB | 8.0 KB | 80.0 KB | 0 | ~30 | 1 | 2026-07-27 |
| public.eventos_variaveis | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 1 | ~30 | ~310 |  |
| public.premiacoes_auditoria | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 3 | ~30 | 4 |  |
| public.solicitacoes_ajuste_ponto | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 0 | ~1.8k | ~3.5k |  |
| public.sst_ordens_servico | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 0 | ~30 | 2 |  |
| public.banco_horas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~820 | ~390 |  |
| public.candidaturas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 5 | ~20 | ~50 |  |
| public.clinicas_partners | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | ~30 |  |
| public.contabilidade_threads | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 6 | ~20 | ~30 |  |
| public.contas_bancarias | 0 | 96.0 KB | 16.0 KB | 48.0 KB | 5 | ~30 | ~70 |  |
| public.departamentos | ~10 | 96.0 KB | 8.0 KB | 80.0 KB | 9 | ~920 | ~460 |  |
| public.empresas | 1 | 96.0 KB | 8.0 KB | 80.0 KB | 4 | ~26.4k | 1 |  |
| public.epis_fichas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | 2 |  |
| public.exames_agendamentos | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | 2 |  |
| public.feedbacks_360 | 0 | 96.0 KB | 8.0 KB | 80.0 KB | ~20 | ~110 | ~2.8k |  |
| public.folha_itens | ~10 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~30 | ~10 |  |
| public.lancamentos_contabeis | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~40 | ~60 |  |
| public.premiacoes_pagamentos | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 2 | ~70 | ~20 |  |
| public.sst_ltcat_laudos | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | 0 |  |
| public.times | 2 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~40 | 2 |  |
| public.treinamento_certificados | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~60 | ~20 |  |
| public.user_empresas | 6 | 88.0 KB | 8.0 KB | 80.0 KB | 8 | ~625.1k | ~6.2k |  |
| public.adiantamentos_salariais | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~30 | ~20 |  |
| public.contabilidade_mensagens | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 1 | ~20 | ~10 |  |
| public.contrato_templates | 5 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~30 | 5 |  |
| public.dependentes | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~30 | 8 |  |
| public.dp_audit_log_2026_12 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~40 | ~10 |  |
| public.dp_audit_log_2027_01 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | 8 | 0 |  |
| public.dp_audit_log_default | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~40 | ~10 |  |
| public.dp_data_catalog | 4 | 80.0 KB | 8.0 KB | 64.0 KB | 5 | ~30 | 6 |  |
| public.dp_mcp_config | 0 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~20 | ~60 |  |
| public.epis_entregas | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~30 | 5 |  |
| public.historico_alertas | ~50 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~20 | 1 |  |
| public.holerites | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~40 | ~20 |  |
| public.inscricoes_cursos | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 4 | ~20 | ~30 |  |
| public.login_lockouts | 7 | 80.0 KB | 8.0 KB | 32.0 KB | 8 | ~3.5k | ~750 | 2026-11-06 |
| public.metas_okrs | 0 | 80.0 KB | 8.0 KB | 64.0 KB | ~10 | ~40 | ~1.3k |  |
| public.onboarding_template_tarefas | 0 | 80.0 KB | 16.0 KB | 32.0 KB | ~40 | ~70 | ~80 | 2026-07-27 |
| public.sst_extintores_inspecoes | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~20 |  |
| public.sst_regimento_assinaturas | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~60 |  |
| public.tarefas_onboarding | 0 | 80.0 KB | 8.0 KB | 48.0 KB | ~20 | ~500 | ~30 | 2026-07-27 |
| public.ciencia_rate_limits | 0 | 72.0 KB | 8.0 KB | 56.0 KB | 1 | ~20 | ~60 |  |
| public.dados_estrangeiro | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~30 | ~20 |  |
| public.admissao_tokens | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~20 |  |
| public.beneficios | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~80 | ~140 |  |
| public.cargos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | ~1.3k |  |
| public.clinicas_partners_servicos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 1 |  |
| public.contabilidade_contatos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~50 |  |
| public.dp_audit_config | 3 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 3 |  |
| public.emprestimos_consignados | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~20 |  |
| public.feedbacks_360_aprovacoes_gestor | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~480 |  |
| public.feedbacks_360_consolidacoes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~30 | ~540 |  |
| public.feedbacks_360_operacoes | 0 | 64.0 KB | 16.0 KB | 16.0 KB | 4 | ~30 | ~40 |  |
| public.medidas_disciplinares | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~40 | 3 |  |
| public.onboarding_templates | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~20 | ~160 |  |
| public.pdi_plano_desenvolvimento | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~20 | ~1.2k |  |
| public.periodos_aquisitivos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~50 | ~90 | ~1.3k |  |
| public.premiacoes_regras | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~20 | ~20 |  |
| public.profiles | 1 | 64.0 KB | 8.0 KB | 48.0 KB | 2 | ~1.8k | 3 |  |
| public.recrutamento_anotacoes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 2 | ~20 | 4 |  |
| public.recrutamento_entrevistas | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 2 |  |
| public.solicitacoes_hora_extra | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~30 |  |
| public.sst_programas | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 1 |  |
| public.sst_regimento_documentos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~50 |  |
| public.treinamento_instancias | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~50 | 4 |  |
| public.whatsapp_mensagens_logs | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~40 |  |
| public.workflows_historico | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 2 |  |
| public.beneficios_colaboradores | ~70 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~100 | ~80 |  |
| public.clinicas_partners_horarios | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 0 |  |
| public.cnab_itens | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~30 | 1 |  |
| public.contrato_assinatura_tokens | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~30 | ~120 |  |
| public.contratos_gerados | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~30 | ~220 |  |
| public.dp_retention_policy | 2 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~460 | 2 |  |
| public.esocial_eventos | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~7.6k | ~14.8k |  |
| public.faltas | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~590 | ~770 |  |
| public.ferias_programacao | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~40 | 4 |  |
| public.idempotency_keys | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~15.2k | ~15.6k |  |
| public.logs_sistema | 0 | 56.0 KB | 8.0 KB | 40.0 KB | ~40 | ~110 | 1 |  |
| public.pix_lotes | 2 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~170 | ~100 |  |
| public.security_alerts | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~560 | ~24k |  |
| public.times_brindes | 1 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | 1 |  |
| public.training_images | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~20 | 2 |  |
| public.trilhas_cursos | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 2 | ~20 | ~10 |  |
| public.afdt_divergencias | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~70 |  |
| public.blocked_ips | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~50 | ~840 |  |
| public.candidatos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 5 | ~20 | ~100 |  |
| public.catalogo_cursos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 3 | ~20 | ~110 |  |
| public.ciclos_avaliacao | 5 | 48.0 KB | 8.0 KB | 32.0 KB | ~40 | ~380 | ~1.1k |  |
| public.cid10 | 6 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | 6 |  |
| public.cnab_configuracoes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~230 |  |
| public.config_afastamentos | 6 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 6 |  |
| public.despesas_aprovacoes_log | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 2 |  |
| public.documentos_assinatura | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | ~1.2k |  |
| public.dp_backup_runbook | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~20 |  |
| public.dp_environments | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 3 |  |
| public.epis | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | ~60 |  |
| public.feedbacks_360_validacoes_potencial | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~530 | ~10 |  |
| public.fila_processamento | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~170 | 0 |  |
| public.folha_auditoria | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | ~50 |  |
| public.historico_salarial | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~20 |  |
| public.jornadas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~10 |  |
| public.lgpd_retencao_logs | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 9 | ~80 |  |
| public.locais_trabalho | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~510 |  |
| public.medidas_ciencia_tokens | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 5 |  |
| public.password_reset_requests | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 0 |  |
| public.pesquisas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | ~20 |  |
| public.plano_contas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~470 |  |
| public.premiacoes_campanhas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~50 | ~70 |  |
| public.promo_brindes | 2 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | 2 |  |
| public.recrutamento_testes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 2 |  |
| public.role_permissions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 0 |  |
| public.rubricas_folha | ~10 | 48.0 KB | 8.0 KB | 32.0 KB | ~40 | ~40 | ~70 |  |
| public.sst_exposicao_riscos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 0 |  |
| public.sst_incidentes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~50 | 0 |  |
| public.sst_riscos_ambientais | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 1 |  |
| public.tipos_desligamento | 5 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 5 |  |
| public.tipos_pagamento | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 4 |  |
| public.tipos_salario | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 3 |  |
| public.treinamentos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 4 | ~40 | ~60 |  |
| public.trilhas_aprendizado | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 2 | ~20 | ~30 |  |
| public.turnos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 9 | ~20 | ~240 |  |
| public.vagas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 3 | ~20 | ~100 |  |
| public.workflows_definicoes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 9 | ~20 | ~130 |  |
| public.workflows_etapas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 1 | ~20 | 9 |  |
| public.aej_geracoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~10 |  |
| public.afdt_registros_raw | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 7 |  |
| public.audit_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 2 |  |
| public.auditoria | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 2 |  |
| public.beneficio_movimentacoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~40 |  |
| public.beneficio_regras_elegibilidade | 0 | 40.0 KB | 0 B | 40.0 KB | 0 | ~20 | 2 |  |
| public.contatos_emergencia | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~40 |  |
| public.contrato_token_eventos | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.dados_estagiario | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~90 |  |
| public.documentos_colaborador | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 3 |  |
| public.dp_user_roles | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 3 |  |
| public.epis_fichas_itens | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 5 |  |
| public.feriados | 0 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~200 |  |
| public.ferias_reconciliacao_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~590 | ~110 |  |
| public.historico_calculos_folha | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 5 |  |
| public.historico_cargo | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.holerite_distribuicoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~60 |  |
| public.homologacoes_rescisao | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.ip_whitelist | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 8 |  |
| public.jornadas_horarios | 0 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~10 |  |
| public.login_rate_limits | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~260 | 1 |  |
| public.pcs_avaliacoes_cargo | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 0 |  |
| public.pcs_fatores | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 0 |  |
| public.pcs_planos | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 0 |  |
| public.pesquisas_respostas | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.ponto_espelhos_assinados | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 1 |  |
| public.promocoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~40 |  |
| public.provisoes_folha | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~50 |  |
| public.provisoes_mensais | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~1.6k |  |
| public.relatorios_agendados | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 3 |  |
| public.training_image_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.transferencias | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.user_roles | 3 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~554.4k | ~10 |  |
| public.user_sessions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 3 |  |
| public.vaga_entrevistas | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.verification_tokens | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.webauthn_credentials | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 4 |  |
| public.webhook_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 3 |  |
| public.ajustes_ponto | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.anotacoes_colaborador | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~10 |  |
| public.auditoria_contratual | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.beneficiarios_plano | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~50 |  |
| public.beneficiarios_seguro | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~40 |  |
| public.beneficio_arquivos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.catalogo_infracoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.cnab_sequencias | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 2 | 6 |  |
| public.colaborador_beneficios | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~80 |  |
| public.configuracoes_esocial | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~840 |  |
| public.conformidade_ponto_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~20 |  |
| public.contratos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~40 |  |
| public.controle_acesso | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~40 |  |
| public.convenios_colaboradores | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~50 |  |
| public.curriculos_arquivos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.deficiencias | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~70 |  |
| public.documento_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.documentos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~30 | ~50 |  |
| public.documentos_historico | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.ferias_aprovacoes_log | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.ferias_solicitacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.fila_notificacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.folha_assinaturas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.folha_eventos_auditoria | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.formacoes_academicas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 7 |  |
| public.historico_contratos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~50 |  |
| public.itens_folha | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~20 |  |
| public.lancamentos_folha | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.lgpd_consentimentos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.lgpd_politicas_retencao | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 3 |  |
| public.lgpd_solicitacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~40 | ~20 |  |
| public.lotacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~40 |  |
| public.medidas_disciplinares_anexos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.medidas_disciplinares_contestacao_anexos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.medidas_disciplinares_integracao | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.metricas_processamento | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~60 |  |
| public.onboarding_documentos_obrigatorios | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.pcs_grades | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 0 |  |
| public.pcs_pesquisa_salarial | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.pdis | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.periodos_experiencia | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 9 |  |
| public.permissao_recursos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.pix_itens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~30 | ~40 |  |
| public.planos_saude | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.ponto_auditoria | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.ponto_seguranca_blacklist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.premiacoes_cenarios_simulacao | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.rate_limit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.recargas_vale | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.recrutamento_agendamentos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.report_dispatch_attempts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 7 | 0 |  |
| public.seguros_colaboradores | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.seguros_vida | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~40 |  |
| public.simulacoes_fiscais | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.sinistros_seguro | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.sst_cat_anexos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.sst_regimento_interno | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 2 |  |
| public.triagem_notas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.trilha_auditoria_ponto | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.user_mfa | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.vaga_etapas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.vales_alimentacao | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.valores_campos_customizados | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~40 |  |
| public.verbas_rescisorias | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.versao_banco | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~63.3k | 4 |  |
| public.webauthn_challenges | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.afd_geracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.afdt_importacoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~20 |  |
| public.audit_log_unified_archive | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.auth_gov_br_sessions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.banco_horas_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.beneficio_utilizacao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.campos_customizados | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.canal_etica | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 6 |  |
| public.cargo_faixas_salariais | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.categorias_trabalhador | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.centros_custo | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~20 |  |
| public.certificados_digitais | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~650 |  |
| public.competencias_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~1.2k |  |
| public.competencias_matriz | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.comunicados | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~10 |  |
| public.condicoes_ingresso | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.config_alertas_indicadores | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.configuracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.configuracoes_intervalo | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.convenios | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.dctfweb_declaracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.dependentes_beneficios | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.descricoes_logradouro | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.documentos_admissao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.documentos_afastamento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.documentos_pessoais_arquivos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~20 |  |
| public.epis_fichas_assinaturas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.escalas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.esocial_lotes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.esocial_transmissao_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~650 | 1 |  |
| public.etnias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.exames | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~1.8k | ~40 |  |
| public.ferias_aprovacoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.ferias_arquivos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.ferias_coletivas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.fgts_digital_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.folha_lock_conflicts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~240 |  |
| public.generos_documento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.geo_allowed_countries | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.govbr_auth_state | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~70 | 0 |  |
| public.guias_fgts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.guias_inss | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.historico_ferias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 5 |  |
| public.historico_rescisoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 6 |  |
| public.ia_provisoes_alertas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.identidades_genero | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.linhas_transporte | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.log_envio_relatorios | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.logs_integracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.logs_sincronizacao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.medidas_disciplinares_workflow_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.motivos_afastamento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.nacionalidades | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.ninebox_permissoes_homologacao | 0 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | 3 | ~210 |  |
| public.notificacoes_admissao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.paises | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.parametros_sistema | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 5 |  |
| public.password_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.pendencias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~1.3k |  |
| public.pensoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~40 |  |
| public.periodos_ponto | 0 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 1 |  |
| public.permissao_perfis | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.permissions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~640 | 3 |  |
| public.personnel_budget | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~250 |  |
| public.pesquisas_perguntas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.pii_access_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~70 |  |
| public.ponto_ajustes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.ponto_auditoria_fraude | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.ponto_espelhos_revogacoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.premiacoes_alertas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.premiacoes_roi_cenarios | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.prorrogacoes_afastamento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.provisao_auditoria | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 0 |  |
| public.provisao_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 1 |  |
| public.push_subscriptions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.rate_limit_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~20 |  |
| public.relacionamentos_contato_emergencia | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.relacionamentos_dependentes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.sec_seal_events | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 6 | 0 |  |
| public.sefip_arquivos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.sst_cat_testemunhas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.tempos_residencia | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.tipos_admissao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.tipos_aviso_previo | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.tipos_beneficio | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.tipos_deficiencia | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.tipos_estabilidade | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.tipos_visto | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.training_image_settings | 0 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | 3 | ~10 |  |
| public.treinamento_feedback | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.treinamento_feedbacks | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.treinamento_participantes | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.vales_transporte | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.vinculos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~20 |  |
| public.webhooks | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.webhooks_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.webhooks_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.whatsapp_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 3 |  |
| public.workflows_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.auditoria_acesso_bancario | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.automacao_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 2 |  |
| public.bitrix24_config | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 2 |  |
| public.bitrix24_sync_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 2 |  |
| public.cbo | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.cnae | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.colaboradores_pin | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 6 | 0 |  |
| public.comunicados_leituras | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.configuracoes_alertas | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 2 |  |
| public.configuracoes_ponto | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~170 |  |
| public.faixas_inss | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.faixas_irrf | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.geo_blocked_attempts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~870 | 1 |  |
| public.geo_blocking_config | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.guias_fgts_digital | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 1 |  |
| public.health_checks | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~720 | 0 |  |
| public.integracao_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 2 |  |
| public.integracoes | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.lgpd_fila_limpeza | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~40 | 3 |  |
| public.onboarding_kits | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.parametros_fiscais | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 0 |  |
| public.password_reset_config | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.ponto_regras_aprovacao | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 1 |  |
| public.portal_notificacoes_settings | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.saved_filters | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 1 |  |
| public.sindicatos | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 2 |  |
| public.taxas_cambio | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 1 |  |
| public.whatsapp_templates | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 1 |  |
| public.password_policies | 0 | 8.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.dp_audit_log | 0 | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_audit_unified_tenant_entity_occurred | public.audit_log_unified | 152.0 KB |
| idx_audit_unified_user_occurred | public.audit_log_unified | 128.0 KB |
| idx_login_attempts_email_hour | public.login_attempts | 168.0 KB |
| idx_login_attempts_ip_hour | public.login_attempts | 120.0 KB |


## Storage

_indisponível nesta coleta (ver errors.md)_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) |  |
| confirmados (~) |  |
| criados últimos 30d (~) |  |

_nenhum_


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| ci_auditor | ~320 | ~867.4k | 2744.99 | `WITH ext AS ( SELECT e.extname, n.nspname AS sch FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE n.nspname <> $1 ), ext_fn AS ( SELECT DISTINCT e.extname, e.sch, p.proname, p.oid AS ext_fn_oid FRO` |
| ci_auditor | ~310 | ~109.2k | 352.12 | `WITH pii_tables AS ( -- Codex review (P1, PR #238): information_schema.columns só lista colunas -- de tabelas em que o role atual tem ALGUM privilégio concedido (regra do -- padrão SQL, aplicada pelo Postgres). ci_audito` |
| ci_auditor | ~90 | ~63.5k | 690.20 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| ci_auditor | ~310 | ~52.6k | 168.63 | `SELECT p.tablename, p.policyname, p.cmd, array_to_string(p.roles, $1), replace(coalesce(p.qual, $2) \|\| $3 \|\| coalesce(p.with_check, $4), $5, $6) FROM pg_policies p WHERE p.schemaname = $7 ORDER BY p.tablename, p.policyna` |
| ci_auditor | ~90 | ~33.6k | 364.95 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| ci_auditor | ~310 | ~30.8k | 98.60 | `WITH RECURSIVE alcanca_tenant(oid, profundidade) AS ( -- base: a tabela carrega o próprio tenant SELECT c.oid, $1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AN` |
| ci_auditor | ~90 | ~26.4k | 287.25 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| ci_auditor | ~90 | ~17.7k | 192.05 | `SELECT n.nspname AS schema, c.relname AS name, CASE c.relkind WHEN $1 THEN $2 ELSE $3 END AS kind, pg_get_viewdef(c.oid, $4) AS definition, c.reloptions AS options, pg_get_userbyid(c.relowner) AS owner, obj_description(c` |
| ci_auditor | ~310 | ~15k | 48.23 | `SELECT p.proname, p.prosecdef::text, has_function_privilege($1, p.oid, $2)::text, has_function_privilege($3, p.oid, $4)::text, replace(coalesce(p.prosrc, $5), $6, $7) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.prona` |
| ci_auditor | ~90 | ~14.7k | 159.69 | `SELECT n.nspname AS schema, c.relname AS name, CASE c.relkind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 THEN $6 END AS kind, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced, pg_get_userbyid(c.relowner)` |
| ci_auditor | ~90 | ~14k | 152.31 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |
| ci_auditor | ~90 | ~12.7k | 138.49 | `SELECT n.nspname AS schema, c.relname AS name, GREATEST(c.reltuples::bigint, $1) AS est_rows, pg_total_relation_size(c.oid) AS total_bytes, pg_relation_size(c.oid) AS heap_bytes, pg_indexes_size(c.oid) AS index_bytes, s.` |
| ci_auditor | ~90 | ~10.2k | 110.70 | `SELECT n.nspname AS schema, c.relname AS "table", con.conname AS name, CASE con.contype WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 THEN $6 WHEN $7 THEN $8 WHEN $9 THEN $10 ELSE con.contype::text END AS type, pg_get_constrai` |
| ci_auditor | ~90 | ~10k | 108.27 | `SELECT n.nspname AS schema, t.relname AS "table", ic.relname AS name, pg_get_indexdef(ix.indexrelid) AS definition, ix.indisunique AS is_unique, ix.indisprimary AS is_primary, ix.indisvalid AS is_valid, am.amname AS meth` |
| ci_auditor | ~620 | ~7.4k | 11.87 | `SELECT p.proname, replace(p.prosrc, $1, $2) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = $3 AND p.prokind = $4` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator |  | 1 |
| ci_auditor | active | 1 |
| pgbouncer |  | 2 |
| postgres |  | 1 |
| supabase_admin |  | 4 |
