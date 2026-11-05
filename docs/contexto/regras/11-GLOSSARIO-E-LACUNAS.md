# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `d43244e1ed` · branch `main` · 2026-11-05 01:01 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `_test_ctx` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | migration |
| `adiantamentos_salariais` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `adicionais` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `admissao_tokens` | [P0-004] Acesso anon corrigido — portador só vê seu próprio token via header. | 16 colunas | migration |
| `admissoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 31 colunas | migration |
| `aej_geracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `afastamentos` | [P0-001] RLS tenant-scoped via JOIN colaboradores. | 32 colunas | migration |
| `afd_geracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `afdt_divergencias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `afdt_importacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `afdt_registros_raw` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `ajustes_ponto` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `anotacoes_colaborador` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `asos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 29 colunas | migration |
| `atrasos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `audit_log` | DEPRECATED — migrado para audit_log_unified na Etapa 8. Manter para observação; remover após janela de 90 dias. | 13 colunas | migration |
| `audit_log_unified` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `audit_log_unified_archive` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `audit_logs` | DEPRECATED — migrado para audit_log_unified na Etapa 8. | 12 colunas | migration |
| `auditoria` | [P0-005] Append-only. INSERT direto bloqueado; usar public.registrar_auditoria(). | 12 colunas | migration |
| `auditoria_acesso_bancario` | LGPD/ISO 27001: auditoria de todo acesso a dados bancários descriptografados. | 8 colunas | migration |
| `auditoria_contratual` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `auditoria_logs` | DEPRECATED — migrado para audit_log_unified na Etapa 8. | 12 colunas | migration |
| `auth._test_uid` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `auth.audit_log_entries` | Auth: Audit trail for user actions. | 5 colunas | migration |
| `auth.custom_oauth_providers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 25 colunas | migration |
| `auth.flow_state` | Stores metadata for all OAuth/SSO login flows | 17 colunas | migration |
| `auth.identities` | Auth: Stores identities associated to a user. | 9 colunas | migration |
| `auth.instances` | Auth: Manages users across multiple sites. | 5 colunas | migration |
| `auth.mfa_amr_claims` | auth: stores authenticator method reference claims for multi factor authentication | 5 colunas | migration |
| `auth.mfa_challenges` | auth: stores metadata about challenge requests made | 7 colunas | migration |
| `auth.mfa_factors` | auth: stores metadata about factors | 13 colunas | migration |
| `auth.oauth_authorizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `auth.oauth_client_states` | Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client. | 4 colunas | migration |
| `auth.oauth_clients` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `auth.oauth_consents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `auth.one_time_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `auth.refresh_tokens` | Auth: Store of tokens used to refresh JWT tokens once they expire. | 9 colunas | migration |
| `auth.saml_providers` | Auth: Manages SAML Identity Provider connections. | 9 colunas | migration |
| `auth.saml_relay_states` | Auth: Contains SAML Relay State information for each Service Provider initiated login. | 8 colunas | migration |
| `auth.schema_migrations` | Auth: Manages updates to the auth system. | 1 colunas | migration |
| `auth.sessions` | Auth: Stores session data associated to a user. | 15 colunas | migration |
| `auth.sso_domains` | Auth: Manages SSO email address domain mapping to an SSO Identity Provider. | 5 colunas | migration |
| `auth.sso_providers` | Auth: Manages SSO identity provider information; see saml_providers for SAML. | 5 colunas | migration |
| `auth.users` | Auth: Stores user login data within a secure schema. | 35 colunas | migration |
| `auth.webauthn_challenges` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `auth.webauthn_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `auth_gov_br_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `automacao_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `avaliacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `backup_logs` | [P1-024] Policy default adicionada (tenant-scoped). | 13 colunas | migration |
| `banco_horas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `banco_horas_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `batidas_ponto` | _(sem COMMENT ON TABLE — significado não documentado)_ | 38 colunas | migration |
| `beneficiarios_plano` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `beneficiarios_seguro` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `beneficio_arquivos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `beneficio_movimentacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `beneficio_regras_elegibilidade` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `beneficio_utilizacao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `beneficios` | [P0-001] RLS tenant-scoped via JOIN colaboradores. | 25 colunas | migration |
| `beneficios_colaborador` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `beneficios_colaboradores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `beneficios_elegibilidade` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `beneficios_movimentacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `bitrix24_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `bitrix24_sync_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `blocked_ips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `cache_tabelas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `campos_customizados` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `canal_etica` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `candidatos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `candidaturas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `cargo_faixas_salariais` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `cargos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `cas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `catalogo_cursos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `catalogo_infracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `categorias_trabalhador` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `cbo` | Catálogo CBO (Classificação Brasileira de Ocupações). Carga via importação de domínio. | 3 colunas | migration |
| `centros_custo` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `certificados_digitais` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `ciclos_avaliacao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `cid10` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `ciencia_rate_limits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `clinicas_partners` | _(sem COMMENT ON TABLE — significado não documentado)_ | 28 colunas | migration |
| `clinicas_partners_horarios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `clinicas_partners_servicos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `cnab_configuracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `cnab_itens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `cnab_remessas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `cnab_sequencias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `cnae` | Catálogo CNAE. Carga via importação de domínio. | 3 colunas | migration |
| `colaborador_beneficios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `colaboradores` | [P0-001] RLS tenant-scoped via get_auth_empresa_id(). | 148 colunas | migration |
| `colaboradores_historico` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `colaboradores_pin` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `comissoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `competencias_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `competencias_matriz` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `comunicados` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `comunicados_leituras` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `condicoes_ingresso` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `config_afastamentos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `config_alertas_indicadores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `config_retencao` | P3-065: Política de retenção por tabela. legal_hold=true bloqueia purge. | 8 colunas | migration |
| `configuracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `configuracoes_alertas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `configuracoes_esocial` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `configuracoes_intervalo` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `configuracoes_ponto` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `conformidade_ponto_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `contabilidade_contatos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `contabilidade_mensagens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `contabilidade_threads` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `contas_bancarias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `contatos_emergencia` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `contrato_assinatura_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `contrato_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `contrato_token_eventos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `contratos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `contratos_gerados` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `controle_acesso` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `convenios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `convenios_colaboradores` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `curriculos_arquivos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `dados_estagiario` | _(sem COMMENT ON TABLE — significado não documentado)_ | 27 colunas | migration |
| `dados_estrangeiro` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `darfs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `dctfweb_declaracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `deficiencias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `departamentos` | [P0-001] RLS tenant-scoped. Departamento só visível dentro da empresa. | 10 colunas | migration |
| `dependentes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `dependentes_beneficios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `descricoes_logradouro` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `desligamentos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 48 colunas | migration |
| `despesas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `despesas_aprovacoes_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `documento_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `documentos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `documentos_admissao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `documentos_afastamento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `documentos_assinatura` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `documentos_assinaturas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `documentos_colaborador` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `documentos_historico` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `documentos_pessoais_arquivos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `documentos_versoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `dp_audit_config` | Registro de politicas de auditoria por tabela para LGPD Art. 37 e 39. PROCEDIMENTO DE ATIVACAO pgaudit:   1. Acessar Supabase Dashboard > Database > Extensions   2. Habilitar pgaudit   3. Executar: ALTER DATABASE postgres SET pgaudit.log = 'write';   4. Executar: ALTER DATABASE postgres SET pgaudit.log_relation = 'on';   5. Para cada tabela em dp_audit_config WHERE enabled=true E audit_writes=true:      SECURITY LABEL FOR pgaudit ON TABLE public.<tabela> IS 'OBJECT';   ATENCAO: pgaudit.log = 'all' enche o disco em horas. Usar SOMENTE 'write'. | 9 colunas | migration |
| `dp_audit_log` | Audit log Departamento Pessoal — IMUTÁVEL (sem UPDATE/DELETE de roles de aplicação). Particionado por mês para performance e retenção. LGPD Art.37: registro de operações de tratamento de dados. Conteúdo: metadata de eventos — NÃO armazena PII raw no payload. | 10 colunas | migration |
| `dp_audit_log_2026_07` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_audit_log_2026_08` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_audit_log_2026_09` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_audit_log_2026_10` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_audit_log_2026_11` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_audit_log_2026_12` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_audit_log_default` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `dp_backup_runbook` | Runbook de backup/restore E migracao de secrets. Ver steps 10-14 para Item 7. STATUS Item 7: Chave PII migrada para Vault (vault.secrets.dp_pii_master_key). PENDENTE: DATABASE_URL e SERVICE_ROLE_KEY ainda em plaintext no compose da stack 182. Migracao para Docker Secrets requer modificacao do MCP para ler _FILE suffix. | 7 colunas | migration |
| `dp_data_catalog` | Inventário de dados pessoais (Data Map) — LGPD Art. 37. Obrigatório manter atualizado. Auditado pelo Encarregado (DPO). | 13 colunas | migration |
| `dp_environments` | Definicao de ambientes e suas politicas de RTO/RPO. REGRA: apenas production tem is_production=true. CI so pode apontar para ci_allowed=true. | 10 colunas | migration |
| `dp_mcp_config` | Configuracao e versoes do MCP e schema. Usar como fonte de verdade para CI/CD. Item 13: antes de cada deploy, verificar: SELECT config_val FROM dp_mcp_config WHERE config_key='schema_version' | 5 colunas | migration |
| `dp_retention_policy` | Politicas retencao LGPD. dry_run+disabled por padrao — ativar somente apos validar. | 12 colunas | migration |
| `dp_user_roles` | Atribuicao de roles a usuarios. Gerenciado pelo role rh ou admin. Integracao: JWT claims devem incluir role via custom claim (Supabase Auth hook). Exemplo de hook SQL: SELECT role FROM dp_user_roles WHERE user_id = uid AND active = true LIMIT 1. | 8 colunas | migration |
| `empresas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 26 colunas | migration |
| `emprestimos_consignados` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `entity_versions` | Histórico de versões de registros para auditoria e recuperação | 8 colunas | migration |
| `epis` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `epis_entregas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `epis_fichas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `epis_fichas_assinaturas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `epis_fichas_itens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `escalas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `escalas_trabalho` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `esocial_eventos` | [P0-001] RLS tenant-scoped. Eventos eSocial sensíveis (LGPD). | 22 colunas | migration |
| `esocial_lotes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `esocial_retornos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `esocial_transmissao_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `etnias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `eventos_rh` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `eventos_variaveis` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `exames` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `exames_agendamentos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `exames_medicos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `faixas_inss` | Faixas da tabela INSS. Carga via importação de domínio. | 4 colunas | migration |
| `faixas_irrf` | Faixas da tabela IRRF. Carga via importação de domínio. | 4 colunas | migration |
| `faltas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 26 colunas | migration |
| `feedbacks_360` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `feriados` | [P0-001] Feriados globais (empresa_id IS NULL) visíveis a todos; tenant-scoped editável. | 8 colunas | migration |
| `feriados_brasileiros` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `ferias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 68 colunas | migration |
| `ferias_abono` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `ferias_aprovacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `ferias_aprovacoes_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `ferias_arquivos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `ferias_audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `ferias_coletivas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `ferias_programacao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 22 colunas | migration |
| `ferias_reconciliacao_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `ferias_solicitacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `fgts_digital_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `fila_notificacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `fila_processamento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `folha_assinaturas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `folha_auditoria` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `folha_calculos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `folha_competencias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `folha_eventos_auditoria` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `folha_itens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `folha_lock_conflicts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `folha_pagamento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `folha_rubricas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `folhas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `folhas_pagamento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 26 colunas | migration |
| `formacoes_academicas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `generos_documento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `geo_allowed_countries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `geo_blocked_attempts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `geo_blocking_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `govbr_auth_state` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `gratificacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `grrf` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `guias_fgts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `guias_fgts_digital` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `guias_inss` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `health_checks` | Registro opcional de execuções de healthcheck (healthcheck/metrics). | 4 colunas | migration |
| `historico_alertas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `historico_calculos_folha` | [P0-010] Histórico fiscal imutável (UPDATE bloqueado). DELETE só admin. | 6 colunas | migration |
| `historico_cargo` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `historico_contratos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `historico_ferias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `historico_rescisoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `historico_salarial` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `holerite_distribuicoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `holerites` | [P0-001] RLS tenant-scoped. Acesso direto só authenticated da empresa. | 29 colunas | migration |
| `homologacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `homologacoes_rescisao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `ia_provisoes_alertas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `idempotency_keys` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `identidades_genero` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `inscricoes_cursos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `integracao_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `integracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `ip_whitelist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `itens_folha` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `jornadas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `jornadas_horarios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `lancamentos_contabeis` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `lancamentos_folha` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `lgpd_consentimentos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `lgpd_fila_limpeza` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `lgpd_politicas_retencao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `lgpd_purge_log` | P3-065: Log de execução do purge LGPD. Retido por 60 dias. | 8 colunas | migration |
| `lgpd_retencao_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `lgpd_solicitacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `linhas_transporte` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `locais_trabalho` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `log_envio_relatorios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `login_attempts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `login_lockouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `login_rate_limits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `logs_integracoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `logs_sincronizacao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `logs_sistema` | [P0-004] Logs imutáveis. Insert só authenticated com tenant; select só admin. | 9 colunas | migration |
| `lotacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `medidas_ciencia_tokens` | Internal token state. Public acknowledgement is available only through hash-validating RPCs. | 15 colunas | migration |
| `medidas_disciplinares` | _(sem COMMENT ON TABLE — significado não documentado)_ | 58 colunas | migration |
| `medidas_disciplinares_anexos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `medidas_disciplinares_contestacao_anexos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `medidas_disciplinares_integracao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `medidas_disciplinares_workflow_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `metas_okrs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `metricas_processamento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `migration_naming_audit` | [P1-023] Auditoria do padrão de naming YYYYMMDDHHMMSS_description. | 4 colunas | migration |
| `motivos_afastamento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `mv_refresh_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `nacionalidades` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `notificacoes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `notificacoes_admissao` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `notificacoes_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `onboarding_colaborador` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `onboarding_documentos_obrigatorios` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `onboarding_kits` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `onboarding_tarefas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `onboarding_template_tarefas` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `onboarding_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `paises` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `parametros_fiscais` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `parametros_sistema` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `password_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `password_policies` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `password_reset_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `password_reset_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `pcs_avaliacoes_cargo` | Cargo evaluation whose total is always calculated by a trigger. | 10 colunas | migration |
| `pcs_fatores` | Server-validated weighted PCS factors and allowed scores. | 9 colunas | migration |
| `pcs_grades` | Transactionally generated salary ranges for a PCS plan. | 11 colunas | migration |
| `pcs_pesquisa_salarial` | Tenant-scoped external salary benchmark observations. | 14 colunas | migration |
| `pcs_planos` | PCS plans, versioned and tenant scoped. | 15 colunas | migration |
| `pdi_plano_desenvolvimento` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `pdis` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `pendencias` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| … +246 linhas — lista completa em `context.json` | | | |

## Dados de referência (seed — planos, categorias, perfis fixos)

| Tabela | Colunas | Valores | Origem |
|---|---|---|---|
| `workflows_definicoes` | `id,nome,descricao,tipo,ativo,empresa_id` | `(wf,'Workflow Padrao Admissao', 'Workflow automatico para novas admissoes','admissao',true,emp)` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_templates` | `id,nome,descricao,empresa_id,ativo` | `(ot01,'Onboarding Analista/Assistente', 'Modelo padrao para posicoes de nivel medio. Duracao: 30 dias.',emp,true), (ot02,'Onboarding Administrativo', 'Checklist para funcoes de apoio administrativo. Duracao: 15 dias.',emp,true), (ot03,'Onboarding Financeiro/Contabil', 'Rotina especifica com enfase em compliance. Duracao: 30 dias.',emp,true), (ot04,'Onboarding Tecnologia (TI)', 'Provisionamento de …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_template_tarefas` | `id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria` | `(tt01_1,ot01,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,1,'rh',true), (tt01_2,ot01,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,1,'rh',true), (tt01_3,ot01,'Exame medico admissional','ASO — Atestado de Saude Ocupacional','saude',3,3,'rh',true), (tt01_4,ot01,'Cadastro no sistema de folha','Acesso ao portal RH e d …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_template_tarefas` | `id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria` | `(tt02_1,ot02,'Entrega de documentos pessoais','CPF, RG, comprovante de residencia','documentos',1,1,'rh',true), (tt02_2,ot02,'Assinatura do contrato de trabalho','2 vias assinadas','documentos',2,1,'rh',true), (tt02_3,ot02,'Exame medico admissional','ASO emitido','saude',3,3,'rh',true), (tt02_4,ot02,'Cadastro no sistema de ponto','Registro de batidas e horario','sistemas',4,2,'rh',true)` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_template_tarefas` | `id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria` | `(tt03_1,ot03,'Entrega de documentos pessoais','CPF, RG, titulo de eleitor','documentos',1,1,'rh',true), (tt03_2,ot03,'Assinatura do contrato e NDA','NDA de informacoes financeiras','documentos',2,1,'juridico',true), (tt03_3,ot03,'Exame medico admissional','ASO especifico','saude',3,3,'rh',true), (tt03_4,ot03,'Acesso aos sistemas financeiros','ERP, contabilidade, bancos','sistemas',4,5,'ti',true), …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_template_tarefas` | `id,template_id,titulo,descricao,categoria,ordem,dias_prazo,responsavel_tipo,obrigatoria` | `(tt04_1,ot04,'Entrega de equipamentos','Notebook, cracha, celular corporativo','documentos',1,1,'ti',true), (tt04_2,ot04,'Provisionamento de acessos','AD, GitHub, Jira, VPN','sistemas',2,2,'ti',true), (tt04_3,ot04,'Assinatura do contrato de trabalho','Termo de uso de ativos de TI','documentos',3,1,'rh',true), (tt04_4,ot04,'Exame medico admissional','ASO','saude',4,3,'rh',true), (tt04_5,ot04,'Trein …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_colaborador` | `id,colaborador_id,template_id,data_inicio,data_conclusao,status,progresso,empresa_id` | `(oc01,'11110000-0000-0000-0000-000000000001',ot01,'2025-01-06',NULL,'em_andamento',43,emp), (oc02,'11110000-0000-0000-0000-000000000002',ot01,'2025-01-06',NULL,'em_andamento',57,emp), (oc03,'11110000-0000-0000-0000-000000000003',ot01,'2025-01-13',NULL,'em_andamento',86,emp), (oc04,'11110000-0000-0000-0000-000000000008',ot04,'2025-01-13',NULL,'em_andamento',60,emp), (oc05,'11110000-0000-0000-0000-0 …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_tarefas` | `id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem, data_prazo,data_conclusao,concluida,empresa_id` | `(tp01,oc05,tt04_1,'Entrega de equipamentos','Notebook, cracha, celular','documentos',1,'2024-08-06','2024-08-06',true,emp), (tp02,oc05,tt04_2,'Provisionamento de acessos','AD, GitHub, Jira, VPN','sistemas',2,'2024-08-07','2024-08-07',true,emp), (tp03,oc05,tt04_3,'Assinatura do contrato de trabalho','Termo de uso de ativos de TI','documentos',3,'2024-08-07','2024-08-07',true,emp), (tp04,oc05,tt04_4 …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_tarefas` | `id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem, data_prazo,data_conclusao,concluida,empresa_id` | `(ta01,oc01,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2025-01-07','2025-01-07',true,emp), (ta02,oc01,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2025-01-07','2025-01-07',true,emp), (ta03,oc01,tt01_3,'Exame medico admissional','ASO','saude',3,'2025-01-10','2025-01-10',true,emp), (ta04,oc01,tt01_ …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_tarefas` | `id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem, data_prazo,data_conclusao,concluida,empresa_id` | `(gen_random_uuid(),oc02,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2025-01-07','2025-01-07',true,emp), (gen_random_uuid(),oc02,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2025-01-07','2025-01-07',true,emp), (gen_random_uuid(),oc02,tt01_3,'Exame medico admissional','ASO','saude',3,'2025-01-10',' …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_tarefas` | `id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem, data_prazo,data_conclusao,concluida,empresa_id` | `(gen_random_uuid(),oc03,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2025-01-14','2025-01-14',true,emp), (gen_random_uuid(),oc03,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2025-01-14','2025-01-14',true,emp), (gen_random_uuid(),oc03,tt01_3,'Exame medico admissional','ASO','saude',3,'2025-01-17',' …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_tarefas` | `id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem, data_prazo,data_conclusao,concluida,empresa_id` | `(gen_random_uuid(),oc04,tt04_1,'Entrega de equipamentos','Notebook, cracha, celular corporativo','documentos',1,'2025-01-14','2025-01-14',true,emp), (gen_random_uuid(),oc04,tt04_2,'Provisionamento de acessos','AD, GitHub, Jira, VPN','sistemas',2,'2025-01-15','2025-01-15',true,emp), (gen_random_uuid(),oc04,tt04_3,'Assinatura do contrato de trabalho','Termo de uso de ativos de TI','documentos',3,'20 …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `onboarding_tarefas` | `id,onboarding_id,template_tarefa_id,titulo,descricao,categoria,ordem, data_prazo,data_conclusao,concluida,empresa_id` | `(gen_random_uuid(),oc06,tt01_1,'Entrega de documentos pessoais','CPF, RG, CNH, comprovante de residencia','documentos',1,'2024-09-03','2024-09-03',true,emp), (gen_random_uuid(),oc06,tt01_2,'Assinatura do contrato de trabalho','Contrato assinado e protocolado','documentos',2,'2024-09-03','2024-09-03',true,emp), (gen_random_uuid(),oc06,tt01_3,'Exame medico admissional','ASO','saude',3,'2024-09-06',' …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `admissoes` | `id,nome,cargo,departamento,salario_proposto,data_prevista,etapa, cpf,email,telefone,estado_civil,data_nascimento, empresa_id,status_esocial,checklist_documentos_pessoais, checklist_comprovante_endereco,checklist_foto, checklist_ctps,checklist_exame_admissional, checklist_contrato_assinado,checklist_esocial_enviado, metadata` | `(a01,'Ana Silva Santos','Analista de Marketing','Marketing', 3800.00,'2025-01-06','contrato', '123.456.789-01','ana.silva@promobrindes.com.br','(11) 99000-0001','solteiro','1998-03-15', emp,'pendente',true,true,false,false,false,true,false, '{"placeholder":true}'::jsonb), (a02,'João Pedro Santos','Assistente Administrativo','Administrativo', 2100.00,'2025-01-06','assinatura', '123.456.789-02','joa …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `ciclos_avaliacao` | `id,empresa_id,nome,descricao,data_inicio,data_fim,status,tipo` | `(c01,emp,'Ciclo Anual 2025', 'Avaliacao de desempenho anual — metas e competencias', '2025-07-01','2025-12-31','concluido','anual'), (c02,emp,'Ciclo S1 2026', 'Avaliacao de desempenho do 1o semestre — metas e competencias', '2026-01-01','2026-06-30','ativo','semestral')` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `desligamentos` | `colaborador_id,tipo,data_desligamento,data_aviso,motivo,status, salario_base,saldo_salario,aviso_previo,ferias_vencidas, ferias_proporcionais,terco_constitucional,decimo_terceiro, multa_fgts,total_proventos,total_descontos,valor_liquido, checklist_comunicacao,checklist_documentacao,checklist_calculo_rescisao, checklist_homologacao,checklist_revogacao_acessos, checklist_devolucao_equipamentos,checklist_esocial, checklist_pagamento,empresa_id,etapa,quebra_contrato` | `('11110000-0000-0000-0000-000000000012', 'sem_justa_causa','2025-07-15','2025-06-25', 'Reestruturacao do setor — corte de vagas', 'finalizado', 2800.00,933.33,2800.00,0,1200.00,933.33,2800.00,2333.33, 10066.66,0,10066.66, true,true,true,true,true,true,true,true, emp,'concluido',false), ('11110000-0000-0000-0000-000000000010', 'pedido_demissao','2025-07-01',NULL, 'Oportunidade de carreira', 'em_and …` | `supabase/migrations/20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` |
| `bancos` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/bancos_seed.sql` |
| `cargos` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/cargos_seed.sql` |
| `cbos` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/cbos_seed.sql` |
| `cidades` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/cidades_seed.sql` |
| `cnaes` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/cnaes_seed.sql` |
| `departamentos` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/departamentos_seed.sql` |
| `feriados` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/feriados_seed.sql` |
| `rubricas` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/rubricas_seed.sql` |
| `sindicatos` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/sindicatos_seed.sql` |
| `tabelas_inss` | `id, created_at` | `(gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()), (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING` | `supabase/seeds/tabelas_inss_seed.sql` |

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `offline` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/HealthTrendCard.tsx`<br>`compara:src/hooks/useSystemHealthHistory.ts`<br>`escreve:src/hooks/useSystemHealthHistory.ts` |
| status | valor `online` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/HealthTrendCard.tsx`<br>`compara:src/components/layout/Header.tsx`<br>`compara:src/pages/AdminDiagnosticoMigracaoPage.tsx`<br>`escreve:src/hooks/useSystemHealthHistory.ts` |
| status | valor `slow` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/HealthTrendCard.tsx`<br>`compara:src/components/layout/Header.tsx`<br>`compara:src/pages/AdminDiagnosticoMigracaoPage.tsx`<br>`compara:supabase/functions/external-db-bridge/index.ts` |
| status | valor `recusado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/AnalyticsSection.tsx`<br>`compara:src/hooks/usePontoMelhorado.ts`<br>`escreve:src/components/dashboard/AnalyticsSection.tsx`<br>`escreve:src/components/dashboard/analytics/PendenciasDetailDialog.tsx` |
| status | valor `excellent` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/dashboard/WorkforceHealthScore.tsx` |
| status | valor `finalizado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/desligamentos/DesligamentoDetailSheet.tsx`<br>`compara:src/components/desligamentos/DesligamentoKPIs.tsx`<br>`compara:src/services/cnabService.ts`<br>`escreve:src/services/cnabService.ts` |
| status | valor `sent` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/folha/FolhaESocialSync.tsx`<br>`compara:supabase/functions/distribuir-holerites/index.ts`<br>`compara:supabase/functions/whatsapp-send/index.ts`<br>`escreve:supabase/functions/_shared/outboundDelivery.ts` |
| status | valor `healthy` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/settings/SystemHealthTab.tsx`<br>`escreve:src/components/settings/SystemHealthTab.tsx` |
| status | valor `em_investigacao` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/sst/SSTIncidentesTab.tsx` |
| status | valor `expirado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useAssinaturas.ts` |
| status | valor `valido` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useImportacaoColaboradores.ts`<br>`compara:src/pages/ImportacaoPage.tsx`<br>`escreve:src/utils/importacao/parser.ts` |
| status | valor `SUBSCRIBED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useRealTimeSubscription.ts` |
| status | valor `CHANNEL_ERROR` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useRealTimeSubscription.ts` |
| status | valor `all` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/ferias/useProgramacaoFerias.ts`<br>`compara:src/pages/ColaboradoresPage.tsx`<br>`compara:src/services/colaboradorService.ts`<br>`compara:src/services/feriasService.ts` |
| status | valor `Status` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/i18n/index.ts` |
| status | valor `Estado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/i18n/index.ts` |
| status | valor `idle` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| status | valor `running` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/AdminDiagnosticoMigracaoPage.tsx`<br>`escreve:src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| status | valor `fail` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/AdminDiagnosticoMigracaoPage.tsx`<br>`escreve:src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| status | valor `fulfilled` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/AdminPontoDivergenciasPage.tsx`<br>`compara:supabase/functions/_shared/ssrf-guard.ts`<br>`compara:supabase/functions/healthcheck/index.ts`<br>`compara:supabase/functions/metricas/index.ts` |
| status | valor `aguardando_inss` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/AfastamentosPage.tsx`<br>`compara:src/services/afastamentoService.ts`<br>`escreve:src/pages/AfastamentosPage.tsx` |
| status | valor `uploading` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ContratacaoPage.tsx`<br>`escreve:src/pages/ContratacaoPage.tsx` |
| status | valor `todos` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ContratosGeradosPage.tsx`<br>`compara:supabase/functions/relatorio/index.ts` |
| status | valor `descontada` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/FaltasPage.tsx` |
| status | valor `registrada` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/FaltasPage.tsx` |
| status | valor `duplicado` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ImportacaoPage.tsx` |
| status | valor `configurando` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/IntegracoesPage.tsx` |
| status | valor `gerada` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/ObrigacoesFiscaisPage.tsx`<br>`escreve:supabase/functions/dctfweb/index.ts`<br>`escreve:supabase/functions/fgts-digital/index.ts` |
| status | valor `excluido` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/PlanosSaudePage.tsx`<br>`escreve:src/services/tabelas/beneficiosService.ts`<br>`filtra:src/services/calculoBeneficiosService.ts` |
| status | valor `CONCLUIDO` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ProvisoesPage.tsx`<br>`escreve:supabase/functions/calcular-provisoes/index.ts`<br>`filtra:src/pages/ProvisoesPage.tsx` |
| status | valor `PROCESSANDO` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ProvisoesPage.tsx`<br>`escreve:supabase/functions/calcular-provisoes/index.ts` |
| status | valor `inscrito` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/pages/TreinamentosPage.tsx` |
| status | valor `completo` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/services/backupService.ts` |
| status | valor `aprovado_financeiro` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/services/premiacoesService.ts` |
| status | valor `sem_colaboradores` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/alertas-preditivos/index.ts` |
| status | valor `simulado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/enviar-esocial/index.ts` |
| status | valor `very_slow` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/external-db-bridge/index.ts` |
| status | valor `received` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/integracao/index.ts`<br>`escreve:supabase/functions/webhook/index.ts` |
| status | valor `aprovado_parcial` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/pix-lote/index.ts` |
| status | valor `falha` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| status | valor `sem_registro` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/processar-ponto/index.ts`<br>`escreve:supabase/functions/processar-ponto/index.ts` |
| status | valor `Ativo` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/sincronizar-bitrix/index.ts` |
| status | valor `active` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook/contract_test.ts` |
| status | valor `processed` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook/index.ts` |
| status | valor `processed_v1` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook/index.ts` |
| status | valor `processed_v2` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook/index.ts` |
| status | valor `todos` para `etapa` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/AdmissoesPage.tsx` |
| status | valor `finalizado` para `etapa` usado no código não existe em nenhum enum do banco/TS | `escreve:src/services/rescisaoService.ts` |
| status | valor `financeiro` para `etapa` usado no código não existe em nenhum enum do banco/TS | `compara:src/services/rescisaoService.ts` |
| status | valor `juridico` para `etapa` usado no código não existe em nenhum enum do banco/TS | `compara:src/services/rescisaoService.ts` |
| status | valor `expanded` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/ui/sidebar.tsx` |
| status | valor `collapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/sidebar.tsx` |
| status | valor `blocked` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/hooks/useNavigationGuard.tsx` |
| status | valor `already_sent` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/services/esocialService.ts` |
| status | valor `not_recorded` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/services/esocialService.ts` |
| status | valor `idle` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/migrations/20260726120000_p4_068_connection_pooling.sql` |
| status | valor `succeeded` para `last_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/AdminOperacaoPage.tsx` |
| status | valor `upload` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ImportacaoPage.tsx`<br>`escreve:supabase/functions/gerar-contrato-pdf/index.ts`<br>`escreve:supabase/functions/gerar-medida-disciplinar-pdf/index.ts` |
| status | valor `preview` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ImportacaoPage.tsx` |
| status | valor `importing` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ImportacaoPage.tsx` |
| status | valor `done` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/ImportacaoPage.tsx` |
| status | valor `pin` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/PontoKioskPage.tsx` |
| status | valor `segundo_fator` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/PontoKioskPage.tsx` |
| status | valor `action` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/PontoKioskPage.tsx` |
| status | valor `registrar_documento` para `step` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/admissao-publica/index.ts` |
| status | valor `cleanup_orphan` para `step` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/admissao-publica/index.ts` |
| status | valor `insert` para `step` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/gerar-contrato-pdf/index.ts`<br>`escreve:supabase/functions/upload-certificado/index.ts` |
| status | valor `encrypt_senha` para `step` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/upload-certificado/index.ts` |
| status | valor `encrypt_arquivo` para `step` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/upload-certificado/index.ts` |
| coluna | coluna `cei` usada no código não existe no schema de `empresas` |  |
| coluna | coluna `endereco` usada no código não existe no schema de `empresas` |  |
| coluna | coluna `nome` usada no código não existe no schema de `empresas` |  |
| coluna | coluna `cargo_id` usada no código não existe no schema de `colaboradores` |  |
| coluna | coluna `departamento_id` usada no código não existe no schema de `colaboradores` |  |
| coluna | coluna `idade` usada no código não existe no schema de `colaboradores` |  |
| coluna | coluna `metadata` usada no código não existe no schema de `colaboradores` |  |
| coluna | coluna `nome` usada no código não existe no schema de `colaboradores` |  |
| coluna | coluna `salario` usada no código não existe no schema de `colaboradores` |  |
| coluna | coluna `data_fim` usada no código não existe no schema de `afastamentos` |  |
| coluna | coluna `horas_falta` usada no código não existe no schema de `batidas_ponto` |  |
| coluna | coluna `data_hora` usada no código não existe no schema de `registros_ponto` |  |
| coluna | coluna `he_banco_horas` usada no código não existe no schema de `registros_ponto` |  |
| coluna | coluna `horas_extras_100` usada no código não existe no schema de `registros_ponto` |  |
| coluna | coluna `horas_extras_50` usada no código não existe no schema de `registros_ponto` |  |
| coluna | coluna `horas_noturnas` usada no código não existe no schema de `registros_ponto` |  |
| coluna | coluna `dispatch_claim_token` usada no código não existe no schema de `relatorios_agendados` |  |
| coluna | coluna `empresa_id` usada no código não existe no schema de `documentos` |  |
| coluna | coluna `empresa_id` usada no código não existe no schema de `query_telemetry` |  |
| coluna | coluna `empresa_id` usada no código não existe no schema de `pensoes` |  |
| coluna | coluna `arquivo_remessa` usada no código não existe no schema de `cnab_remessas` |  |
| coluna | coluna `folha_id` usada no código não existe no schema de `cnab_remessas` |  |
| coluna | coluna `ativo` usada no código não existe no schema de `integracoes` |  |
| coluna | coluna `empresa_id` usada no código não existe no schema de `integracoes` |  |
| coluna | coluna `empresa_id` usada no código não existe no schema de `metricas_processamento` |  |
| tabela | tabela `a` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `backups` usada no código não existe nas migrations/types do repo | `supabase/functions/backup-automatico/index.ts` |
| tabela | tabela `contacts` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `dashboard_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `emails` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `fantasma` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `fixture_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `ghost_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `mv_folha_summary` usada no código não existe nas migrations/types do repo | `supabase/functions/metricas/index.ts` |
| tabela | tabela `payments` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `runtime_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `so_teste` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs`<br>`src/integrations/supabase/__tests__/clientBridge.test.ts` |
| tabela | tabela `t1` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `tabela` usada no código não existe nas migrations/types do repo | `scripts/inventario/gerar-banco.mjs`<br>`scripts/inventario/gerar-repo.mjs` |
| tabela | tabela `tools_runtime` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `tx` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `x` usada no código não existe nas migrations/types do repo | `src/integrations/supabase/__tests__/clientBridge.test.ts`<br>`src/test/supabaseMock.ts` |
| rls | `config_afastamentos`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/services/tabelas/rhService.ts` |
| rls | `config_alertas_indicadores`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/InlineTabs.tsx` |
| rls | `configuracoes`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/ConfiguracoesGeraisTab.tsx` |
| rls | `lancamentos_contabeis`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/services/contabilidadeService.ts` |
| rls | `medidas_disciplinares_integracao`: RLS ligado sem nenhuma política → só service_role acessa | `src/services/medidasDisciplinaresService.ts` |
| rls | `pcs_avaliacoes_cargo`: RLS ligado sem nenhuma política → só service_role acessa | `src/services/pcsService.ts` |
| rls | `pcs_fatores`: RLS ligado sem nenhuma política → só service_role acessa | `src/services/pcsService.ts` |
| rls | `pcs_grades`: RLS ligado sem nenhuma política → só service_role acessa | `src/services/pcsService.ts` |
| rls | `ponto_auditoria`: RLS ligado sem nenhuma política → só service_role acessa | `src/services/pontoMonitorService.ts` |
| rls | `query_telemetry`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/pages/AdminTelemetriaPage.tsx` |
| rls | `report_dispatch_attempts`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `tarefas_onboarding`: RLS ligado sem nenhuma política → só service_role acessa | `src/components/admissoes/OnboardingPageContent.tsx`<br>`src/pages/OnboardingPage.tsx` |
| edge | edge function `dashboard-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `fixture-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `ghost-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `inexistente` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `minha-fn` invocada mas não existe em supabase/functions/ | `src/integrations/supabase/__tests__/clientFunctionsProxy.test.ts` |
| edge | edge function `orphan-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `other` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `runtime-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `runtime-missing` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `send-email` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `tools-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `complete_admission_esocial_event` chamada mas não definida nas migrations/types | `src/services/esocialService.ts` |
| rpc | RPC `dashboard_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `demo` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/test_snapshot.py` |
| rpc | RPC `drenar_fila_limpeza_lgpd` chamada mas não definida nas migrations/types | `supabase/functions/limpeza/index.ts` |
| rpc | RPC `exec_sql_readonly` chamada mas não definida nas migrations/types | `supabase/tests/migration_consistency.test.ts` |
| rpc | RPC `fail_admission_esocial_event` chamada mas não definida nas migrations/types | `src/services/esocialService.ts` |
| rpc | RPC `fechar_folha` chamada mas não definida nas migrations/types | `scripts/tests/inventario-rotas.test.mjs` |
| rpc | RPC `fixture_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `fn` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `foo` chamada mas não definida nas migrations/types | `eslint.config.js` |
| rpc | RPC `ghost_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `name` chamada mas não definida nas migrations/types | `scripts/audit-bridge-frontend-contract.mjs` |
| rpc | RPC `nome` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `r1` chamada mas não definida nas migrations/types | `scripts/ai-context/cenarios.mjs` |
| rpc | RPC `runtime_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `tools_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `x` chamada mas não definida nas migrations/types | `scripts/inventario/gerar-rotas.mjs` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/audit-bridge-frontend-contract.mjs` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/inventario/gerar-banco.mjs` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/regras_negocio/generate.py` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/components/portal/PortalDocumentosTab.tsx` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/integrations/supabase/client.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/pages/ObrigacoesFiscaisPage.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/services/backupService.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/services/baseService.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/services/tabelasReferenciaService.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/admissao-publica/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/backup/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/backup-automatico/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/cache/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/enviar-relatorio/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/external-db-bridge/index.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/gerar-guias/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/gerar-ltcat-os/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/importacao/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/tabelas-dominio/index.ts` |
| segurança | função `uid` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/tests/plano100/00_setup_stubs.sql` |
| segurança | função `_is_admin_bypass` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `_purge_audit_log_internal` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `_scan_status_anomalies_global` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `admin_list_security_definer_rpcs` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `admin_list_user_roles` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `admin_set_user_role` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `anonimizar_dados_pessoais` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `aplicar_medida_folha_ponto` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `aprovar_despesa` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `assinar_aviso_ferias` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `assinar_desligamento` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `assinar_espelho_ponto` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `associar_pis_colaborador_afdt` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `auto_vincular_admins_empresa` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `calcular_prazo_cat` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `check_brute_force` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `check_ciencia_rate_limit` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `check_idempotency_anomalies` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `check_processamento_timeout` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `check_rate_limit` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `cleanup_ciencia_rate_limits` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_consultar_por_token` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_estender_expiracao` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_gerar_token_assinatura` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_lembretes_pendentes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_montar_variaveis` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_preview_url_por_token` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_resolver_template` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_revogar_token` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_token_evento_registrar` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_verificar_autenticidade` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contrato_verificar_autenticidade_v2` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contratos_alertar_vencimentos` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `contratos_enviar_lembretes_assinatura` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `criar_batida_da_divergencia_afdt` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_audit_log_immutable` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_audit_log_prevent_future` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_catalog_pii` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_check_log_rotation` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_check_rls_index_coverage` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_connection_health` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_create_next_partition` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_decrypt_pii` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_encrypt_pii` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_has_role` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_hash_pii` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_missing_indexes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_post_migration_check` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_pre_deploy_gate` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_require_role` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_run_retention` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `dp_track_pii_access` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enfileirar_esocial_medida_disciplinar` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_afastamento_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_aso_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_batida_ponto_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_cat_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_cnab_remessa_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_desligamento_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_documento_assinatura_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_epi_entrega_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_esocial_evento_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_ferias_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_folha_pagamento_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_holerite_signed_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_log_retention` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `enforce_medida_disciplinar_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_alert_pii_access_anomaly` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_alert_severe_disciplinary_measure` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_audit_biometric_failure` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_auto_generate_training_certificate` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_consolidar_batidas` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_create_default_onboarding_tasks` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_enqueue_notification` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_link_gov_br_account` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_recalcular_dobra_e_alertas` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_update_admissao_checklist` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_update_candidatura_history` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_validar_medida_disciplinar_clt` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fn_workflow_admissao_auto` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `folha_conflict_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `fwd_to_audit_unified` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `gerar_alertas_preditivos_ia` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `gerar_qr_extintor` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `gerar_rubricas_ferias` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_admissao_por_token` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_audit_trail_by_entity` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_audit_trail_by_user` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_colaborador_banco_horas` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_cron_jobs_health` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_dlq_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_idempotency_health` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_query_telemetry` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_security_alerts_summary` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_user_default_empresa` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_user_empresas` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `get_user_scope_empresas` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `handle_new_user` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `handle_new_user_role` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `is_admin` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `is_country_allowed` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `is_ip_blocked` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `is_ip_whitelisted` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `limpar_govbr_states_expirados` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `listar_auditoria` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `log_audit_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `log_despesa_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `log_esocial_transmission` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `log_frontend_error` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `maintenance_archive_old_audit` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `maintenance_weekly_analyze` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_aprovar` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_arquivar` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_consultar_por_token` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_contestar` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_enviar_aprovacao` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_gerar_link_ciencia` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_registrar_ciencia_publica` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_rejeitar` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_responder_contestacao` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medida_verificar_ciencia_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `medidas_analytics_reincidencia` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `notificar_divergencias_afdt` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `notificar_ferias_pagamento_d5` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `notificar_ferias_reconciliacao_sla_baixo` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `pertence_a_empresa` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| segurança | função `process_audit_log` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/rebaseline/20260831_corrected_public.sql` |
| … +87 linhas — lista completa em `context.json` | | |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- Nenhuma regra manual em `manual/`: prazos, limites, exceções comerciais, quem aprova o quê — só o negócio sabe.
- `auth.oauth_authorizations.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `auth.users.email_change_confirm_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `medidas_disciplinares.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias.status_aprovacao_gestor` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias.status_aprovacao_rh` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias.status_aprovacao_contabilidade` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `batidas_ponto.biometria_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias_coletivas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admissoes.estado_civil` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `admissoes.status_esocial` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `automacao_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `beneficiarios_plano.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `beneficiarios_seguro.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `beneficios.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `beneficios_colaborador.status_vinculo` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `canal_etica.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `candidaturas.etapa` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `candidaturas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `candidaturas.data_proxima_etapa` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cnab_itens.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cnab_remessas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `colaboradores.bitrix_sync_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `colaboradores.timeman_ultimo_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `contratos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `dctfweb_declaracoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `despesas_aprovacoes_log.status_anterior` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `despesas_aprovacoes_log.status_novo` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `dp_backup_runbook.step_number` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `dp_backup_runbook.step_title` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `dp_backup_runbook.step_command` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `dp_backup_runbook.step_notes` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `escalas_trabalho.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `esocial_eventos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `esocial_lotes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `esocial_transmissao_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `feedbacks_360.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias_aprovacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias_aprovacoes_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ferias_solicitacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `fila_notificacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `fila_processamento.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `folha_assinaturas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `folha_itens.status_pagamento` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `folhas_pagamento.esocial_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `formacoes_academicas.situacao` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `govbr_auth_state.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `guias_fgts.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `guias_fgts_digital.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `guias_inss.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `historico_ferias.status_anterior` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `historico_ferias.status_novo` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `homologacoes_rescisao.etapa` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `homologacoes_rescisao.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `idempotency_keys.response_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `inscricoes_cursos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `integracoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `lancamentos_contabeis.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `lgpd_solicitacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `logs_integracoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `logs_sincronizacao.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `medidas_disciplinares_workflow_log.de_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `medidas_disciplinares_workflow_log.para_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `metas_okrs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `metricas_processamento.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `notificacoes_admissao.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `onboarding_colaborador.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `pendencias.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `periodos_experiencia.primeira_etapa_fim` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `periodos_experiencia.segunda_etapa_fim` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `periodos_experiencia.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `pix_itens.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `pix_lotes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ponto_ajustes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ponto_espelhos_assinados.status_assinatura` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `premiacoes_campanhas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `premiacoes_pagamentos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `provisao_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `recargas_vale.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `recrutamento_agendamentos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sefip_arquivos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `seguros_colaboradores.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sinistros_seguro.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `solicitacoes_hora_extra.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sst_cat.status_esocial` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sst_cat.situacao_geradora` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sst_exposicao_riscos.status_esocial` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sst_incidentes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `sst_programas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `vinculos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhook_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhooks.ultimo_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `webhooks_config.ultimo_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `whatsapp_config.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `whatsapp_mensagens_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `whatsapp_templates.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `workflows_execucoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `folha_pagamento.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `recibos_rescisao.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `darfs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `grrf.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `trct.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `homologacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `exames_medicos.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cas.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `avaliacoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `mv_refresh_log.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `health_checks.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `afd_geracoes.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 397/460 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `auth.custom_oauth_providers`, `auth.oauth_authorizations`, `auth.oauth_clients`, `auth.oauth_consents`, `auth.one_time_tokens`, `auth.webauthn_challenges`, `auth.webauthn_credentials`, `despesas`, `medidas_disciplinares`, `desligamentos`, `ferias`, `ferias_reconciliacao_logs` …
- Há tabelas usadas no código sem migration no repo — o schema real pode ter sido alterado pelo painel.

## Regras manuais presentes

_nenhuma — copie `manual/TEMPLATE-regras-de-negocio.md`_
