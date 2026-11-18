# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 64.4 MB |
| schema public | 29.3 MB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.audit_log_unified | ~3.8k | 3.7 MB | 1.9 MB | 1.5 MB | 1 | ~30 | ~1.2k | 2026-11-17 |
| public.login_attempts | ~3.8k | 1.7 MB | 432.0 KB | 1.2 MB | 0 | ~130 | ~50 | 2026-11-13 |
| public.rate_limits | ~1.5k | 1.6 MB | 592.0 KB | 968.0 KB | ~40 | ~1.2k | ~613.1k | 2026-11-18 |
| public.pii_access_logs | ~1.3k | 1.1 MB | 608.0 KB | 448.0 KB | 0 | ~80 | ~50 | 2026-11-18 |
| public.audit_log | ~550 | 1.0 MB | 624.0 KB | 328.0 KB | ~50 | ~80 | ~19.8k |  |
| public.sec_policy_regressions | ~3.6k | 800.0 KB | 536.0 KB | 224.0 KB | 0 | 4 | ~20 | 2026-10-31 |
| public.auditoria_logs | ~310 | 616.0 KB | 288.0 KB | 184.0 KB | 5 | ~30 | 5 |  |
| public.colaboradores | ~20 | 408.0 KB | 8.0 KB | 392.0 KB | 4 | ~47.5k | ~121.5k |  |
| public.notificacoes | ~10 | 232.0 KB | 24.0 KB | 176.0 KB | ~20 | ~15.1k | ~16.2k | 2026-11-05 |
| public.query_telemetry | ~260 | 232.0 KB | 64.0 KB | 136.0 KB | 0 | ~3.1k | ~141.1k |  |
| public.folhas_pagamento | 5 | 224.0 KB | 8.0 KB | 176.0 KB | ~40 | ~1.2k | ~8.2k | 2026-11-17 |
| public.registros_ponto | ~120 | 216.0 KB | 40.0 KB | 144.0 KB | 0 | ~60 | ~1.9k |  |
| public.asos | 0 | 200.0 KB | 8.0 KB | 184.0 KB | 0 | ~50 | ~60 |  |
| public.dp_audit_log_2026_07 | ~50 | 200.0 KB | 16.0 KB | 152.0 KB | 2 | ~40 | ~10 |  |
| public.ferias_audit_log | 0 | 184.0 KB | 56.0 KB | 96.0 KB | ~40 | ~30 | 4 |  |
| public.desligamentos | 0 | 176.0 KB | 8.0 KB | 160.0 KB | 0 | ~2.7k | ~8.6k |  |
| public.ferias | 0 | 176.0 KB | 8.0 KB | 160.0 KB | 8 | ~1.2k | ~16.6k |  |
| public.dp_audit_log_2026_08 | 0 | 168.0 KB | 16.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.dp_audit_log_2026_09 | 0 | 168.0 KB | 16.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.dp_audit_log_2026_10 | 0 | 168.0 KB | 16.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.sst_cat | 0 | 160.0 KB | 8.0 KB | 144.0 KB | 0 | ~50 | ~220 |  |
| public.sst_extintores | 0 | 160.0 KB | 8.0 KB | 144.0 KB | 0 | ~30 | ~20 |  |
| public.afastamentos | 0 | 144.0 KB | 8.0 KB | 128.0 KB | 0 | ~60 | ~5.7k |  |
| public.dp_audit_log_2026_11 | 0 | 136.0 KB | 8.0 KB | 120.0 KB | 0 | ~40 | ~10 |  |
| public.beneficios_colaborador | 0 | 128.0 KB | 8.0 KB | 112.0 KB | 1 | ~60 | ~180 |  |
| public.batidas_ponto | 0 | 120.0 KB | 0 B | 112.0 KB | 0 | ~5.3k | ~1.6k |  |
| public.cnab_remessas | 3 | 120.0 KB | 8.0 KB | 104.0 KB | 0 | ~660 | ~80 |  |
| public.workflows_execucoes | 0 | 120.0 KB | 24.0 KB | 64.0 KB | ~40 | ~30 | ~20 |  |
| public.admissoes | 0 | 112.0 KB | 16.0 KB | 64.0 KB | ~50 | ~5.1k | ~3.6k |  |
| public.despesas | 8 | 112.0 KB | 8.0 KB | 96.0 KB | ~20 | ~200 | ~80 |  |
| public.escalas_trabalho | ~100 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | ~30 | 6 |  |
| public.onboarding_colaborador | 0 | 112.0 KB | 8.0 KB | 96.0 KB | ~30 | ~40 | ~140 |  |
| public.onboarding_tarefas | 0 | 112.0 KB | 8.0 KB | 80.0 KB | 0 | ~60 | 1 | 2026-07-27 |
| public.eventos_variaveis | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 1 | ~30 | ~360 |  |
| public.premiacoes_auditoria | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 3 | ~30 | 5 |  |
| public.solicitacoes_ajuste_ponto | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 0 | ~3.3k | ~4.5k |  |
| public.sst_ordens_servico | 0 | 104.0 KB | 8.0 KB | 88.0 KB | 0 | ~30 | 3 |  |
| public.banco_horas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~1.4k | ~900 |  |
| public.candidaturas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 5 | ~30 | ~530 |  |
| public.clinicas_partners | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | ~30 |  |
| public.contabilidade_threads | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 6 | ~20 | ~30 |  |
| public.contas_bancarias | 0 | 96.0 KB | 16.0 KB | 48.0 KB | 5 | ~50 | ~210 |  |
| public.departamentos | ~10 | 96.0 KB | 8.0 KB | 80.0 KB | 9 | ~1.8k | ~470 |  |
| public.empresas | 1 | 96.0 KB | 8.0 KB | 80.0 KB | 5 | ~51.5k | 2 |  |
| public.epis_fichas | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | 3 |  |
| public.exames_agendamentos | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | 2 |  |
| public.feedbacks_360 | 0 | 96.0 KB | 8.0 KB | 80.0 KB | ~20 | ~150 | ~5.3k |  |
| public.folha_itens | ~10 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~160 | ~10 |  |
| public.lancamentos_contabeis | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~40 | ~190 |  |
| public.premiacoes_pagamentos | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 2 | ~70 | ~20 |  |
| public.sst_ltcat_laudos | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~20 | 1 |  |
| public.times | 2 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~40 | 2 |  |
| public.treinamento_certificados | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~70 | ~20 |  |
| public.whatsapp_mensagens_logs | 0 | 96.0 KB | 16.0 KB | 48.0 KB | ~20 | ~90 | ~170 |  |
| public.user_empresas | 6 | 88.0 KB | 8.0 KB | 80.0 KB | 8 | ~1.1M | ~6.2k |  |
| public.adiantamentos_salariais | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~40 | ~20 |  |
| public.ciencia_rate_limits | 0 | 80.0 KB | 8.0 KB | 64.0 KB | ~10 | ~20 | ~80 |  |
| public.contabilidade_mensagens | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 1 | ~20 | ~10 |  |
| public.contrato_templates | 5 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~30 | 5 |  |
| public.dependentes | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~30 | 8 |  |
| public.dp_audit_log_2026_12 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~40 | ~10 |  |
| public.dp_audit_log_2027_01 | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | 8 | 0 |  |
| public.dp_audit_log_default | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~40 | ~10 |  |
| public.dp_data_catalog | 4 | 80.0 KB | 8.0 KB | 64.0 KB | 5 | ~30 | 6 |  |
| public.dp_mcp_config | 0 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~20 | ~60 |  |
| public.epis_entregas | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~40 | 5 |  |
| public.historico_alertas | ~50 | 80.0 KB | 16.0 KB | 32.0 KB | 0 | ~20 | 1 |  |
| public.holerites | 0 | 80.0 KB | 0 B | 72.0 KB | 0 | ~50 | ~150 |  |
| public.inscricoes_cursos | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 4 | ~30 | ~30 |  |
| public.login_lockouts | 7 | 80.0 KB | 8.0 KB | 32.0 KB | ~30 | ~6.3k | ~1.9k | 2026-11-18 |
| public.metas_okrs | 0 | 80.0 KB | 8.0 KB | 64.0 KB | ~10 | ~40 | ~2.4k |  |
| public.onboarding_template_tarefas | 0 | 80.0 KB | 16.0 KB | 32.0 KB | ~40 | ~70 | ~80 | 2026-07-27 |
| public.sst_extintores_inspecoes | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~20 |  |
| public.sst_regimento_assinaturas | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~20 | ~190 |  |
| public.tarefas_onboarding | 0 | 80.0 KB | 8.0 KB | 48.0 KB | ~20 | ~520 | ~30 | 2026-07-27 |
| public.dados_estrangeiro | 0 | 72.0 KB | 0 B | 64.0 KB | 0 | ~30 | ~20 |  |
| public.admissao_tokens | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~20 |  |
| public.beneficios | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~90 | ~140 |  |
| public.cargos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | ~2.2k |  |
| public.clinicas_partners_servicos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 1 |  |
| public.contabilidade_contatos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~60 |  |
| public.dp_audit_config | 3 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 3 |  |
| public.emprestimos_consignados | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~20 |  |
| public.feedbacks_360_aprovacoes_gestor | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~40 | ~1.6k |  |
| public.feedbacks_360_consolidacoes | 4 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~110 | ~1.6k |  |
| public.feedbacks_360_operacoes | 0 | 64.0 KB | 16.0 KB | 16.0 KB | 4 | ~70 | ~40 |  |
| public.medidas_disciplinares | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~50 | 4 |  |
| public.onboarding_templates | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~20 | ~160 |  |
| public.pdi_plano_desenvolvimento | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~30 | ~2.3k |  |
| public.periodos_aquisitivos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~50 | ~110 | ~1.5k |  |
| public.permissions | 0 | 64.0 KB | 8.0 KB | 32.0 KB | ~40 | ~730 | ~190 | 2026-11-17 |
| public.premiacoes_regras | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~20 | ~20 |  |
| public.profiles | 1 | 64.0 KB | 8.0 KB | 48.0 KB | 2 | ~3.8k | 3 |  |
| public.recrutamento_anotacoes | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 2 | ~20 | 5 |  |
| public.recrutamento_entrevistas | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 3 |  |
| public.solicitacoes_hora_extra | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~30 |  |
| public.sst_programas | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 2 |  |
| public.sst_regimento_documentos | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~50 |  |
| public.treinamento_instancias | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~50 | 6 |  |
| public.workflows_historico | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 2 |  |
| public.beneficios_colaboradores | ~70 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~230 | ~80 |  |
| public.clinicas_partners_horarios | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | 0 |  |
| public.cnab_itens | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~30 | 1 |  |
| public.contrato_assinatura_tokens | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~30 | ~150 |  |
| public.contratos_gerados | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~40 | ~900 |  |
| public.dp_retention_policy | 2 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~500 | 2 |  |
| public.esocial_eventos | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~26.1k | ~14.8k |  |
| public.faltas | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~1k | ~770 |  |
| public.ferias_programacao | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~40 | 4 |  |
| public.idempotency_keys | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~15.8k | ~15.9k |  |
| public.logs_sistema | 0 | 56.0 KB | 8.0 KB | 40.0 KB | ~50 | ~130 | 1 |  |
| public.pix_lotes | 2 | 56.0 KB | 8.0 KB | 40.0 KB | 0 | ~620 | ~100 |  |
| public.security_alerts | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~640 | ~34.7k |  |
| public.times_brindes | 1 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | 1 |  |
| public.training_images | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | ~20 | 2 |  |
| public.trilhas_cursos | 0 | 56.0 KB | 8.0 KB | 48.0 KB | 2 | ~20 | ~10 |  |
| public.afdt_divergencias | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~250 |  |
| public.blocked_ips | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~120 | ~850 |  |
| public.candidatos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 5 | ~20 | ~350 |  |
| public.catalogo_cursos | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 3 | ~20 | ~110 |  |
| public.ciclos_avaliacao | 5 | 48.0 KB | 8.0 KB | 32.0 KB | ~40 | ~1.5k | ~1.1k |  |
| public.cid10 | 6 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | 6 |  |
| public.cnab_configuracoes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~540 |  |
| public.colaborador_lotacoes | 0 | 48.0 KB | 0 B | 48.0 KB | 0 | 6 | 0 |  |
| public.config_afastamentos | 6 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 6 |  |
| public.despesas_aprovacoes_log | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 2 |  |
| public.documentos_assinatura | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~40 | ~1.2k |  |
| public.dp_backup_runbook | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~20 |  |
| public.dp_environments | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 3 |  |
| public.epis | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~40 | ~70 |  |
| public.feedbacks_360_validacoes_potencial | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~1.6k | ~10 |  |
| public.fila_processamento | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~580 | 1 |  |
| public.folha_auditoria | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~30 | ~310 |  |
| public.historico_salarial | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~20 |  |
| public.jornadas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | ~20 |  |
| public.lgpd_retencao_logs | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 9 | ~80 |  |
| public.locais_trabalho | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~1.2k |  |
| public.medidas_ciencia_tokens | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | ~10 |  |
| public.password_reset_requests | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 2 |  |
| public.pesquisas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | ~20 |  |
| public.pii_access_alerts | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~10 | ~80 |  |
| public.plano_contas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~490 |  |
| public.premiacoes_campanhas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | ~10 | ~50 | ~70 |  |
| public.promo_brindes | 2 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~30 | 2 |  |
| public.recrutamento_testes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | 2 |  |
| public.role_permissions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | ~20 | 1 |  |
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
| public.vagas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 3 | ~20 | ~350 |  |
| public.workflows_definicoes | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 9 | ~20 | ~140 |  |
| public.workflows_etapas | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 1 | ~20 | 9 |  |
| public.aej_geracoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~10 |  |
| public.afdt_registros_raw | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 7 |  |
| public.audit_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 2 |  |
| public.auditoria | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 3 |  |
| public.beneficio_movimentacoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~180 |  |
| public.beneficio_regras_elegibilidade | 0 | 40.0 KB | 0 B | 40.0 KB | 0 | ~20 | 2 |  |
| public.configuracoes_ponto | 0 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~1.1k |  |
| public.contatos_emergencia | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~170 |  |
| public.contrato_token_eventos | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 1 |  |
| public.dados_estagiario | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~340 |  |
| public.documentos_colaborador | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 4 |  |
| public.dp_user_roles | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 8 |  |
| public.epis_fichas_itens | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 5 |  |
| public.feriados | 0 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~200 |  |
| public.ferias_reconciliacao_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~1.5k | ~140 |  |
| public.historico_calculos_folha | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~130 |  |
| public.historico_cargo | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.holerite_distribuicoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~270 |  |
| public.homologacoes_rescisao | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.ip_whitelist | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 9 |  |
| public.jornadas_horarios | 0 | 40.0 KB | 8.0 KB | 32.0 KB | 0 | ~20 | ~10 |  |
| public.login_rate_limits | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~280 | 1 |  |
| public.pcs_avaliacoes_cargo | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 0 |  |
| public.pcs_fatores | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 0 |  |
| public.pcs_planos | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.pensoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~190 |  |
| public.pesquisas_respostas | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.ponto_espelhos_assinados | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 1 |  |
| public.promocoes | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~170 |  |
| public.provisoes_folha | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~180 |  |
| public.provisoes_mensais | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~50 | ~1.6k |  |
| public.relatorios_agendados | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~40 | 4 |  |
| public.training_image_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 3 |  |
| public.transferencias | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 1 |  |
| public.user_roles | 3 | 40.0 KB | 8.0 KB | 32.0 KB | 1 | ~1.2M | ~90 |  |
| public.user_sessions | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 4 |  |
| public.vaga_entrevistas | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 2 |  |
| public.verification_tokens | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 3 |  |
| public.webauthn_credentials | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 5 |  |
| public.webhook_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~20 | 3 |  |
| public.ajustes_ponto | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.anotacoes_colaborador | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~10 |  |
| public.auditoria_contratual | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.beneficiarios_plano | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.beneficiarios_seguro | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.beneficio_arquivos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.catalogo_infracoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.cnab_sequencias | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 2 | 6 |  |
| public.colaborador_beneficios | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~20 | ~90 |  |
| public.configuracoes_esocial | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~1.7k |  |
| public.conformidade_ponto_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~20 |  |
| public.contratos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.controle_acesso | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.convenios_colaboradores | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.curriculos_arquivos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.deficiencias | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~200 |  |
| public.documento_templates | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.documentos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~40 | ~170 |  |
| public.documentos_historico | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.ferias_aprovacoes_log | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 5 |  |
| public.ferias_solicitacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.fila_notificacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.folha_assinaturas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~130 |  |
| public.folha_eventos_auditoria | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~130 |  |
| public.formacoes_academicas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 7 |  |
| public.govbr_auth_state | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~90 | 0 |  |
| public.historico_contratos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~180 |  |
| public.itens_folha | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~30 | ~150 |  |
| public.lancamentos_folha | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.lgpd_consentimentos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.lgpd_politicas_retencao | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 3 |  |
| public.lgpd_solicitacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~40 | ~20 |  |
| public.lotacoes | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~40 | ~170 |  |
| public.medidas_disciplinares_anexos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.medidas_disciplinares_contestacao_anexos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.medidas_disciplinares_integracao | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.metricas_processamento | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~30 | ~14.6k |  |
| public.onboarding_documentos_obrigatorios | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.pcs_grades | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 0 |  |
| public.pcs_pesquisa_salarial | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.pdis | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.periodos_experiencia | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~10 |  |
| public.permissao_recursos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.pix_itens | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~30 | ~170 |  |
| public.planos_saude | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.ponto_auditoria | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.ponto_seguranca_blacklist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.premiacoes_cenarios_simulacao | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.rate_limit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.recargas_vale | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.recrutamento_agendamentos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.report_dispatch_attempts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 8 | 0 |  |
| public.seguros_colaboradores | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.seguros_vida | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.simulacoes_fiscais | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.sinistros_seguro | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.sst_cat_anexos | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.sst_regimento_interno | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 2 |  |
| public.triagem_notas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.trilha_auditoria_ponto | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.user_mfa | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 6 |  |
| public.vaga_etapas | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 1 |  |
| public.vales_alimentacao | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.valores_campos_customizados | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | ~170 |  |
| public.verbas_rescisorias | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 3 |  |
| public.versao_banco | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~98.8k | 4 |  |
| public.webauthn_challenges | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.afd_geracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.afdt_importacoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~20 |  |
| public.audit_log_unified_archive | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.auth_gov_br_sessions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.banco_horas_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.beneficio_utilizacao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.campos_customizados | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.canal_etica | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 6 |  |
| public.cargo_faixas_salariais | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.categorias_trabalhador | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.centros_custo | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~20 |  |
| public.certificados_digitais | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~1.3k |  |
| public.competencias_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~2.3k |  |
| public.competencias_matriz | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.comunicados | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~10 |  |
| public.condicoes_ingresso | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.config_alertas_indicadores | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.configuracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.configuracoes_intervalo | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.convenios | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.dctfweb_declaracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.dependentes_beneficios | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | ~20 | 9 |  |
| public.descricoes_logradouro | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.documentos_admissao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.documentos_afastamento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.documentos_pessoais_arquivos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~20 |  |
| public.epis_fichas_assinaturas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.escalas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.esocial_lotes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.esocial_transmissao_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~1.3k | 1 |  |
| public.etnias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.exames | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~3k | ~170 |  |
| public.ferias_aprovacoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.ferias_arquivos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.ferias_coletivas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.fgts_digital_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.folha_lock_conflicts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | ~670 |  |
| public.generos_documento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 1 |  |
| public.geo_allowed_countries | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | ~20 | 4 |  |
| public.guias_fgts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.guias_inss | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.historico_ferias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 5 |  |
| public.historico_rescisoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~10 |  |
| public.ia_provisoes_alertas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.identidades_genero | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.linhas_transporte | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.log_envio_relatorios | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.logs_integracoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.logs_sincronizacao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.medidas_disciplinares_workflow_log | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.motivos_afastamento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.nacionalidades | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.ninebox_permissoes_homologacao | 0 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | ~10 | ~220 |  |
| public.notificacoes_admissao | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.onboarding_kits | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.paises | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.parametros_sistema | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 5 |  |
| public.password_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.pendencias | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~2.2k |  |
| public.periodos_ponto | 0 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | ~20 | 1 |  |
| public.permissao_perfis | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.personnel_budget | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | ~250 |  |
| public.pesquisas_perguntas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.ponto_ajustes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.ponto_auditoria_fraude | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.ponto_espelhos_revogacoes | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.premiacoes_alertas | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 5 |  |
| public.premiacoes_roi_cenarios | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.prorrogacoes_afastamento | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.provisao_auditoria | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 1 |  |
| public.provisao_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 2 |  |
| public.push_subscriptions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
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
| public.training_image_settings | 0 | 24.0 KB | 8.0 KB | 16.0 KB | 0 | 7 | ~10 |  |
| public.treinamento_feedback | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.treinamento_feedbacks | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.treinamento_participantes | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | ~20 | 2 |  |
| public.vales_transporte | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.vinculos | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | ~80 |  |
| public.webhooks | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.webhooks_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 4 |  |
| public.webhooks_logs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.whatsapp_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~30 | 3 |  |
| public.workflows_config | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 1 |  |
| public.auditoria_acesso_bancario | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.automacao_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 2 |  |
| public.bitrix24_config | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 2 |  |
| public.bitrix24_sync_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 2 |  |
| public.cbo | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.cnae | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.colaboradores_pin | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 7 | 0 |  |
| public.comunicados_leituras | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.configuracoes_alertas | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 2 |  |
| public.faixas_inss | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.faixas_irrf | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.geo_blocked_attempts | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~950 | 1 |  |
| public.geo_blocking_config | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 3 |  |
| public.guias_fgts_digital | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 1 |  |
| public.health_checks | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~2.5k | 0 |  |
| public.integracao_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 2 |  |
| public.integracoes | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.lgpd_fila_limpeza | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~60 | 3 |  |
| public.parametros_fiscais | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 0 |  |
| public.password_reset_config | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.ponto_regras_aprovacao | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 1 |  |
| public.portal_notificacoes_settings | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | ~20 | 2 |  |
| public.provisoes_competencia_tributaria | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.saved_filters | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 1 |  |
| public.sindicatos | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 2 |  |
| public.taxas_cambio | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~20 | 1 |  |
| public.whatsapp_templates | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~10 | 1 |  |
| public.password_policies | 0 | 8.0 KB | 0 B | 8.0 KB | 0 | ~20 | 0 |  |
| public.dp_audit_log | 0 | 0 B | 0 B | 0 B | 0 | 0 | 0 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_audit_unified_user_occurred | public.audit_log_unified | 280.0 KB |
| idx_login_attempts_email_hour | public.login_attempts | 328.0 KB |
| idx_login_attempts_ip_hour | public.login_attempts | 216.0 KB |
| idx_pii_access_logs_empresa_ts | public.pii_access_logs | 120.0 KB |
| idx_pii_access_logs_user_ts | public.pii_access_logs | 120.0 KB |


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
| ci_auditor | ~890 | ~1.9M | 2150.17 | `WITH ext AS ( SELECT e.extname, n.nspname AS sch FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE n.nspname <> $1 ), ext_fn AS ( SELECT DISTINCT e.extname, e.sch, p.proname, p.oid AS ext_fn_oid FRO` |
| ci_auditor | ~490 | ~1.2M | 2532.09 | `WITH ext AS ( SELECT e.extname, n.nspname AS sch FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE n.nspname <> $1 ), ext_fn AS ( SELECT DISTINCT e.extname, e.sch, p.proname, p.oid AS ext_fn_oid FRO` |
| ci_auditor | ~820 | ~559.2k | 681.14 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| ci_auditor | ~820 | ~297.3k | 361.73 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| ci_auditor | ~880 | ~265k | 300.09 | `WITH pii_tables AS ( -- Codex review (P1, PR #238): information_schema.columns só lista colunas -- de tabelas em que o role atual tem ALGUM privilégio concedido (regra do -- padrão SQL, aplicada pelo Postgres). ci_audito` |
| ci_auditor | ~820 | ~232.5k | 282.81 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| ci_auditor | ~1.4k | ~213.8k | 156.59 | `SELECT p.tablename, p.policyname, p.cmd, array_to_string(p.roles, $1), replace(coalesce(p.qual, $2) \|\| $3 \|\| coalesce(p.with_check, $4), $5, $6) FROM pg_policies p WHERE p.schemaname = $7 ORDER BY p.tablename, p.policyna` |
| ci_auditor | ~820 | ~155.8k | 189.50 | `SELECT n.nspname AS schema, c.relname AS name, CASE c.relkind WHEN $1 THEN $2 ELSE $3 END AS kind, pg_get_viewdef(c.oid, $4) AS definition, c.reloptions AS options, pg_get_userbyid(c.relowner) AS owner, obj_description(c` |
| ci_auditor | ~480 | ~154.4k | 321.69 | `WITH pii_tables AS ( -- Codex review (P1, PR #238): information_schema.columns só lista colunas -- de tabelas em que o role atual tem ALGUM privilégio concedido (regra do -- padrão SQL, aplicada pelo Postgres). ci_audito` |
| ci_auditor | ~820 | ~133.4k | 162.25 | `SELECT n.nspname AS schema, c.relname AS name, CASE c.relkind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 THEN $6 END AS kind, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced, pg_get_userbyid(c.relowner)` |
| ci_auditor | ~820 | ~124.8k | 151.83 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |
| ci_auditor | ~820 | ~113.2k | 137.68 | `SELECT n.nspname AS schema, c.relname AS name, GREATEST(c.reltuples::bigint, $1) AS est_rows, pg_total_relation_size(c.oid) AS total_bytes, pg_relation_size(c.oid) AS heap_bytes, pg_indexes_size(c.oid) AS index_bytes, s.` |
| ci_auditor | ~820 | ~90.2k | 109.71 | `SELECT n.nspname AS schema, t.relname AS "table", ic.relname AS name, pg_get_indexdef(ix.indexrelid) AS definition, ix.indisunique AS is_unique, ix.indisprimary AS is_primary, ix.indisvalid AS is_valid, am.amname AS meth` |
| ci_auditor | ~880 | ~81.5k | 92.33 | `WITH RECURSIVE alcanca_tenant(oid, profundidade) AS ( -- base: a tabela carrega o próprio tenant SELECT c.oid, $1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AN` |
| ci_auditor | ~450 | ~49.5k | 109.77 | `SELECT n.nspname AS schema, c.relname AS "table", con.conname AS name, CASE con.contype WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 THEN $6 WHEN $7 THEN $8 WHEN $9 THEN $10 ELSE con.contype::text END AS type, pg_get_constrai` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator |  | 1 |
| ci_auditor | active | 1 |
| pgbouncer |  | 1 |
| supabase_admin |  | 4 |
