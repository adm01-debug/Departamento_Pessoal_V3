# Tabelas

Um arquivo por tabela em `tables/<schema>/<tabela>.md` (colunas, constraints, índices, RLS/policies, triggers, grants). Métricas de volume em `stats.md`.

| tabela | tipo | RLS | policies | colunas | realtime | comentário |
|---|---|---|---|---|---|---|
| [public.adiantamentos_salariais](tables/public/adiantamentos_salariais.md) | table | sim | 1 | 12 | não |  |
| [public.admissao_tokens](tables/public/admissao_tokens.md) | table | sim | 1 | 16 | não |  |
| [public.admissoes](tables/public/admissoes.md) | table | sim | 6 | 31 | não |  |
| [public.aej_geracoes](tables/public/aej_geracoes.md) | table | sim | 2 | 13 | não |  |
| [public.afastamentos](tables/public/afastamentos.md) | table | sim | 1 | 32 | não |  |
| [public.afd_geracoes](tables/public/afd_geracoes.md) | table | sim | 2 | 13 | não |  |
| [public.afdt_divergencias](tables/public/afdt_divergencias.md) | table | sim | 1 | 13 | sim |  |
| [public.afdt_importacoes](tables/public/afdt_importacoes.md) | table | sim | 1 | 18 | não |  |
| [public.afdt_registros_raw](tables/public/afdt_registros_raw.md) | table | sim | 1 | 13 | não |  |
| [public.ajustes_ponto](tables/public/ajustes_ponto.md) | table | sim | 1 | 12 | não |  |
| [public.anotacoes_colaborador](tables/public/anotacoes_colaborador.md) | table | sim | 1 | 9 | não |  |
| [public.asos](tables/public/asos.md) | table | sim | 1 | 29 | não |  |
| [public.audit_log](tables/public/audit_log.md) | table | sim | 3 | 16 | não |  |
| [public.audit_log_unified](tables/public/audit_log_unified.md) | table | sim | 2 | 13 | não |  |
| [public.audit_log_unified_archive](tables/public/audit_log_unified_archive.md) | table | sim | 1 | 13 | não |  |
| [public.audit_logs](tables/public/audit_logs.md) | table | sim | 2 | 12 | não |  |
| [public.auditoria](tables/public/auditoria.md) | table | sim | 3 | 12 | não |  |
| [public.auditoria_acesso_bancario](tables/public/auditoria_acesso_bancario.md) | table | sim | 1 | 8 | não | LGPD/ISO 27001: auditoria de todo acesso a dados bancários descriptografados. |
| [public.auditoria_contratual](tables/public/auditoria_contratual.md) | table | sim | 1 | 7 | não |  |
| [public.auditoria_logs](tables/public/auditoria_logs.md) | table | sim | 4 | 12 | não |  |
| [public.auth_gov_br_sessions](tables/public/auth_gov_br_sessions.md) | table | sim | 1 | 8 | não |  |
| [public.automacao_logs](tables/public/automacao_logs.md) | table | sim | 1 | 7 | não |  |
| [public.banco_horas](tables/public/banco_horas.md) | table | sim | 2 | 12 | não |  |
| [public.banco_horas_config](tables/public/banco_horas_config.md) | table | sim | 2 | 9 | não |  |
| [public.batidas_ponto](tables/public/batidas_ponto.md) | table | sim | 5 | 38 | não |  |
| [public.beneficiarios_plano](tables/public/beneficiarios_plano.md) | table | sim | 1 | 12 | não |  |
| [public.beneficiarios_seguro](tables/public/beneficiarios_seguro.md) | table | sim | 1 | 9 | não |  |
| [public.beneficio_arquivos](tables/public/beneficio_arquivos.md) | table | sim | 1 | 8 | não |  |
| [public.beneficio_movimentacoes](tables/public/beneficio_movimentacoes.md) | table | sim | 1 | 8 | não |  |
| [public.beneficio_regras_elegibilidade](tables/public/beneficio_regras_elegibilidade.md) | table | sim | 1 | 9 | não |  |
| [public.beneficio_utilizacao](tables/public/beneficio_utilizacao.md) | table | sim | 1 | 8 | não |  |
| [public.beneficios](tables/public/beneficios.md) | table | sim | 2 | 25 | não |  |
| [public.beneficios_colaborador](tables/public/beneficios_colaborador.md) | table | sim | 1 | 17 | não |  |
| [public.beneficios_colaboradores](tables/public/beneficios_colaboradores.md) | table | sim | 1 | 8 | não |  |
| [public.bitrix24_config](tables/public/bitrix24_config.md) | table | sim | 1 | 17 | não |  |
| [public.bitrix24_sync_logs](tables/public/bitrix24_sync_logs.md) | table | sim | 2 | 11 | não |  |
| [public.blocked_ips](tables/public/blocked_ips.md) | table | sim | 1 | 8 | não |  |
| [public.campos_customizados](tables/public/campos_customizados.md) | table | sim | 1 | 11 | não |  |
| [public.canal_etica](tables/public/canal_etica.md) | table | sim | 2 | 11 | não |  |
| [public.candidatos](tables/public/candidatos.md) | table | sim | 2 | 15 | não |  |
| [public.candidaturas](tables/public/candidaturas.md) | table | sim | 2 | 16 | não |  |
| [public.cargo_faixas_salariais](tables/public/cargo_faixas_salariais.md) | table | sim | 1 | 7 | não |  |
| [public.cargos](tables/public/cargos.md) | table | sim | 1 | 13 | não |  |
| [public.catalogo_cursos](tables/public/catalogo_cursos.md) | table | sim | 4 | 12 | não |  |
| [public.catalogo_infracoes](tables/public/catalogo_infracoes.md) | table | sim | 4 | 11 | não |  |
| [public.categorias_trabalhador](tables/public/categorias_trabalhador.md) | table | sim | 1 | 4 | não |  |
| [public.cbo](tables/public/cbo.md) | table | sim | 1 | 3 | não | Catálogo CBO (Classificação Brasileira de Ocupações). Carga via importação de domínio. |
| [public.centros_custo](tables/public/centros_custo.md) | table | sim | 1 | 8 | não |  |
| [public.certificados_digitais](tables/public/certificados_digitais.md) | table | sim | 1 | 12 | não |  |
| [public.ciclos_avaliacao](tables/public/ciclos_avaliacao.md) | table | sim | 4 | 10 | não |  |
| [public.cid10](tables/public/cid10.md) | table | sim | 1 | 4 | não |  |
| [public.ciencia_rate_limits](tables/public/ciencia_rate_limits.md) | table | sim | 1 | 6 | não |  |
| [public.clinicas_partners](tables/public/clinicas_partners.md) | table | sim | 1 | 28 | não |  |
| [public.clinicas_partners_horarios](tables/public/clinicas_partners_horarios.md) | table | sim | 1 | 10 | não |  |
| [public.clinicas_partners_servicos](tables/public/clinicas_partners_servicos.md) | table | sim | 1 | 8 | não |  |
| [public.cnab_configuracoes](tables/public/cnab_configuracoes.md) | table | sim | 1 | 12 | não |  |
| [public.cnab_itens](tables/public/cnab_itens.md) | table | sim | 2 | 17 | não |  |
| [public.cnab_remessas](tables/public/cnab_remessas.md) | table | sim | 2 | 14 | não |  |
| [public.cnab_sequencias](tables/public/cnab_sequencias.md) | table | sim | 0 | 3 | não |  |
| [public.cnae](tables/public/cnae.md) | table | sim | 1 | 3 | não | Catálogo CNAE. Carga via importação de domínio. |
| [public.colaborador_beneficios](tables/public/colaborador_beneficios.md) | table | sim | 2 | 5 | não |  |
| [public.colaboradores](tables/public/colaboradores.md) | table | sim | 3 | 150 | não |  |
| [public.colaboradores_pin](tables/public/colaboradores_pin.md) | table | sim | 0 | 6 | não |  |
| [public.competencias_config](tables/public/competencias_config.md) | table | sim | 1 | 8 | não |  |
| [public.competencias_matriz](tables/public/competencias_matriz.md) | table | sim | 4 | 9 | não |  |
| [public.comunicados](tables/public/comunicados.md) | table | sim | 1 | 11 | não |  |
| [public.comunicados_leituras](tables/public/comunicados_leituras.md) | table | sim | 4 | 4 | não |  |
| [public.condicoes_ingresso](tables/public/condicoes_ingresso.md) | table | sim | 1 | 3 | não |  |
| [public.config_afastamentos](tables/public/config_afastamentos.md) | table | sim | 1 | 10 | não |  |
| [public.config_alertas_indicadores](tables/public/config_alertas_indicadores.md) | table | sim | 3 | 6 | não |  |
| [public.configuracoes](tables/public/configuracoes.md) | table | sim | 3 | 7 | não |  |
| [public.configuracoes_alertas](tables/public/configuracoes_alertas.md) | table | sim | 1 | 5 | não |  |
| [public.configuracoes_esocial](tables/public/configuracoes_esocial.md) | table | sim | 1 | 6 | não |  |
| [public.configuracoes_intervalo](tables/public/configuracoes_intervalo.md) | table | sim | 1 | 11 | não |  |
| [public.configuracoes_ponto](tables/public/configuracoes_ponto.md) | table | sim | 2 | 10 | não |  |
| [public.conformidade_ponto_logs](tables/public/conformidade_ponto_logs.md) | table | sim | 1 | 8 | não |  |
| [public.contabilidade_contatos](tables/public/contabilidade_contatos.md) | table | sim | 1 | 9 | não |  |
| [public.contabilidade_mensagens](tables/public/contabilidade_mensagens.md) | table | sim | 1 | 10 | não |  |
| [public.contabilidade_threads](tables/public/contabilidade_threads.md) | table | sim | 1 | 12 | não |  |
| [public.contas_bancarias](tables/public/contas_bancarias.md) | table | sim | 1 | 21 | não |  |
| [public.contatos_emergencia](tables/public/contatos_emergencia.md) | table | sim | 1 | 11 | não |  |
| [public.contrato_assinatura_tokens](tables/public/contrato_assinatura_tokens.md) | table | sim | 2 | 19 | não |  |
| [public.contrato_templates](tables/public/contrato_templates.md) | table | sim | 2 | 15 | não |  |
| [public.contrato_token_eventos](tables/public/contrato_token_eventos.md) | table | sim | 1 | 10 | não |  |
| [public.contratos](tables/public/contratos.md) | table | sim | 1 | 10 | não |  |
| [public.contratos_gerados](tables/public/contratos_gerados.md) | table | sim | 2 | 21 | não |  |
| [public.controle_acesso](tables/public/controle_acesso.md) | table | sim | 1 | 12 | não |  |
| [public.convenios](tables/public/convenios.md) | table | sim | 1 | 7 | não |  |
| [public.convenios_colaboradores](tables/public/convenios_colaboradores.md) | table | sim | 1 | 7 | não |  |
| [public.curriculos_arquivos](tables/public/curriculos_arquivos.md) | table | sim | 1 | 5 | não |  |
| [public.dados_estagiario](tables/public/dados_estagiario.md) | table | sim | 1 | 27 | não |  |
| [public.dados_estrangeiro](tables/public/dados_estrangeiro.md) | table | sim | 1 | 19 | não |  |
| [public.dctfweb_declaracoes](tables/public/dctfweb_declaracoes.md) | table | sim | 1 | 11 | não |  |
| [public.deficiencias](tables/public/deficiencias.md) | table | sim | 1 | 10 | não |  |
| [public.departamentos](tables/public/departamentos.md) | table | sim | 1 | 10 | não |  |
| [public.dependentes](tables/public/dependentes.md) | table | sim | 2 | 20 | não |  |
| [public.dependentes_beneficios](tables/public/dependentes_beneficios.md) | table | sim | 1 | 7 | não |  |
| [public.descricoes_logradouro](tables/public/descricoes_logradouro.md) | table | sim | 1 | 3 | não |  |
| [public.desligamentos](tables/public/desligamentos.md) | table | sim | 1 | 49 | não |  |
| [public.despesas](tables/public/despesas.md) | table | sim | 1 | 19 | não |  |
| [public.despesas_aprovacoes_log](tables/public/despesas_aprovacoes_log.md) | table | sim | 2 | 9 | não |  |
| [public.documento_templates](tables/public/documento_templates.md) | table | sim | 2 | 11 | não |  |
| [public.documentos](tables/public/documentos.md) | table | sim | 2 | 12 | não |  |
| [public.documentos_admissao](tables/public/documentos_admissao.md) | table | sim | 2 | 11 | não |  |
| [public.documentos_afastamento](tables/public/documentos_afastamento.md) | table | sim | 2 | 7 | não |  |
| [public.documentos_assinatura](tables/public/documentos_assinatura.md) | table | sim | 3 | 15 | não |  |
| [public.documentos_colaborador](tables/public/documentos_colaborador.md) | table | sim | 2 | 11 | não |  |
| [public.documentos_historico](tables/public/documentos_historico.md) | table | sim | 1 | 8 | não |  |
| [public.documentos_pessoais_arquivos](tables/public/documentos_pessoais_arquivos.md) | table | sim | 1 | 13 | não |  |
| [public.dp_audit_config](tables/public/dp_audit_config.md) | table | sim | 1 | 9 | não | Registro de politicas de auditoria por tabela para LGPD Art. 37 e 39. PROCEDIMENTO DE ATIVACAO pgaudit:   1. Acessar Supabase Dashboard > Database > Extensions   2. Habilitar pgaudit   3. Executar: ALTER DATABASE postgres SET pgaudit.log = 'write';   4. Executar: ALTER DATABASE postgres SET pgaudit.log_relation = 'on';   5. Para cada tabela em dp_audit_config WHERE enabled=true E audit_writes=true:      SECURITY LABEL FOR pgaudit ON TABLE public.<tabela> IS 'OBJECT';   ATENCAO: pgaudit.log = 'all' enche o disco em horas. Usar SOMENTE 'write'. |
| [public.dp_audit_log](tables/public/dp_audit_log.md) | partitioned | sim | 3 | 10 | não | Audit log Departamento Pessoal — IMUTÁVEL (sem UPDATE/DELETE de roles de aplicação). Particionado por mês para performance e retenção. LGPD Art.37: registro de operações de tratamento de dados. Conteúdo: metadata de eventos — NÃO armazena PII raw no payload. |
| [public.dp_audit_log_2026_07](tables/public/dp_audit_log_2026_07.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_2026_08](tables/public/dp_audit_log_2026_08.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_2026_09](tables/public/dp_audit_log_2026_09.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_2026_10](tables/public/dp_audit_log_2026_10.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_2026_11](tables/public/dp_audit_log_2026_11.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_2026_12](tables/public/dp_audit_log_2026_12.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_2027_01](tables/public/dp_audit_log_2027_01.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_audit_log_default](tables/public/dp_audit_log_default.md) | table (partição) | sim | 0 | 10 | não |  |
| [public.dp_backup_runbook](tables/public/dp_backup_runbook.md) | table | sim | 1 | 7 | não | Runbook de backup/restore E migracao de secrets. Ver steps 10-14 para Item 7. STATUS Item 7: Chave PII migrada para Vault (vault.secrets.dp_pii_master_key). PENDENTE: DATABASE_URL e SERVICE_ROLE_KEY ainda em plaintext no compose da stack 182. Migracao para Docker Secrets requer modificacao do MCP para ler _FILE suffix. |
| [public.dp_data_catalog](tables/public/dp_data_catalog.md) | table | sim | 2 | 13 | não | Inventário de dados pessoais (Data Map) — LGPD Art. 37. Obrigatório manter atualizado. Auditado pelo Encarregado (DPO). |
| [public.dp_environments](tables/public/dp_environments.md) | table | sim | 1 | 10 | não | Definicao de ambientes e suas politicas de RTO/RPO. REGRA: apenas production tem is_production=true. CI so pode apontar para ci_allowed=true. |
| [public.dp_mcp_config](tables/public/dp_mcp_config.md) | table | sim | 1 | 5 | não | Configuracao e versoes do MCP e schema. Usar como fonte de verdade para CI/CD. Item 13: antes de cada deploy, verificar: SELECT config_val FROM dp_mcp_config WHERE config_key='schema_version' |
| [public.dp_retention_policy](tables/public/dp_retention_policy.md) | table | sim | 1 | 12 | não | Politicas retencao LGPD. dry_run+disabled por padrao — ativar somente apos validar. |
| [public.dp_user_roles](tables/public/dp_user_roles.md) | table | sim | 3 | 8 | não | Atribuicao de roles a usuarios. Gerenciado pelo role rh ou admin. Integracao: JWT claims devem incluir role via custom claim (Supabase Auth hook). Exemplo de hook SQL: SELECT role FROM dp_user_roles WHERE user_id = uid AND active = true LIMIT 1. |
| [public.empresas](tables/public/empresas.md) | table | sim | 2 | 29 | não |  |
| [public.emprestimos_consignados](tables/public/emprestimos_consignados.md) | table | sim | 1 | 14 | não |  |
| [public.epis](tables/public/epis.md) | table | sim | 5 | 15 | não |  |
| [public.epis_entregas](tables/public/epis_entregas.md) | table | sim | 4 | 13 | não |  |
| [public.epis_fichas](tables/public/epis_fichas.md) | table | sim | 2 | 15 | não |  |
| [public.epis_fichas_assinaturas](tables/public/epis_fichas_assinaturas.md) | table | sim | 2 | 8 | não |  |
| [public.epis_fichas_itens](tables/public/epis_fichas_itens.md) | table | sim | 1 | 11 | não |  |
| [public.escalas](tables/public/escalas.md) | table | sim | 4 | 12 | não |  |
| [public.escalas_trabalho](tables/public/escalas_trabalho.md) | table | sim | 1 | 9 | não |  |
| [public.esocial_eventos](tables/public/esocial_eventos.md) | table | sim | 2 | 25 | não |  |
| [public.esocial_lotes](tables/public/esocial_lotes.md) | table | sim | 1 | 9 | não |  |
| [public.esocial_transmissao_logs](tables/public/esocial_transmissao_logs.md) | table | sim | 1 | 9 | não |  |
| [public.etnias](tables/public/etnias.md) | table | sim | 1 | 4 | não |  |
| [public.eventos_variaveis](tables/public/eventos_variaveis.md) | table | sim | 1 | 11 | não |  |
| [public.exames](tables/public/exames.md) | table | sim | 1 | 10 | não |  |
| [public.exames_agendamentos](tables/public/exames_agendamentos.md) | table | sim | 1 | 15 | não |  |
| [public.faixas_inss](tables/public/faixas_inss.md) | table | sim | 1 | 4 | não | Faixas da tabela INSS. Carga via importação de domínio. |
| [public.faixas_irrf](tables/public/faixas_irrf.md) | table | sim | 1 | 4 | não | Faixas da tabela IRRF. Carga via importação de domínio. |
| [public.faltas](tables/public/faltas.md) | table | sim | 5 | 26 | não |  |
| [public.feedbacks_360](tables/public/feedbacks_360.md) | table | sim | 2 | 16 | não |  |
| [public.feedbacks_360_aprovacoes_gestor](tables/public/feedbacks_360_aprovacoes_gestor.md) | table | sim | 1 | 14 | não | Historico append-only das decisoes do GESTOR, ancoradas na versao canonica da avaliacao do gestor. |
| [public.feedbacks_360_consolidacoes](tables/public/feedbacks_360_consolidacoes.md) | table | sim | 1 | 21 | não |  |
| [public.feedbacks_360_operacoes](tables/public/feedbacks_360_operacoes.md) | table | sim | 1 | 7 | não |  |
| [public.feedbacks_360_validacoes_potencial](tables/public/feedbacks_360_validacoes_potencial.md) | table | sim | 1 | 10 | não |  |
| [public.feriados](tables/public/feriados.md) | table | sim | 1 | 8 | não |  |
| [public.ferias](tables/public/ferias.md) | table | sim | 2 | 68 | não |  |
| [public.ferias_aprovacoes](tables/public/ferias_aprovacoes.md) | table | sim | 1 | 9 | não |  |
| [public.ferias_aprovacoes_log](tables/public/ferias_aprovacoes_log.md) | table | sim | 1 | 7 | não |  |
| [public.ferias_arquivos](tables/public/ferias_arquivos.md) | table | sim | 1 | 7 | não |  |
| [public.ferias_audit_log](tables/public/ferias_audit_log.md) | table | sim | 1 | 10 | não |  |
| [public.ferias_coletivas](tables/public/ferias_coletivas.md) | table | sim | 1 | 19 | não |  |
| [public.ferias_programacao](tables/public/ferias_programacao.md) | table | sim | 4 | 22 | não |  |
| [public.ferias_reconciliacao_logs](tables/public/ferias_reconciliacao_logs.md) | table | sim | 1 | 8 | não |  |
| [public.ferias_solicitacoes](tables/public/ferias_solicitacoes.md) | table | sim | 1 | 12 | não |  |
| [public.fgts_digital_logs](tables/public/fgts_digital_logs.md) | table | sim | 1 | 7 | não |  |
| [public.fila_notificacoes](tables/public/fila_notificacoes.md) | table | sim | 1 | 11 | não |  |
| [public.fila_processamento](tables/public/fila_processamento.md) | table | sim | 1 | 17 | não |  |
| [public.folha_assinaturas](tables/public/folha_assinaturas.md) | table | sim | 1 | 9 | não |  |
| [public.folha_auditoria](tables/public/folha_auditoria.md) | table | sim | 2 | 9 | não |  |
| [public.folha_eventos_auditoria](tables/public/folha_eventos_auditoria.md) | table | sim | 1 | 6 | não |  |
| [public.folha_itens](tables/public/folha_itens.md) | table | sim | 1 | 13 | não |  |
| [public.folha_lock_conflicts](tables/public/folha_lock_conflicts.md) | table | sim | 2 | 8 | não |  |
| [public.folhas_pagamento](tables/public/folhas_pagamento.md) | table | sim | 2 | 26 | não |  |
| [public.formacoes_academicas](tables/public/formacoes_academicas.md) | table | sim | 1 | 9 | não |  |
| [public.generos_documento](tables/public/generos_documento.md) | table | sim | 1 | 4 | não |  |
| [public.geo_allowed_countries](tables/public/geo_allowed_countries.md) | table | sim | 1 | 5 | não |  |
| [public.geo_blocked_attempts](tables/public/geo_blocked_attempts.md) | table | sim | 1 | 6 | não |  |
| [public.geo_blocking_config](tables/public/geo_blocking_config.md) | table | sim | 1 | 6 | não |  |
| [public.govbr_auth_state](tables/public/govbr_auth_state.md) | table | sim | 1 | 6 | não |  |
| [public.guias_fgts](tables/public/guias_fgts.md) | table | sim | 1 | 12 | não |  |
| [public.guias_fgts_digital](tables/public/guias_fgts_digital.md) | table | sim | 1 | 13 | não |  |
| [public.guias_inss](tables/public/guias_inss.md) | table | sim | 1 | 12 | não |  |
| [public.health_checks](tables/public/health_checks.md) | table | sim | 1 | 4 | não | Registro opcional de execuções de healthcheck (healthcheck/metrics). |
| [public.historico_alertas](tables/public/historico_alertas.md) | table | sim | 2 | 7 | não |  |
| [public.historico_calculos_folha](tables/public/historico_calculos_folha.md) | table | sim | 2 | 6 | não |  |
| [public.historico_cargo](tables/public/historico_cargo.md) | table | sim | 1 | 12 | não |  |
| [public.historico_contratos](tables/public/historico_contratos.md) | table | sim | 1 | 15 | não |  |
| [public.historico_ferias](tables/public/historico_ferias.md) | table | sim | 1 | 7 | não |  |
| [public.historico_rescisoes](tables/public/historico_rescisoes.md) | table | sim | 1 | 18 | não |  |
| [public.historico_salarial](tables/public/historico_salarial.md) | table | sim | 1 | 17 | não |  |
| [public.holerite_distribuicoes](tables/public/holerite_distribuicoes.md) | table | sim | 1 | 10 | não |  |
| [public.holerites](tables/public/holerites.md) | table | sim | 2 | 29 | não |  |
| [public.homologacoes_rescisao](tables/public/homologacoes_rescisao.md) | table | sim | 1 | 8 | não |  |
| [public.ia_provisoes_alertas](tables/public/ia_provisoes_alertas.md) | table | sim | 1 | 7 | não |  |
| [public.idempotency_keys](tables/public/idempotency_keys.md) | table | sim | 1 | 12 | não |  |
| [public.identidades_genero](tables/public/identidades_genero.md) | table | sim | 1 | 3 | não |  |
| [public.inscricoes_cursos](tables/public/inscricoes_cursos.md) | table | sim | 4 | 11 | não |  |
| [public.integracao_logs](tables/public/integracao_logs.md) | table | sim | 1 | 9 | não |  |
| [public.integracoes](tables/public/integracoes.md) | table | sim | 1 | 9 | não |  |
| [public.ip_whitelist](tables/public/ip_whitelist.md) | table | sim | 1 | 5 | não |  |
| [public.itens_folha](tables/public/itens_folha.md) | table | sim | 1 | 8 | não |  |
| [public.jornadas](tables/public/jornadas.md) | table | sim | 1 | 11 | não |  |
| [public.jornadas_horarios](tables/public/jornadas_horarios.md) | table | sim | 1 | 9 | não |  |
| [public.lancamentos_contabeis](tables/public/lancamentos_contabeis.md) | table | sim | 1 | 12 | não |  |
| [public.lancamentos_folha](tables/public/lancamentos_folha.md) | table | sim | 1 | 10 | não |  |
| [public.lgpd_consentimentos](tables/public/lgpd_consentimentos.md) | table | sim | 1 | 11 | não |  |
| [public.lgpd_fila_limpeza](tables/public/lgpd_fila_limpeza.md) | table | sim | 1 | 8 | não |  |
| [public.lgpd_politicas_retencao](tables/public/lgpd_politicas_retencao.md) | table | sim | 1 | 6 | não |  |
| [public.lgpd_retencao_logs](tables/public/lgpd_retencao_logs.md) | table | sim | 1 | 8 | não |  |
| [public.lgpd_solicitacoes](tables/public/lgpd_solicitacoes.md) | table | sim | 1 | 12 | não |  |
| [public.linhas_transporte](tables/public/linhas_transporte.md) | table | sim | 1 | 7 | não |  |
| [public.locais_trabalho](tables/public/locais_trabalho.md) | table | sim | 1 | 14 | não |  |
| [public.log_envio_relatorios](tables/public/log_envio_relatorios.md) | table | sim | 2 | 5 | não |  |
| [public.login_attempts](tables/public/login_attempts.md) | table | sim | 2 | 9 | não |  |
| [public.login_lockouts](tables/public/login_lockouts.md) | table | sim | 1 | 9 | não |  |
| [public.login_rate_limits](tables/public/login_rate_limits.md) | table | sim | 1 | 8 | não |  |
| [public.logs_integracoes](tables/public/logs_integracoes.md) | table | sim | 2 | 7 | não |  |
| [public.logs_sincronizacao](tables/public/logs_sincronizacao.md) | table | sim | 1 | 9 | não |  |
| [public.logs_sistema](tables/public/logs_sistema.md) | table | sim | 3 | 10 | não |  |
| [public.lotacoes](tables/public/lotacoes.md) | table | sim | 1 | 9 | não |  |
| [public.medidas_ciencia_tokens](tables/public/medidas_ciencia_tokens.md) | table | sim | 2 | 15 | não | Internal token state. Public acknowledgement is available only through hash-validating RPCs. |
| [public.medidas_disciplinares](tables/public/medidas_disciplinares.md) | table | sim | 1 | 58 | não |  |
| [public.medidas_disciplinares_anexos](tables/public/medidas_disciplinares_anexos.md) | table | sim | 1 | 10 | não |  |
| [public.medidas_disciplinares_contestacao_anexos](tables/public/medidas_disciplinares_contestacao_anexos.md) | table | sim | 3 | 10 | não |  |
| [public.medidas_disciplinares_integracao](tables/public/medidas_disciplinares_integracao.md) | table | sim | 3 | 13 | não |  |
| [public.medidas_disciplinares_workflow_log](tables/public/medidas_disciplinares_workflow_log.md) | table | sim | 1 | 9 | não |  |
| [public.metas_okrs](tables/public/metas_okrs.md) | table | sim | 5 | 14 | não |  |
| [public.metricas_processamento](tables/public/metricas_processamento.md) | table | sim | 2 | 5 | não |  |
| [public.motivos_afastamento](tables/public/motivos_afastamento.md) | table | sim | 1 | 4 | não |  |
| [public.nacionalidades](tables/public/nacionalidades.md) | table | sim | 1 | 4 | não |  |
| [public.ninebox_permissoes_homologacao](tables/public/ninebox_permissoes_homologacao.md) | table | sim | 0 | 4 | não |  |
| [public.notificacoes](tables/public/notificacoes.md) | table | sim | 4 | 11 | não |  |
| [public.notificacoes_admissao](tables/public/notificacoes_admissao.md) | table | sim | 1 | 9 | não |  |
| [public.onboarding_colaborador](tables/public/onboarding_colaborador.md) | table | sim | 2 | 11 | não |  |
| [public.onboarding_documentos_obrigatorios](tables/public/onboarding_documentos_obrigatorios.md) | table | sim | 1 | 7 | não |  |
| [public.onboarding_kits](tables/public/onboarding_kits.md) | table | sim | 1 | 6 | não |  |
| [public.onboarding_tarefas](tables/public/onboarding_tarefas.md) | table | sim | 2 | 14 | não |  |
| [public.onboarding_template_tarefas](tables/public/onboarding_template_tarefas.md) | table | sim | 1 | 10 | não |  |
| [public.onboarding_templates](tables/public/onboarding_templates.md) | table | sim | 1 | 7 | não |  |
| [public.paises](tables/public/paises.md) | table | sim | 1 | 4 | não |  |
| [public.parametros_fiscais](tables/public/parametros_fiscais.md) | table | sim | 1 | 12 | não |  |
| [public.parametros_sistema](tables/public/parametros_sistema.md) | table | sim | 2 | 7 | não |  |
| [public.password_history](tables/public/password_history.md) | table | sim | 1 | 4 | não |  |
| [public.password_policies](tables/public/password_policies.md) | table | sim | 2 | 12 | não |  |
| [public.password_reset_config](tables/public/password_reset_config.md) | table | sim | 1 | 8 | não |  |
| [public.password_reset_requests](tables/public/password_reset_requests.md) | table | sim | 3 | 13 | não |  |
| [public.pcs_avaliacoes_cargo](tables/public/pcs_avaliacoes_cargo.md) | table | sim | 2 | 10 | não | Cargo evaluation whose total is always calculated by a trigger. |
| [public.pcs_fatores](tables/public/pcs_fatores.md) | table | sim | 2 | 9 | não | Server-validated weighted PCS factors and allowed scores. |
| [public.pcs_grades](tables/public/pcs_grades.md) | table | sim | 2 | 11 | não | Transactionally generated salary ranges for a PCS plan. |
| [public.pcs_pesquisa_salarial](tables/public/pcs_pesquisa_salarial.md) | table | sim | 2 | 14 | não | Tenant-scoped external salary benchmark observations. |
| [public.pcs_planos](tables/public/pcs_planos.md) | table | sim | 4 | 15 | não | PCS plans, versioned and tenant scoped. |
| [public.pdi_plano_desenvolvimento](tables/public/pdi_plano_desenvolvimento.md) | table | sim | 1 | 11 | não |  |
| [public.pdis](tables/public/pdis.md) | table | sim | 4 | 12 | não |  |
| [public.pendencias](tables/public/pendencias.md) | table | sim | 2 | 11 | não |  |
| [public.pensoes](tables/public/pensoes.md) | table | sim | 1 | 12 | não |  |
| [public.periodos_aquisitivos](tables/public/periodos_aquisitivos.md) | table | sim | 1 | 15 | não |  |
| [public.periodos_experiencia](tables/public/periodos_experiencia.md) | table | sim | 1 | 11 | não |  |
| [public.periodos_ponto](tables/public/periodos_ponto.md) | table | sim | 4 | 8 | não |  |
| [public.permissao_perfis](tables/public/permissao_perfis.md) | table | sim | 1 | 7 | não |  |
| [public.permissao_recursos](tables/public/permissao_recursos.md) | table | sim | 1 | 6 | não |  |
| [public.permissions](tables/public/permissions.md) | table | sim | 2 | 6 | não |  |
| [public.personnel_budget](tables/public/personnel_budget.md) | table | sim | 2 | 9 | não |  |
| [public.pesquisas](tables/public/pesquisas.md) | table | sim | 1 | 12 | não |  |
| [public.pesquisas_perguntas](tables/public/pesquisas_perguntas.md) | table | sim | 4 | 8 | não |  |
| [public.pesquisas_respostas](tables/public/pesquisas_respostas.md) | table | sim | 4 | 7 | não |  |
| [public.pii_access_alerts](tables/public/pii_access_alerts.md) | table | sim | 0 | 8 | não |  |
| [public.pii_access_logs](tables/public/pii_access_logs.md) | table | sim | 1 | 10 | não | LGPD art. 37 — registro imutável e server-authoritative de leituras de PII. |
| [public.pix_itens](tables/public/pix_itens.md) | table | sim | 2 | 11 | não |  |
| [public.pix_lotes](tables/public/pix_lotes.md) | table | sim | 2 | 10 | não |  |
| [public.plano_contas](tables/public/plano_contas.md) | table | sim | 1 | 8 | não |  |
| [public.planos_saude](tables/public/planos_saude.md) | table | sim | 1 | 16 | não |  |
| [public.ponto_ajustes](tables/public/ponto_ajustes.md) | table | sim | 2 | 17 | não |  |
| [public.ponto_auditoria](tables/public/ponto_auditoria.md) | table | sim | 1 | 11 | não |  |
| [public.ponto_auditoria_fraude](tables/public/ponto_auditoria_fraude.md) | table | sim | 1 | 6 | não |  |
| [public.ponto_espelhos_assinados](tables/public/ponto_espelhos_assinados.md) | table | sim | 1 | 23 | não |  |
| [public.ponto_espelhos_revogacoes](tables/public/ponto_espelhos_revogacoes.md) | table | sim | 2 | 7 | não |  |
| [public.ponto_regras_aprovacao](tables/public/ponto_regras_aprovacao.md) | table | sim | 1 | 9 | não |  |
| [public.ponto_seguranca_blacklist](tables/public/ponto_seguranca_blacklist.md) | table | sim | 1 | 6 | não |  |
| [public.portal_notificacoes_settings](tables/public/portal_notificacoes_settings.md) | table | sim | 1 | 7 | não |  |
| [public.premiacoes_alertas](tables/public/premiacoes_alertas.md) | table | sim | 1 | 7 | não |  |
| [public.premiacoes_auditoria](tables/public/premiacoes_auditoria.md) | table | sim | 1 | 9 | não |  |
| [public.premiacoes_campanhas](tables/public/premiacoes_campanhas.md) | table | sim | 2 | 13 | não |  |
| [public.premiacoes_cenarios_simulacao](tables/public/premiacoes_cenarios_simulacao.md) | table | sim | 1 | 6 | não |  |
| [public.premiacoes_pagamentos](tables/public/premiacoes_pagamentos.md) | table | sim | 3 | 19 | não |  |
| [public.premiacoes_regras](tables/public/premiacoes_regras.md) | table | sim | 3 | 8 | não |  |
| [public.premiacoes_roi_cenarios](tables/public/premiacoes_roi_cenarios.md) | table | sim | 1 | 7 | não |  |
| [public.profiles](tables/public/profiles.md) | table | sim | 4 | 18 | não |  |
| [public.promo_brindes](tables/public/promo_brindes.md) | table | sim | 4 | 8 | não |  |
| [public.promocoes](tables/public/promocoes.md) | table | sim | 1 | 9 | não |  |
| [public.prorrogacoes_afastamento](tables/public/prorrogacoes_afastamento.md) | table | sim | 2 | 10 | não |  |
| [public.provisao_auditoria](tables/public/provisao_auditoria.md) | table | sim | 1 | 8 | não |  |
| [public.provisao_logs](tables/public/provisao_logs.md) | table | sim | 2 | 12 | não |  |
| [public.provisoes_folha](tables/public/provisoes_folha.md) | table | sim | 1 | 9 | não |  |
| [public.provisoes_mensais](tables/public/provisoes_mensais.md) | table | sim | 8 | 12 | não |  |
| [public.push_subscriptions](tables/public/push_subscriptions.md) | table | sim | 2 | 7 | não |  |
| [public.query_telemetry](tables/public/query_telemetry.md) | table | sim | 3 | 15 | não |  |
| [public.rate_limit_config](tables/public/rate_limit_config.md) | table | sim | 1 | 8 | não |  |
| [public.rate_limit_logs](tables/public/rate_limit_logs.md) | table | sim | 2 | 8 | não |  |
| [public.rate_limits](tables/public/rate_limits.md) | table | sim | 1 | 4 | não |  |
| [public.recargas_vale](tables/public/recargas_vale.md) | table | sim | 1 | 9 | não |  |
| [public.recrutamento_agendamentos](tables/public/recrutamento_agendamentos.md) | table | sim | 1 | 12 | não |  |
| [public.recrutamento_anotacoes](tables/public/recrutamento_anotacoes.md) | table | sim | 1 | 7 | não |  |
| [public.recrutamento_entrevistas](tables/public/recrutamento_entrevistas.md) | table | sim | 1 | 12 | não |  |
| [public.recrutamento_testes](tables/public/recrutamento_testes.md) | table | sim | 1 | 12 | não |  |
| [public.registros_ponto](tables/public/registros_ponto.md) | table | sim | 2 | 47 | não |  |
| [public.relacionamentos_contato_emergencia](tables/public/relacionamentos_contato_emergencia.md) | table | sim | 1 | 3 | não |  |
| [public.relacionamentos_dependentes](tables/public/relacionamentos_dependentes.md) | table | sim | 1 | 5 | não |  |
| [public.relatorios_agendados](tables/public/relatorios_agendados.md) | table | sim | 4 | 19 | não |  |
| [public.report_dispatch_attempts](tables/public/report_dispatch_attempts.md) | table | sim | 0 | 17 | não | Payload exato e recibo de envio de relatório agendado; impede alteração de parâmetros sob a mesma Idempotency-Key. |
| [public.role_permissions](tables/public/role_permissions.md) | table | sim | 2 | 5 | não |  |
| [public.rubricas_folha](tables/public/rubricas_folha.md) | table | sim | 7 | 14 | não |  |
| [public.saved_filters](tables/public/saved_filters.md) | table | sim | 1 | 8 | não |  |
| [public.sec_policy_regressions](tables/public/sec_policy_regressions.md) | table | sim | 1 | 7 | não |  |
| [public.sec_seal_events](tables/public/sec_seal_events.md) | table | sim | 1 | 7 | não |  |
| [public.security_alerts](tables/public/security_alerts.md) | table | sim | 3 | 10 | sim |  |
| [public.sefip_arquivos](tables/public/sefip_arquivos.md) | table | sim | 1 | 11 | não |  |
| [public.seguros_colaboradores](tables/public/seguros_colaboradores.md) | table | sim | 1 | 6 | não |  |
| [public.seguros_vida](tables/public/seguros_vida.md) | table | sim | 1 | 14 | não |  |
| [public.simulacoes_fiscais](tables/public/simulacoes_fiscais.md) | table | sim | 1 | 8 | não |  |
| [public.sindicatos](tables/public/sindicatos.md) | table | sim | 4 | 8 | não |  |
| [public.sinistros_seguro](tables/public/sinistros_seguro.md) | table | sim | 1 | 8 | não |  |
| [public.solicitacoes_ajuste_ponto](tables/public/solicitacoes_ajuste_ponto.md) | table | sim | 10 | 17 | não |  |
| [public.solicitacoes_hora_extra](tables/public/solicitacoes_hora_extra.md) | table | sim | 1 | 13 | não |  |
| [public.sst_cat](tables/public/sst_cat.md) | table | sim | 3 | 39 | não |  |
| [public.sst_cat_anexos](tables/public/sst_cat_anexos.md) | table | sim | 1 | 8 | não |  |
| [public.sst_cat_testemunhas](tables/public/sst_cat_testemunhas.md) | table | sim | 1 | 8 | não |  |
| [public.sst_exposicao_riscos](tables/public/sst_exposicao_riscos.md) | table | sim | 1 | 11 | não |  |
| [public.sst_extintores](tables/public/sst_extintores.md) | table | sim | 1 | 23 | não |  |
| [public.sst_extintores_inspecoes](tables/public/sst_extintores_inspecoes.md) | table | sim | 1 | 20 | não |  |
| [public.sst_incidentes](tables/public/sst_incidentes.md) | table | sim | 1 | 13 | não |  |
| [public.sst_ltcat_laudos](tables/public/sst_ltcat_laudos.md) | table | sim | 2 | 21 | não |  |
| [public.sst_ordens_servico](tables/public/sst_ordens_servico.md) | table | sim | 2 | 23 | não |  |
| [public.sst_programas](tables/public/sst_programas.md) | table | sim | 1 | 16 | não |  |
| [public.sst_regimento_assinaturas](tables/public/sst_regimento_assinaturas.md) | table | sim | 2 | 10 | não |  |
| [public.sst_regimento_documentos](tables/public/sst_regimento_documentos.md) | table | sim | 2 | 13 | não |  |
| [public.sst_regimento_interno](tables/public/sst_regimento_interno.md) | table | sim | 1 | 7 | não |  |
| [public.sst_riscos_ambientais](tables/public/sst_riscos_ambientais.md) | table | sim | 1 | 9 | não |  |
| [public.tarefas_onboarding](tables/public/tarefas_onboarding.md) | table | sim | 1 | 9 | não |  |
| [public.taxas_cambio](tables/public/taxas_cambio.md) | table | sim | 1 | 6 | não |  |
| [public.tempos_residencia](tables/public/tempos_residencia.md) | table | sim | 1 | 3 | não |  |
| [public.times](tables/public/times.md) | table | sim | 5 | 9 | não |  |
| [public.times_brindes](tables/public/times_brindes.md) | table | sim | 4 | 5 | não |  |
| [public.tipos_admissao](tables/public/tipos_admissao.md) | table | sim | 1 | 4 | não |  |
| [public.tipos_aviso_previo](tables/public/tipos_aviso_previo.md) | table | sim | 1 | 3 | não |  |
| [public.tipos_beneficio](tables/public/tipos_beneficio.md) | table | sim | 4 | 10 | não |  |
| [public.tipos_deficiencia](tables/public/tipos_deficiencia.md) | table | sim | 1 | 3 | não |  |
| [public.tipos_desligamento](tables/public/tipos_desligamento.md) | table | sim | 1 | 4 | não |  |
| [public.tipos_estabilidade](tables/public/tipos_estabilidade.md) | table | sim | 1 | 5 | não |  |
| [public.tipos_pagamento](tables/public/tipos_pagamento.md) | table | sim | 1 | 3 | não |  |
| [public.tipos_salario](tables/public/tipos_salario.md) | table | sim | 1 | 4 | não |  |
| [public.tipos_visto](tables/public/tipos_visto.md) | table | sim | 1 | 3 | não |  |
| [public.training_image_requests](tables/public/training_image_requests.md) | table | sim | 0 | 12 | não | Fila persistente de geração automática. Uma linha por conteúdo; reivindicada com FOR UPDATE SKIP LOCKED pelo worker. |
| [public.training_image_settings](tables/public/training_image_settings.md) | table | sim | 0 | 3 | não | Flags de servidor da integração de imagens. autoqueue_enabled=false por padrão: nenhum cadastro enfileira geração. |
| [public.training_images](tables/public/training_images.md) | table | sim | 1 | 25 | não | Capa de um conteúdo de treinamento. Uma linha por conteúdo; storage_path aponta para o bucket privado training-images. |
| [public.transferencias](tables/public/transferencias.md) | table | sim | 1 | 7 | não |  |
| [public.treinamento_certificados](tables/public/treinamento_certificados.md) | table | sim | 2 | 10 | não |  |
| [public.treinamento_feedback](tables/public/treinamento_feedback.md) | table | sim | 1 | 6 | não |  |
| [public.treinamento_feedbacks](tables/public/treinamento_feedbacks.md) | table | sim | 1 | 7 | não |  |
| [public.treinamento_instancias](tables/public/treinamento_instancias.md) | table | sim | 1 | 11 | não |  |
| [public.treinamento_participantes](tables/public/treinamento_participantes.md) | table | sim | 1 | 5 | não |  |
| [public.treinamentos](tables/public/treinamentos.md) | table | sim | 1 | 7 | não |  |
| [public.triagem_notas](tables/public/triagem_notas.md) | table | sim | 1 | 6 | não |  |
| [public.trilha_auditoria_ponto](tables/public/trilha_auditoria_ponto.md) | table | sim | 1 | 10 | não |  |
| [public.trilhas_aprendizado](tables/public/trilhas_aprendizado.md) | table | sim | 5 | 8 | não |  |
| [public.trilhas_cursos](tables/public/trilhas_cursos.md) | table | sim | 3 | 5 | não |  |
| [public.turnos](tables/public/turnos.md) | table | sim | 1 | 10 | não |  |
| [public.user_empresas](tables/public/user_empresas.md) | table | sim | 2 | 5 | não |  |
| [public.user_mfa](tables/public/user_mfa.md) | table | sim | 1 | 11 | não |  |
| [public.user_roles](tables/public/user_roles.md) | table | sim | 5 | 5 | não |  |
| [public.user_sessions](tables/public/user_sessions.md) | table | sim | 2 | 11 | não |  |
| [public.vaga_entrevistas](tables/public/vaga_entrevistas.md) | table | sim | 1 | 8 | não |  |
| [public.vaga_etapas](tables/public/vaga_etapas.md) | table | sim | 1 | 7 | não |  |
| [public.vagas](tables/public/vagas.md) | table | sim | 2 | 19 | não |  |
| [public.vales_alimentacao](tables/public/vales_alimentacao.md) | table | sim | 1 | 12 | não |  |
| [public.vales_transporte](tables/public/vales_transporte.md) | table | sim | 1 | 11 | não |  |
| [public.valores_campos_customizados](tables/public/valores_campos_customizados.md) | table | sim | 1 | 6 | não |  |
| [public.verbas_rescisorias](tables/public/verbas_rescisorias.md) | table | sim | 1 | 11 | não |  |
| [public.verification_tokens](tables/public/verification_tokens.md) | table | sim | 1 | 7 | não |  |
| [public.versao_banco](tables/public/versao_banco.md) | table | sim | 2 | 4 | não |  |
| [public.vinculos](tables/public/vinculos.md) | table | sim | 1 | 9 | não |  |
| [public.webauthn_challenges](tables/public/webauthn_challenges.md) | table | sim | 1 | 6 | não |  |
| [public.webauthn_credentials](tables/public/webauthn_credentials.md) | table | sim | 4 | 10 | não |  |
| [public.webhook_logs](tables/public/webhook_logs.md) | table | sim | 1 | 14 | não |  |
| [public.webhooks](tables/public/webhooks.md) | table | sim | 1 | 17 | não |  |
| [public.webhooks_config](tables/public/webhooks_config.md) | table | sim | 1 | 10 | não |  |
| [public.webhooks_logs](tables/public/webhooks_logs.md) | table | sim | 1 | 7 | não |  |
| [public.whatsapp_config](tables/public/whatsapp_config.md) | table | sim | 1 | 11 | não |  |
| [public.whatsapp_mensagens_logs](tables/public/whatsapp_mensagens_logs.md) | table | sim | 1 | 10 | não |  |
| [public.whatsapp_templates](tables/public/whatsapp_templates.md) | table | sim | 1 | 7 | não |  |
| [public.workflows_config](tables/public/workflows_config.md) | table | sim | 2 | 8 | não |  |
| [public.workflows_definicoes](tables/public/workflows_definicoes.md) | table | sim | 1 | 9 | não |  |
| [public.workflows_etapas](tables/public/workflows_etapas.md) | table | sim | 4 | 9 | não |  |
| [public.workflows_execucoes](tables/public/workflows_execucoes.md) | table | sim | 1 | 16 | não |  |
| [public.workflows_historico](tables/public/workflows_historico.md) | table | sim | 4 | 7 | não |  |
