# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

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

