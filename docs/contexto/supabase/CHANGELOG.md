# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-19 01:14 UTC

- **functions** adicionado (1): `public.fn_consignado_valida_margem()`
- **lints** removido (1): `policy_auth_fn_not_wrapped:public.whatsapp_config.Empresas gerenciam seu próprio WhatsApp`
- **policies (RLS)** adicionado (1): `public.whatsapp_config.whatsapp_config_admin_rh`
- **policies (RLS)** removido (1): `public.whatsapp_config.Empresas gerenciam seu próprio WhatsApp`
- **tabelas** alterado (1): `public.ninebox_permissoes_homologacao`
- **triggers** adicionado (1): `public.emprestimos_consignados.trg_consignado_valida_margem`

## 2026-11-19 00:39 UTC

- **functions** alterado (3): `public.is_admin(_user_id uuid)`, `public.pode_gerir_rh(_empresa_id uuid)`, `public.pode_gerir_rh_para(_user_id uuid, _empresa_id uuid)`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`

## 2026-11-18 17:13 UTC

- **colunas** alterado (9): `public.asos.empresa_id`, `public.batidas_ponto.empresa_id`, `public.beneficios.empresa_id`, `public.colaboradores.empresa_id`, `public.contas_bancarias.empresa_id`, `public.desligamentos.empresa_id`, `public.despesas.empresa_id`, `public.ferias.empresa_id`, `public.folhas_pagamento.empresa_id`
- **functions** alterado (3): `public.aplicar_medida_folha_ponto(p_medida_id uuid)`, `public.dp_sync_empresa_from_colaborador()`, `public.trg_medida_aplicada_integrar()`
- **triggers** adicionado (1): `public.desligamentos.trg_sync_empresa_colaborador`

## 2026-11-18 16:15 UTC

- **colunas** alterado (2): `public.faltas.status`, `public.faltas.tipo`

## 2026-11-18 15:13 UTC

- **functions** alterado (1): `public.get_auth_empresa_id()`
- **lints** removido (5): `policy_auth_fn_not_wrapped:public.candidatos.Multi-tenant access`, `policy_auth_fn_not_wrapped:public.candidaturas.Multi-tenant access`, `policy_auth_fn_not_wrapped:public.onboarding_colaborador.Multi-tenant access`, `policy_auth_fn_not_wrapped:public.onboarding_tarefas.Multi-tenant access`, `policy_auth_fn_not_wrapped:public.vagas.Multi-tenant access`
- **policies (RLS)** removido (5): `public.candidatos.Multi-tenant access`, `public.candidaturas.Multi-tenant access`, `public.onboarding_colaborador.Multi-tenant access`, `public.onboarding_tarefas.Multi-tenant access`, `public.vagas.Multi-tenant access`

## 2026-11-18 10:14 UTC

- **colunas** adicionado (1): `public.govbr_auth_state.user_id`
- **constraints** adicionado (1): `public.govbr_auth_state.govbr_auth_state_user_id_fkey`
- **indexes** adicionado (1): `public.idx_govbr_auth_state_user_id`

## 2026-11-18 06:23 UTC

- **functions** alterado (3): `public.get_user_empresas(_user_id uuid)`, `public.is_admin(_user_id uuid)`, `public.user_empresa_id()`

## 2026-11-18 05:15 UTC

- **functions** alterado (1): `public.is_admin(_user_id uuid)`

## 2026-11-18 04:16 UTC

- **colunas** adicionado (7): `public.colaborador_lotacoes.colaborador_id`, `public.colaborador_lotacoes.created_at`, `public.colaborador_lotacoes.empresa_id`, `public.colaborador_lotacoes.id`, `public.colaborador_lotacoes.lotacao_id`, `public.colaborador_lotacoes.principal`, `public.colaborador_lotacoes.updated_at`
- **colunas** alterado (1): `public.lotacoes.colaborador_id`
- **constraints** adicionado (5): `public.colaborador_lotacoes.colaborador_lotacoes_colaborador_id_fkey`, `public.colaborador_lotacoes.colaborador_lotacoes_empresa_id_fkey`, `public.colaborador_lotacoes.colaborador_lotacoes_lotacao_id_fkey`, `public.colaborador_lotacoes.colaborador_lotacoes_pkey`, `public.colaborador_lotacoes.colaborador_lotacoes_vinculo_unico`
- **functions** adicionado (1): `public.colaborador_lotacoes_valida_tenant()`
- **functions** alterado (2): `public.get_auth_empresa_id()`, `public.rls_tenant_or_admin(row_empresa_id uuid)`
- **grants** adicionado (2): `public.colaborador_lotacoes:dp_mcp_role`, `public.colaborador_lotacoes:service_role`
- **indexes** adicionado (6): `public.colaborador_lotacoes_pkey`, `public.colaborador_lotacoes_principal_unica`, `public.colaborador_lotacoes_vinculo_unico`, `public.idx_colaborador_lotacoes_colaborador`, `public.idx_colaborador_lotacoes_empresa`, `public.idx_colaborador_lotacoes_lotacao`
- **policies (RLS)** adicionado (1): `public.colaborador_lotacoes.colaborador_lotacoes_tenant`
- **tabelas** adicionado (1): `public.colaborador_lotacoes`
- **triggers** adicionado (1): `public.colaborador_lotacoes.trg_colaborador_lotacoes_valida_tenant`

## 2026-11-18 01:15 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_21`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_14`

## 2026-11-18 00:35 UTC

- **functions** alterado (43): `public.assinar_desligamento(_desligamento_id uuid, _parte text)`, `public.assinar_espelho_ponto(_colaborador_id uuid, _competencia text, _ip inet, _user_agent text)`, `public.calculate_lockout_duration(attempts integer)`, `public.contrato_assinar_por_token(p_token text, p_cpf text, p_nome_completo text, p_ip inet, p_user_agent text)`, `public.contrato_consultar_por_token(p_token text)`, `public.contrato_gerar_token_assinatura(p_contrato_id uuid, p_email text, p_cpf text, p_validade_dias integer)`, `public.contrato_preview_url_por_token(p_token text)`, `public.dp_assert_rls(p_table text)`, `public.dp_audit_log_immutable()`, `public.dp_audit_log_prevent_future()`, `public.dp_catalog_pii(p_table text, p_column text, p_sensitivity dp_pii_sensitivity, p_category text, p_basis text, p_retention integer)`, `public.dp_check_log_rotation()`, `public.dp_check_rls_index_coverage()`, `public.dp_connection_health()`, `public.dp_create_next_partition()`, `public.dp_decrypt_pii(p_ciphertext text, p_key text)`, `public.dp_encrypt_pii(p_plaintext text, p_key text)`, `public.dp_has_role(p_role dp_user_role)`, `public.dp_hash_pii(p_value text, p_context text)`, `public.dp_missing_indexes()`, `public.dp_post_migration_check(p_expected_version text)`, `public.dp_pre_deploy_gate()`, `public.dp_require_role(p_role dp_user_role)`, `public.dp_run_retention(p_id uuid)`, `public.dp_set_updated_at()`, `public.dp_soft_delete_trigger()`, `public.dp_table_template(p_name text)`, `public.dp_track_pii_access()`, `public.fill_recrutamento_child_empresa()`, `public.fill_treinamento_certificados_empresa()`, `public.fill_treinamento_instancias_empresa()`, `public.gerar_hash_batida_ponto()`, `public.gerar_hash_ponto()`, `public.gerar_relatorio_conformidade_ponto()`, `public.get_personnel_cost_projection(p_empresa_id uuid, p_months integer)`, `public.medida_gerar_link_ciencia(p_medida_id uuid)`, `public.medida_registrar_ciencia_publica(p_token text, p_acao text, p_motivo_recusa text, p_ip text, p_user_agent text, p_geo jsonb)`, `public.processar_ajuste_aprovado(p_solicitacao_id uuid)`, `public.rls_tenant_or_admin(row_empresa_id uuid)`, `public.sst_regimento_assinar(p_documento_id uuid, p_colaborador_id uuid, p_ip text, p_user_agent text)` … (+3)

## 2026-11-17 21:17 UTC

- **lints** adicionado (8): `policy_auth_fn_not_wrapped:storage.objects.afastamentos_insert_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.afastamentos_select_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.afastamentos_update_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.docs_colab_insert_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.docs_colab_select_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.documentos_insert_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.documentos_select_authenticated`, `policy_auth_fn_not_wrapped:storage.objects.documentos_update_authenticated`
- **policies (RLS)** adicionado (8): `storage.objects.afastamentos_insert_authenticated`, `storage.objects.afastamentos_select_authenticated`, `storage.objects.afastamentos_update_authenticated`, `storage.objects.docs_colab_insert_authenticated`, `storage.objects.docs_colab_select_authenticated`, `storage.objects.documentos_insert_authenticated`, `storage.objects.documentos_select_authenticated`, `storage.objects.documentos_update_authenticated`

## 2026-11-17 20:14 UTC

- **colunas** adicionado (6): `public.documentos.mime_type`, `public.documentos.nome_arquivo`, `public.documentos.storage_path`, `public.documentos.tamanho`, `public.documentos_pessoais_arquivos.mime_type`, `public.documentos_pessoais_arquivos.storage_path`
- **functions** alterado (3): `public.log_audit_change()`, `public.storage_path_empresa_id(p_name text)`, `public.user_belongs_to_empresa(_user_id uuid, _empresa_id uuid)`
- **indexes** adicionado (1): `public.idx_onboarding_kits_empresa_id`
- **policies (RLS)** adicionado (2): `storage.objects.docs_colab_delete_rh_admin`, `storage.objects.documentos_delete_rh_admin`
- **triggers** adicionado (1): `public.tarefas_onboarding.audit_tarefas_onboarding`

## 2026-11-17 18:17 UTC

- **functions** alterado (5): `public.get_auth_empresa_id()`, `public.get_user_empresas(_user_id uuid)`, `public.log_audit_change()`, `public.pode_gerir_rh(_empresa_id uuid)`, `public.storage_path_empresa_id(p_name text)`

## 2026-11-17 02:19 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_13`

## 2026-11-17 01:15 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_20`

## 2026-11-16 21:13 UTC

- **functions** alterado (7): `public.backfill_training_image_requests(p_limit integer)`, `public.claim_training_image(p_empresa_id uuid, p_content_type text, p_content_id uuid, p_content_hash text, p_prompt_version text, p_max_attempts integer, p_stale_after interval)`, `public.claim_training_image_requests(p_limit integer)`, `public.edge_rate_limit_check(p_key text, p_limit integer, p_window_sec integer, p_now bigint)`, `public.edge_rate_limit_check_dual(p_empresa_key text, p_empresa_limit integer, p_usuario_key text, p_usuario_limit integer, p_window_sec integer, p_now bigint)`, `public.finish_training_image_request(p_id uuid, p_status text, p_error text, p_retry_after_seconds integer)`, `public.set_training_image_autoqueue(p_enabled boolean)`

## 2026-11-16 14:29 UTC

- **colunas** adicionado (10): `public.provisoes_competencia_tributaria.competencia`, `public.provisoes_competencia_tributaria.empresa_id`, `public.provisoes_competencia_tributaria.encargos_aliquota_bps`, `public.provisoes_competencia_tributaria.regime_tributario`, `public.provisoes_competencia_tributaria.registrado_em`, `public.provisoes_competencia_tributaria.registrado_por`, `public.provisoes_competencia_tributaria.simples_anexo`, `public.provisoes_mensais.encargos_aliquota_bps`, `public.provisoes_mensais.regime_tributario`, `public.provisoes_mensais.simples_anexo`
- **constraints** adicionado (4): `public.provisoes_competencia_tributaria.provisoes_competencia_tributaria_bps_faixa`, `public.provisoes_competencia_tributaria.provisoes_competencia_tributaria_empresa_id_fkey`, `public.provisoes_competencia_tributaria.provisoes_competencia_tributaria_pkey`, `public.provisoes_mensais.provisoes_mensais_encargos_aliquota_bps_faixa`
- **functions** alterado (3): `public.get_user_empresas(_user_id uuid)`, `public.is_admin(_user_id uuid)`, `public.replace_monthly_provisions(p_empresa_id uuid, p_competencia text, p_rows jsonb, p_user_id uuid, p_audit_data jsonb)`
- **grants** adicionado (3): `public.provisoes_competencia_tributaria:authenticated`, `public.provisoes_competencia_tributaria:dp_mcp_role`, `public.provisoes_competencia_tributaria:service_role`
- **indexes** adicionado (1): `public.provisoes_competencia_tributaria_pkey`
- **lints** adicionado (1): `policy_auth_fn_not_wrapped:public.provisoes_competencia_tributaria.provisoes_competencia_tributaria_tenant_select`
- **policies (RLS)** adicionado (1): `public.provisoes_competencia_tributaria.provisoes_competencia_tributaria_tenant_select`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_12`
- **tabelas** adicionado (1): `public.provisoes_competencia_tributaria`

## 2026-11-16 13:34 UTC

- **colunas** alterado (4): `public.feedbacks_360_consolidacoes.desempenho_aprovado`, `public.feedbacks_360_consolidacoes.desempenho_proposto`, `public.feedbacks_360_consolidacoes.potencial_aprovado`, `public.feedbacks_360_consolidacoes.potencial_proposto`
- **functions** alterado (22): `public.bloquear_exclusao_ciclo_com_dependencias()`, `public.colaborador_id_do_usuario(p_empresa_id uuid)`, `public.criar_feedback_seguro(p_empresa_id uuid, p_avaliado_id uuid, p_ciclo_id uuid, p_tipo text, p_nota_geral numeric, p_potencial numeric, p_avaliador_id uuid, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text)`, `public.decidir_aprovacao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text)`, `public.editar_feedback_seguro(p_feedback_id uuid, p_avaliado_id uuid, p_avaliador_id uuid, p_ciclo_id uuid, p_tipo text, p_nota numeric, p_potencial numeric, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text)`, `public.enviar_avaliacao_ao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text)`, `public.finalizar_feedback(p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text)`, `public.listar_historico_feedback(p_feedback_id uuid)`, `public.pode_aprovar_colaborador(p_colaborador_id uuid)`, `public.pode_editar_colaborador(p_colaborador_id uuid)`, `public.pode_editar_feedback(p_feedback_id uuid)`, `public.pode_finalizar_feedback(p_feedback_id uuid)`, `public.pode_gerir_avaliacoes()`, `public.pode_validar_potencial()`, `public.sincronizar_consolidacao_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid)`, `public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)`, `public.tg_audit_log_enriquecer_feedback()`, `public.tg_feedbacks_360_revisao()`, `public.trg_feedbacks_360_consolidacao()`, `public.validar_potencial_avaliacao(p_feedback_id uuid, p_idempotencia text, p_observacao text)`, `public.versao_avaliacao_feedback(p_feedback_id uuid)`, `public.versao_consolidada_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid)`
- **grants** alterado (2): `public.feedbacks_360:anon`, `public.feedbacks_360:authenticated`
- **lints** removido (1): `policy_auth_fn_not_wrapped:public.feedbacks_360.feedbacks_360_insert`
- **policies (RLS)** removido (1): `public.feedbacks_360.feedbacks_360_insert`
- **policies (RLS)** alterado (1): `public.feedbacks_360.feedbacks_360_select`
- **tabelas** alterado (1): `public.feedbacks_360`
- **triggers** alterado (1): `public.feedbacks_360.trg_feedbacks_360_consolidacao`

## 2026-11-16 12:29 UTC

- **functions** alterado (8): `public.edge_rate_limit_check_dual(p_empresa_key text, p_empresa_limit integer, p_usuario_key text, p_usuario_limit integer, p_window_sec integer, p_now bigint)`, `public.enqueue_training_image_request()`, `public.is_admin(_user_id uuid)`, `public.set_training_image_autoqueue(p_enabled boolean)`, `public.training_images_track_outcomes()`, `public.update_updated_at_column()`, `public.user_belongs_to_empresa(_user_id uuid, _empresa_id uuid)`, `public.versao_consolidada_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid)`

## 2026-11-16 11:16 UTC

- **functions** alterado (9): `public.decidir_aprovacao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text)`, `public.enviar_avaliacao_ao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text)`, `public.finalizar_feedback_base(p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text)`, `public.get_user_empresas(_user_id uuid)`, `public.pode_aprovar_colaborador(p_colaborador_id uuid)`, `public.sincronizar_consolidacao_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid)`, `public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)`, `public.versao_avaliacao_feedback(p_feedback_id uuid)`, `public.versao_consolidada_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid)`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_19`

## 2026-11-15 18:15 UTC

- **functions** alterado (1): `public.eh_feriado_fixo_br(p_data date)`

## 2026-11-15 17:11 UTC

- **functions** alterado (27): `public.bloquear_exclusao_ciclo_com_dependencias()`, `public.colaborador_id_do_usuario(p_empresa_id uuid)`, `public.criar_feedback_seguro(p_empresa_id uuid, p_avaliado_id uuid, p_ciclo_id uuid, p_tipo text, p_nota_geral numeric, p_potencial numeric, p_avaliador_id uuid, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text)`, `public.decidir_aprovacao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text)`, `public.editar_feedback_seguro(p_feedback_id uuid, p_avaliado_id uuid, p_avaliador_id uuid, p_ciclo_id uuid, p_tipo text, p_nota numeric, p_potencial numeric, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text)`, `public.enviar_avaliacao_ao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text)`, `public.finalizar_feedback(p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text)`, `public.finalizar_feedback_base(p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text)`, `public.get_audit_trail(p_empresa_id uuid, p_limit integer, p_before timestamp with time zone, p_tabela text, p_registro_id text, p_tabelas text[], p_before_id uuid)`, `public.get_user_empresas(_user_id uuid)`, `public.listar_auditoria(p_empresa_id uuid, p_tabela text, p_acao text, p_registro_id text, p_data_inicio timestamp with time zone, p_data_fim timestamp with time zone, p_limite integer)`, `public.listar_historico_feedback(p_feedback_id uuid)`, `public.pode_aprovar_colaborador(p_colaborador_id uuid)`, `public.pode_editar_colaborador(p_colaborador_id uuid)`, `public.pode_editar_feedback(p_feedback_id uuid)`, `public.pode_finalizar_feedback(p_feedback_id uuid)`, `public.pode_gerir_avaliacoes()`, `public.pode_validar_potencial()`, `public.rls_tenant_or_admin(row_empresa_id uuid)`, `public.sincronizar_consolidacao_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid)`, `public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)`, `public.tg_audit_log_enriquecer_feedback()`, `public.tg_feedbacks_360_revisao()`, `public.trg_feedbacks_360_consolidacao()`, `public.validar_potencial_avaliacao(p_feedback_id uuid, p_idempotencia text, p_observacao text)`, `public.versao_avaliacao_feedback(p_feedback_id uuid)`, `public.versao_consolidada_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid)`

## 2026-11-15 15:12 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_11`

## 2026-11-15 14:12 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_18`

## 2026-11-14 12:29 UTC

- **functions** alterado (11): `public.bloquear_aprovacao_ponto_sem_rh()`, `public.fn_auto_generate_training_certificate()`, `public.fn_pensoes_set_empresa()`, `public.fn_update_admissao_checklist()`, `public.get_user_empresas(_user_id uuid)`, `public.is_admin(_user_id uuid)`, `public.pertence_a_empresa(_empresa_id uuid)`, `public.pode_gerir_pessoas(_empresa_id uuid)`, `public.pode_gerir_rh(_empresa_id uuid)`, `public.process_ferias_audit()`, `public.update_updated_at_column()`

## 2026-11-14 12:11 UTC

- **colunas** adicionado (16): `public.auth_gov_br_sessions.updated_at`, `public.blocked_ips.updated_at`, `public.controle_acesso.updated_at`, `public.documentos_admissao.updated_at`, `public.documentos_assinatura.updated_at`, `public.documentos_colaborador.updated_at`, `public.escalas_trabalho.updated_at`, `public.ferias_solicitacoes.updated_at`, `public.notificacoes.updated_at`, `public.onboarding_tarefas.updated_at`, `public.onboarding_templates.updated_at`, `public.pensoes.empresa_id`, `public.periodos_ponto.updated_at`, `public.rubricas_folha.updated_at`, `public.seguros_vida.updated_at`, `public.treinamentos.updated_at`
- **constraints** adicionado (1): `public.pensoes.pensoes_empresa_id_fkey`
- **functions** adicionado (2): `public.bloquear_aprovacao_ponto_sem_rh()`, `public.fn_pensoes_set_empresa()`
- **functions** alterado (4): `public.fn_auto_generate_training_certificate()`, `public.fn_update_admissao_checklist()`, `public.pode_gerir_pessoas(_empresa_id uuid)`, `public.process_ferias_audit()`
- **grants** removido (8): `public.dp_audit_log:anon`, `public.dp_audit_log_2026_07:anon`, `public.dp_audit_log_2026_08:anon`, `public.dp_audit_log_2026_09:anon`, `public.dp_audit_log_2026_10:anon`, `public.dp_audit_log_2026_11:anon`, `public.dp_audit_log_2026_12:anon`, `public.dp_audit_log_default:anon`
- **grants** alterado (10): `public.dp_audit_log:authenticated`, `public.dp_audit_log_2026_07:authenticated`, `public.dp_audit_log_2026_08:authenticated`, `public.dp_audit_log_2026_09:authenticated`, `public.dp_audit_log_2026_10:authenticated`, `public.dp_audit_log_2026_11:authenticated`, `public.dp_audit_log_2026_12:authenticated`, `public.dp_audit_log_colaborador:authenticated`, `public.dp_audit_log_default:authenticated`, `public.dp_audit_log_rh:authenticated`
- **indexes** adicionado (2): `public.idx_pensoes_empresa_ativo`, `public.idx_pensoes_empresa_id`
- **lints** adicionado (6): `policy_auth_fn_not_wrapped:public.canal_etica.canal_etica_admin_delete`, `policy_auth_fn_not_wrapped:public.comunicados.comunicados_tenant_select`, `policy_auth_fn_not_wrapped:public.convenios.convenios_tenant_select`, `policy_auth_fn_not_wrapped:public.departamentos.departamentos_tenant_select`, `policy_auth_fn_not_wrapped:public.pensoes.pensoes_tenant_select`, `policy_auth_fn_not_wrapped:public.seguros_vida.seguros_vida_tenant_select`
- **lints** removido (7): `policy_auth_fn_not_wrapped:public.comunicados.empresa_comunicados`, `policy_auth_fn_not_wrapped:public.convenios.tenant_convenios`, `policy_auth_fn_not_wrapped:public.departamentos.tenant_departamentos`, `policy_auth_fn_not_wrapped:public.pensoes.tenant_pensoes`, `policy_auth_fn_not_wrapped:public.premiacoes_campanhas.Users can manage their own company campaigns`, `policy_auth_fn_not_wrapped:public.premiacoes_campanhas.Users can view their own company campaigns`, `policy_auth_fn_not_wrapped:public.seguros_vida.tenant_seguros_vida`
- **policies (RLS)** adicionado (25): `public.canal_etica.canal_etica_admin_delete`, `public.canal_etica.canal_etica_rh_select`, `public.canal_etica.canal_etica_rh_update`, `public.comunicados.comunicados_rh_delete`, `public.comunicados.comunicados_rh_insert`, `public.comunicados.comunicados_rh_update`, `public.comunicados.comunicados_tenant_select`, `public.convenios.convenios_rh_delete`, `public.convenios.convenios_rh_insert`, `public.convenios.convenios_rh_update`, `public.convenios.convenios_tenant_select`, `public.departamentos.departamentos_rh_delete`, `public.departamentos.departamentos_rh_insert`, `public.departamentos.departamentos_rh_update`, `public.departamentos.departamentos_tenant_select`, `public.pensoes.pensoes_rh_delete`, `public.pensoes.pensoes_rh_insert`, `public.pensoes.pensoes_rh_update`, `public.pensoes.pensoes_tenant_select`, `public.premiacoes_campanhas.premiacoes_campanhas_rh_manage`, `public.premiacoes_campanhas.premiacoes_campanhas_tenant_select`, `public.seguros_vida.seguros_vida_rh_delete`, `public.seguros_vida.seguros_vida_rh_insert`, `public.seguros_vida.seguros_vida_rh_update`, `public.seguros_vida.seguros_vida_tenant_select`
- **policies (RLS)** removido (9): `public.canal_etica.canal_etica_rh_manage`, `public.cnab_remessas.cnab_remessas_tenant_read`, `public.comunicados.empresa_comunicados`, `public.convenios.tenant_convenios`, `public.departamentos.tenant_departamentos`, `public.pensoes.tenant_pensoes`, `public.premiacoes_campanhas.Users can manage their own company campaigns`, `public.premiacoes_campanhas.Users can view their own company campaigns`, `public.seguros_vida.tenant_seguros_vida`
- **triggers** adicionado (2): `public.pensoes.trg_pensoes_set_empresa`, `public.registros_ponto.tr_bloquear_aprovacao_ponto_sem_rh`

## 2026-11-14 00:21 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_17`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`

## 2026-11-13 21:00 UTC

- **colunas** adicionado (1): `public.planos_saude.updated_at`
- **functions** alterado (5): `public.decrypt_dados_bancarios_tenant(p_ciphertext text, p_empresa_id uuid)`, `public.is_admin(_user_id uuid)`, `public.notificar_ferias_pagamento_d5()`, `public.pode_gerir_rh(_empresa_id uuid)`, `public.update_updated_at_column()`
- **lints** removido (1): `view_security_definer:public.contas_bancarias_decrypted`
- **views** alterado (1): `public.contas_bancarias_decrypted`

## 2026-11-13 11:01 UTC

- **functions** alterado (7): `public.admin_associar_usuario_empresa(p_user_id uuid, p_empresa_id uuid, p_is_default boolean)`, `public.deadline_legal_pagamento_ferias(p_data_inicio date)`, `public.eh_feriado_fixo_br(p_data date)`, `public.get_my_user_empresas()`, `public.pode_gerir_pessoas_para(_user_id uuid, _empresa_id uuid)`, `public.pode_gerir_rh_para(_user_id uuid, _empresa_id uuid)`, `public.set_own_default_empresa(p_empresa_id uuid)`

## 2026-11-13 02:42 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`

## 2026-11-13 01:13 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_16`

## 2026-11-12 13:21 UTC

- **functions** alterado (7): `public.admin_associar_usuario_empresa(p_user_id uuid, p_empresa_id uuid, p_is_default boolean)`, `public.get_my_user_empresas()`, `public.has_role(_user_id uuid, _role app_role)`, `public.is_admin(_user_id uuid)`, `public.pode_gerir_pessoas_para(_user_id uuid, _empresa_id uuid)`, `public.pode_gerir_rh_para(_user_id uuid, _empresa_id uuid)`, `public.set_own_default_empresa(p_empresa_id uuid)`

## 2026-11-12 04:53 UTC

- **lints** adicionado (1): `rls_no_policies:public.medidas_ciencia_tokens`
- **lints** removido (2): `policy_auth_fn_not_wrapped:public.medidas_ciencia_tokens.RH gera tokens da empresa`, `policy_auth_fn_not_wrapped:public.medidas_ciencia_tokens.RH visualiza tokens da empresa`
- **policies (RLS)** removido (2): `public.medidas_ciencia_tokens.RH gera tokens da empresa`, `public.medidas_ciencia_tokens.RH visualiza tokens da empresa`

## 2026-11-12 04:10 UTC

- **realtime** removido (5): `supabase_realtime_messages_publication:realtime.messages_2026_11_04`, `supabase_realtime_messages_publication:realtime.messages_2026_11_05`, `supabase_realtime_messages_publication:realtime.messages_2026_11_06`, `supabase_realtime_messages_publication:realtime.messages_2026_11_07`, `supabase_realtime_messages_publication:realtime.messages_2026_11_08`

## 2026-11-12 03:27 UTC

- **functions** adicionado (1): `public.pode_gerir_config_ponto(_empresa_id uuid)`
- **functions** alterado (4): `public.has_role(_user_id uuid, _role app_role)`, `public.is_admin(_user_id uuid)`, `public.pertence_a_empresa(_empresa_id uuid)`, `public.rls_tenant_or_admin(row_empresa_id uuid)`
- **lints** adicionado (1): `policy_auth_fn_not_wrapped:public.configuracoes_ponto.Admins podem inserir configurações de ponto`
- **policies (RLS)** adicionado (2): `public.configuracoes_ponto.Supervisor ou coordenador alteram configurações de ponto`, `public.configuracoes_ponto.Supervisor ou coordenador inserem configurações de ponto`
- **policies (RLS)** removido (2): `public.configuracoes_ponto.Apenas admins podem atualizar configurações de ponto`, `public.configuracoes_ponto.configuracoes_ponto_tenant_manage`
- **policies (RLS)** alterado (1): `public.configuracoes_ponto.Admins podem inserir configurações de ponto`
- **types/enums** alterado (1): `public.app_role`

## 2026-11-12 02:14 UTC

- **functions** adicionado (3): `public.deadline_legal_pagamento_ferias(p_data_inicio date)`, `public.eh_dia_util_br(p_data date)`, `public.eh_feriado_fixo_br(p_data date)`
- **functions** removido (1): `public.fn_trigger_whatsapp_on_event()`
- **functions** alterado (3): `public.has_role(_user_id uuid, _role app_role)`, `public.is_admin(_user_id uuid)`, `public.rls_tenant_or_admin(row_empresa_id uuid)`
- **policies (RLS)** adicionado (2): `public.configuracoes_ponto.Admins podem inserir configurações de ponto`, `public.configuracoes_ponto.configuracoes_ponto_tenant_manage`
- **realtime** adicionado (5): `supabase_realtime_messages_publication:realtime.messages_2026_11_11`, `supabase_realtime_messages_publication:realtime.messages_2026_11_12`, `supabase_realtime_messages_publication:realtime.messages_2026_11_13`, `supabase_realtime_messages_publication:realtime.messages_2026_11_14`, `supabase_realtime_messages_publication:realtime.messages_2026_11_15`
- **triggers** removido (1): `public.colaboradores.tr_whatsapp_on_new_hiring`
- **views** alterado (1): `public.v_ferias_alerta_pagamento_d2`

## 2026-11-10 20:57 UTC

- **functions** alterado (2): `public.pertence_a_empresa(_empresa_id uuid)`, `public.rls_tenant_or_admin(row_empresa_id uuid)`

## 2026-11-07 01:27 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_10`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_03`

## 2026-11-06 02:21 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_09`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_02`

## 2026-11-05 01:01 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_08`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_01`

## 2026-11-04 20:28 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_10_31`

## 2026-11-04 13:18 UTC

- Snapshot inicial.

