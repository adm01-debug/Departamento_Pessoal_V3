# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

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

