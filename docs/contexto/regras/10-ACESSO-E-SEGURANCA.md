# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `6ed87f2aec` · branch `main` · 2026-11-06 01:41 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`admin`, `assistant`, `auditoria`, `colaborador`, `confirmado`, `dpo`, `gestor`, `granted`, `pendente`, `rh`, `role`, `service_role`, `supabase_admin`, `super_admin`, `user`

- Tabelas de perfil/permissão: `controle_acesso`, `dp_user_roles`, `permissao_perfis`, `permissao_recursos`, `permissions`, `role_permissions`, `user_roles`
- Colunas de perfil: `auth.users.role` (character varying(255)), `dp_user_roles.role` ("public"."dp_user_role" NOT NULL), `permissao_perfis.is_admin` (boolean DEFAULT false), `permissions.role` ("public"."app_role" NOT NULL), `role_permissions.role` ("text" NOT NULL), `user_roles.role` (public.app_role NOT NULL DEFAULT 'user')
- Claims do JWT usados em políticas/funções: `role`, `user_metadata`
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `06`): `candidatura_na_minha_empresa`, `empresa_do_colaborador`, `foldername`, `get_auth_empresa_id`, `get_user_empresa_ids`, `get_user_empresas`, `get_user_scope_empresas`, `has_role`, `is_admin`, `jwt`, `pertence_a_empresa`, `pode_gerir_pessoas`, `pode_gerir_rh`, `rls_tenant_or_admin`, `role`, `sou_o_colaborador`, `uid`, `user_belongs_to_empresa`, `user_can_manage_tenant_storage`, `user_empresa_id`

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `_test_ctx` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `adiantamentos_salariais` | enabled | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `adicionais` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `admissao_tokens` | enabled | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())))<br>anon, authenticated: token = COALESCE( current_setting('request.headers', true)::json->>'x-admissao-token', '' ) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) |
| `admissoes` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: (empresa_id IS NOT NULL AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) OR public.is_admin(auth.uid()) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `aej_geracoes` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS ( SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid( | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS ( SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid( | — | — |
| `afastamentos` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = afastamentos.colaborador_id AND c.empresa_id = public.get_auth_emp<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = afastamentos.colaborador_id AND c.empresa_id = public.get_auth_emp<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = afastamentos.colaborador_id AND c.empresa_id = public.get_auth_emp<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = afastamentos.colaborador_id AND c.empresa_id = public.get_auth_emp<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `afd_geracoes` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS ( SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid( | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS ( SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid( | — | — |
| `afdt_divergencias` | enabled | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) |
| `afdt_importacoes` | enabled | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) |
| `afdt_registros_raw` | enabled | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) |
| `ajustes_ponto` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = ajustes_ponto.colaborador_id AND c.empresa_id = public.get_auth_em | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = ajustes_ponto.colaborador_id AND c.empresa_id = public.get_auth_em | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = ajustes_ponto.colaborador_id AND c.empresa_id = public.get_auth_em | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = ajustes_ponto.colaborador_id AND c.empresa_id = public.get_auth_em |
| `anotacoes_colaborador` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_pessoas(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND (public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND public.pode_gerir_rh(c.em | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_pessoas(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND (public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND public.pode_gerir_rh(c.em | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_pessoas(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND (public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND public.pode_gerir_rh(c.em | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_pessoas(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND (public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = anotacoes_colaborador.colaborador_id AND public.pode_gerir_rh(c.em |
| `asos` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | public: auth.uid() IS NOT NULL<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: auth.uid() IS NOT NULL<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: auth.uid() IS NOT NULL<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `atrasos` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `audit_log` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: user_id = auth.uid()<br>authenticated: public.is_admin(auth.uid())<br>authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'rh'::public.<br>authenticated: user_id = auth.uid() | — | — |
| `audit_log_unified` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>service_role: true | service_role: true | service_role: true | service_role: true |
| `audit_log_unified_archive` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `audit_logs` | enabled | authenticated: user_id = auth.uid()<br>authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) OR is_admin(auth.uid()) | authenticated: user_id = auth.uid()<br>authenticated: auth.uid() = user_id AND empresa_id IN (SELECT get_user_empresas(auth.uid())) | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `auditoria` | enabled | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' = 'admin'<br>authenticated: empresa_id::uuid IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.is_admin(auth.uid()) | authenticated: empresa_id::uuid IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated, anon: false<br>public: usuario_id = auth.uid() | — | — |
| `auditoria_acesso_bancario` | enabled | — | authenticated: user_id IS NULL OR user_id = auth.uid() | — | — |
| `auditoria_contratual` | enabled | — | — | — | — |
| `auditoria_logs` | enabled | public: auth.role() = 'authenticated'<br>authenticated: user_id = auth.uid() OR public.is_admin(auth.uid())<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.role() = 'authenticated'<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `auth._test_uid` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth.audit_log_entries` | enabled | — | — | — | — |
| `auth.custom_oauth_providers` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth.flow_state` | enabled | — | — | — | — |
| `auth.identities` | enabled | — | — | — | — |
| `auth.instances` | enabled | — | — | — | — |
| `auth.mfa_amr_claims` | enabled | — | — | — | — |
| `auth.mfa_challenges` | enabled | — | — | — | — |
| `auth.mfa_factors` | enabled | — | — | — | — |
| `auth.oauth_authorizations` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth.oauth_client_states` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth.oauth_clients` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth.oauth_consents` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `auth.one_time_tokens` | enabled | — | — | — | — |
| `auth.refresh_tokens` | enabled | — | — | — | — |
| `auth.saml_providers` | enabled | — | — | — | — |
| `auth.saml_relay_states` | enabled | — | — | — | — |
| `auth.schema_migrations` | enabled | — | — | — | — |
| `auth.sessions` | enabled | — | — | — | — |
| `auth.sso_domains` | enabled | — | — | — | — |
| `auth.sso_providers` | enabled | — | — | — | — |
| `auth.users` | enabled | — | — | — | — |
| `auth.webauthn_challenges` | não encontrado | public: true<br>authenticated: user_id = auth.uid() | public: true<br>authenticated: user_id = auth.uid() | public: true<br>authenticated: user_id = auth.uid() | public: true<br>authenticated: user_id = auth.uid() |
| `auth.webauthn_credentials` | não encontrado | public: auth.uid() = user_id | public: ("auth"."uid"() = "user_id") | public: auth.uid() = user_id | public: ("auth"."uid"() = "user_id") |
| `auth_gov_br_sessions` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `automacao_logs` | enabled | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | — | — | — |
| `avaliacoes` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `backup_logs` | enabled | public: auth.uid() IS NOT NULL AND ( (auth.jwt() ->> 'role') = 'super_admin' OR ( (auth.jwt() ->> 'role') IN ('admin', 'rh') AND empresa_id <br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin') AND empresa_id = public.user_empresa_id()<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `banco_horas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = banco_horas.colaborador_id AND c.empresa_id = public.get_auth_empr<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = banco_horas.colaborador_id AND c.empresa_id = public.get_auth_empr | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = banco_horas.colaborador_id AND c.empresa_id = public.get_auth_empr | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = banco_horas.colaborador_id AND c.empresa_id = public.get_auth_empr |
| `banco_horas_config` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `batidas_ponto` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `beneficiarios_plano` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empr |
| `beneficiarios_seguro` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) |
| `beneficio_arquivos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `beneficio_movimentacoes` | enabled | authenticated: EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND c.empresa_id IN (SELECT <br>public: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND public.pertence_a_empresa(c.em | authenticated: EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND c.empresa_id IN (SELECT <br>public: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND public.pertence_a_empresa(c.em | authenticated: EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND c.empresa_id IN (SELECT <br>public: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND public.pertence_a_empresa(c.em | authenticated: EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND c.empresa_id IN (SELECT <br>public: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficio_movimentacoes.colaborador_id AND public.pertence_a_empresa(c.em |
| `beneficio_regras_elegibilidade` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) |
| `beneficio_utilizacao` | enabled | public: (EXISTS ( SELECT 1 FROM ("public"."beneficios_colaborador" "bc" JOIN "public"."colaboradores" "c" ON (("bc"."colaborador_id" = "c"." | — | — | — |
| `beneficios` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficios.colaborador_id AND c.empresa_id = public.get_auth_empre<br>public: ("empresa_id" IN ( SELECT "user_empresas"."empresa_id" FROM "public"."user_empresas" WHERE ("user_empresas"."user_id" = "auth"."uid" | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficios.colaborador_id AND c.empresa_id = public.get_auth_empre<br>public: ("empresa_id" IN ( SELECT "user_empresas"."empresa_id" FROM "public"."user_empresas" WHERE ("user_empresas"."user_id" = "auth"."uid" | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficios.colaborador_id AND c.empresa_id = public.get_auth_empre<br>public: ("empresa_id" IN ( SELECT "user_empresas"."empresa_id" FROM "public"."user_empresas" WHERE ("user_empresas"."user_id" = "auth"."uid" | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = beneficios.colaborador_id AND c.empresa_id = public.get_auth_empre<br>public: ("empresa_id" IN ( SELECT "user_empresas"."empresa_id" FROM "public"."user_empresas" WHERE ("user_empresas"."user_id" = "auth"."uid" |
| `beneficios_colaborador` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())) ) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())) ) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())) ) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())) ) |
| `beneficios_colaboradores` | enabled | public: (EXISTS ( SELECT 1 FROM "public"."colaboradores" "c" WHERE (("c"."id" = "beneficios_colaboradores"."colaborador_id") AND ("c"."empre | public: (EXISTS ( SELECT 1 FROM "public"."colaboradores" "c" WHERE (("c"."id" = "beneficios_colaboradores"."colaborador_id") AND ("c"."empre | public: (EXISTS ( SELECT 1 FROM "public"."colaboradores" "c" WHERE (("c"."id" = "beneficios_colaboradores"."colaborador_id") AND ("c"."empre | public: (EXISTS ( SELECT 1 FROM "public"."colaboradores" "c" WHERE (("c"."id" = "beneficios_colaboradores"."colaborador_id") AND ("c"."empre |
| `beneficios_elegibilidade` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `beneficios_movimentacoes` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `bitrix24_config` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `bitrix24_sync_logs` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: auth.uid() IS NOT NULL | — | — |
| `blocked_ips` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `cache_tabelas` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `campos_customizados` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `canal_etica` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `candidatos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `candidaturas` | enabled | authenticated: EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id IN (SELECT public.get_user_empresas(a<br>authenticated: EXISTS ( SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id = public.get_auth_empresa_id() ) | authenticated: EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id IN (SELECT public.get_user_empresas(a<br>authenticated: EXISTS ( SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id = public.get_auth_empresa_id() ) | authenticated: EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id IN (SELECT public.get_user_empresas(a<br>authenticated: EXISTS ( SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id = public.get_auth_empresa_id() ) | authenticated: EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id IN (SELECT public.get_user_empresas(a<br>authenticated: EXISTS ( SELECT 1 FROM public.vagas v WHERE v.id = candidaturas.vaga_id AND v.empresa_id = public.get_auth_empresa_id() ) |
| `cargo_faixas_salariais` | enabled | authenticated: EXISTS (SELECT 1 FROM public.cargos g WHERE g.id = cargo_faixas_salariais.cargo_id AND g.empresa_id IN (SELECT public.get_use<br>public: EXISTS ( SELECT 1 FROM public.cargos cg WHERE cg.id = cargo_faixas_salariais.cargo_id AND (cg.empresa_id IS NULL OR public.pertence_ | authenticated: EXISTS (SELECT 1 FROM public.cargos g WHERE g.id = cargo_faixas_salariais.cargo_id AND g.empresa_id IN (SELECT public.get_use<br>public: EXISTS ( SELECT 1 FROM public.cargos cg WHERE cg.id = cargo_faixas_salariais.cargo_id AND (cg.empresa_id IS NULL OR public.pertence_ | authenticated: EXISTS (SELECT 1 FROM public.cargos g WHERE g.id = cargo_faixas_salariais.cargo_id AND g.empresa_id IN (SELECT public.get_use<br>public: EXISTS ( SELECT 1 FROM public.cargos cg WHERE cg.id = cargo_faixas_salariais.cargo_id AND (cg.empresa_id IS NULL OR public.pertence_ | authenticated: EXISTS (SELECT 1 FROM public.cargos g WHERE g.id = cargo_faixas_salariais.cargo_id AND g.empresa_id IN (SELECT public.get_use<br>public: EXISTS ( SELECT 1 FROM public.cargos cg WHERE cg.id = cargo_faixas_salariais.cargo_id AND (cg.empresa_id IS NULL OR public.pertence_ |
| `cargos` | enabled | public: empresa_id = public.user_empresa_id()<br>public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `cas` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `catalogo_cursos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `catalogo_infracoes` | enabled | authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) |
| `categorias_trabalhador` | enabled | authenticated: true | — | — | — |
| `cbo` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `centros_custo` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `certificados_digitais` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `ciclos_avaliacao` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `cid10` | enabled | authenticated: true | — | — | — |
| `ciencia_rate_limits` | enabled | — | — | — | — |
| `clinicas_partners` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = clinicas_partners.empresa_id<br>authenticated: (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rh'::app_role)) AND EXISTS ( SELECT 1 FROM pu | authenticated: (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rh'::app_role)) AND EXISTS ( SELECT 1 FROM pu | authenticated: (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rh'::app_role)) AND EXISTS ( SELECT 1 FROM pu | authenticated: (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rh'::app_role)) AND EXISTS ( SELECT 1 FROM pu |
| `clinicas_partners_horarios` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c |
| `clinicas_partners_servicos` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c | authenticated: EXISTS ( SELECT 1 FROM public.clinicas_partners c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = c |
| `cnab_configuracoes` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `cnab_itens` | enabled | authenticated: EXISTS (SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id))<br>authenticated: EXISTS (SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) ) | authenticated: EXISTS (SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) ) | authenticated: EXISTS (SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) ) | authenticated: EXISTS (SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.cnab_remessas r WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id) ) |
| `cnab_remessas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `cnab_sequencias` | enabled | — | — | — | — |
| `cnae` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `colaborador_beneficios` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores AS c WHERE c.id = colaborador_beneficios.colaborador_id AND c.empresa_id IN (SELE | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) |
| `colaboradores` | enabled | public: empresa_id = public.user_empresa_id()<br>authenticated: true<br>authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: user_id = auth.uid()<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pertence_a_empresa(empresa_id)<br>authenticated: user_id = auth.uid()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(id) | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id = public.get_auth_empresa_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'))<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' = 'admin'<br>authenticated: empresa_id = public.get_auth_empresa_id() AND public.is_admin(auth.uid())<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `colaboradores_historico` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `colaboradores_pin` | enabled | — | — | — | — |
| `comissoes` | enabled | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `competencias_config` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) |
| `competencias_matriz` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `comunicados` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `comunicados_leituras` | enabled | authenticated: usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELEC<br>authenticated: comunicado_id IN ( SELECT id FROM public.comunicados WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELEC<br>authenticated: comunicado_id IN ( SELECT id FROM public.comunicados WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELEC<br>authenticated: comunicado_id IN ( SELECT id FROM public.comunicados WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELEC<br>authenticated: comunicado_id IN ( SELECT id FROM public.comunicados WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `condicoes_ingresso` | enabled | authenticated: true | — | — | — |
| `config_afastamentos` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | — | — | — |
| `config_alertas_indicadores` | enabled | authenticated: true | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | — |
| `config_retencao` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `configuracoes` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | — |
| `configuracoes_alertas` | enabled | authenticated: EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'admin') | authenticated: EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'admin') | authenticated: EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'admin') | authenticated: EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'admin') |
| `configuracoes_esocial` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>public: ("auth"."uid"() IN ( SELECT "user_empresas"."user_id" FROM "public"."user_empresas" WHERE ("user_empresas"."empresa_id" = "configura | authenticated: public.rls_tenant_or_admin(empresa_id)<br>public: ("auth"."uid"() IN ( SELECT "user_empresas"."user_id" FROM "public"."user_empresas" WHERE ("user_empresas"."empresa_id" = "configura | authenticated: public.rls_tenant_or_admin(empresa_id)<br>public: ("auth"."uid"() IN ( SELECT "user_empresas"."user_id" FROM "public"."user_empresas" WHERE ("user_empresas"."empresa_id" = "configura | authenticated: public.rls_tenant_or_admin(empresa_id)<br>public: ("auth"."uid"() IN ( SELECT "user_empresas"."user_id" FROM "public"."user_empresas" WHERE ("user_empresas"."empresa_id" = "configura |
| `configuracoes_intervalo` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `configuracoes_ponto` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: public.pertence_a_empresa(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) AND public.is_admin(auth.uid())<br>public: public.pertence_a_empresa(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id) |
| `conformidade_ponto_logs` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | — | — | — |
| `contabilidade_contatos` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) |
| `contabilidade_mensagens` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) |
| `contabilidade_threads` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) |
| `contas_bancarias` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contas_bancarias.colaborador_id AND public.rls_tenant_or_admin(c.e<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.is_admin(auth.uid())<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contas_bancarias.colaborador_id AND public.rls_tenant_or_admin(c.e<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.is_admin(auth.uid())<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contas_bancarias.colaborador_id AND public.rls_tenant_or_admin(c.e<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.is_admin(auth.uid())<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contas_bancarias.colaborador_id AND public.rls_tenant_or_admin(c.e<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.is_admin(auth.uid())<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `contatos_emergencia` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.co<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.co<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.co<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.co<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = contatos_emergencia.colaborador_id AND public.pode_gerir_rh(c.empr<br>authenticated: public.sou_o_colaborador(colaborador_id) |
| `contrato_assinatura_tokens` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role( | — | — |
| `contrato_templates` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id)<br>authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() |
| `contrato_token_eventos` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | — | — | — |
| `contratos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `contratos_gerados` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id)<br>authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid() |
| `controle_acesso` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `convenios` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `convenios_colaboradores` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) |
| `curriculos_arquivos` | enabled | — | — | — | — |
| `dados_estagiario` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `dados_estrangeiro` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `darfs` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `dctfweb_declaracoes` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `deficiencias` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `departamentos` | enabled | public: empresa_id = public.user_empresa_id()<br>public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `dependentes` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.rls_tenant_or_admin(c.empres<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id) <br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_pessoas(c.empresa<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id) <br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.rls_tenant_or_admin(c.empres<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id) <br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)  | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.rls_tenant_or_admin(c.empres<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id) <br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)  | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.rls_tenant_or_admin(c.empres<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id) <br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)  |
| `dependentes_beneficios` | enabled | authenticated: dependente_id IN (SELECT id FROM public.dependentes WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empres | authenticated: dependente_id IN (SELECT id FROM public.dependentes WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empres | authenticated: dependente_id IN (SELECT id FROM public.dependentes WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empres | authenticated: dependente_id IN (SELECT id FROM public.dependentes WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empres |
| `descricoes_logradouro` | enabled | authenticated: true | — | — | — |
| `desligamentos` | enabled | public: empresa_id IN (SELECT public.get_user_empresa_ids())<br>authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | public: empresa_id IN (SELECT public.get_user_empresa_ids())<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: empresa_id IN (SELECT public.get_user_empresa_ids())<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: empresa_id IN (SELECT public.get_user_empresa_ids())<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `despesas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `despesas_aprovacoes_log` | enabled | authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT get_user_empresas(auth.uid())) AND usuario_id = auth.uid() | — | — |
| `documento_templates` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IS NULL OR empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IS NULL OR empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IS NULL OR empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IS NULL OR empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `documentos` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos.colaborador_id AND c.empresa_id = public.get_auth_empre<br>authenticated: colaborador_id IS NULL AND empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos.colaborador_id AND c.empresa_id = public.get_auth_empre<br>authenticated: colaborador_id IS NULL AND empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos.colaborador_id AND c.empresa_id = public.get_auth_empre<br>authenticated: colaborador_id IS NULL AND empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos.colaborador_id AND c.empresa_id = public.get_auth_empre<br>authenticated: colaborador_id IS NULL AND empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id) |
| `documentos_admissao` | enabled | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())))<br>public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) |
| `documentos_afastamento` | enabled | authenticated: EXISTS (SELECT 1 FROM public.afastamentos a WHERE a.id = documentos_afastamento.afastamento_id AND a.empresa_id IN (SELECT pu<br>authenticated: EXISTS ( SELECT 1 FROM public.afastamentos a JOIN public.colaboradores c ON c.id = a.colaborador_id WHERE a.id = documentos_a | authenticated: EXISTS (SELECT 1 FROM public.afastamentos a WHERE a.id = documentos_afastamento.afastamento_id AND a.empresa_id IN (SELECT pu<br>authenticated: EXISTS ( SELECT 1 FROM public.afastamentos a JOIN public.colaboradores c ON c.id = a.colaborador_id WHERE a.id = documentos_a | authenticated: EXISTS (SELECT 1 FROM public.afastamentos a WHERE a.id = documentos_afastamento.afastamento_id AND a.empresa_id IN (SELECT pu<br>authenticated: EXISTS ( SELECT 1 FROM public.afastamentos a JOIN public.colaboradores c ON c.id = a.colaborador_id WHERE a.id = documentos_a | authenticated: EXISTS (SELECT 1 FROM public.afastamentos a WHERE a.id = documentos_afastamento.afastamento_id AND a.empresa_id IN (SELECT pu<br>authenticated: EXISTS ( SELECT 1 FROM public.afastamentos a JOIN public.colaboradores c ON c.id = a.colaborador_id WHERE a.id = documentos_a |
| `documentos_assinatura` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `documentos_assinaturas` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `documentos_colaborador` | enabled | authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e | authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e | authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid())<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.e |
| `documentos_historico` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his<br>authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his<br>authenticated: EXISTS ( SELECT 1 FROM public.documentos d WHERE d.id = documentos_historico.documento_id AND public.sou_o_colaborador(d.cola | authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his<br>authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his | authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his<br>authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his | authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his<br>authenticated: EXISTS ( SELECT 1 FROM public.documentos d JOIN public.colaboradores c ON c.id = d.colaborador_id WHERE d.id = documentos_his |
| `documentos_pessoais_arquivos` | enabled | authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_ | authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_ | authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_ |
| `documentos_versoes` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `dp_audit_config` | enabled | — | — | — | — |
| `dp_audit_log` | enabled | — | — | — | — |
| `dp_audit_log_2026_07` | enabled | — | — | — | — |
| `dp_audit_log_2026_08` | enabled | — | — | — | — |
| `dp_audit_log_2026_09` | enabled | — | — | — | — |
| `dp_audit_log_2026_10` | enabled | — | — | — | — |
| `dp_audit_log_2026_11` | enabled | — | — | — | — |
| `dp_audit_log_2026_12` | enabled | — | — | — | — |
| `dp_audit_log_default` | enabled | — | — | — | — |
| `dp_backup_runbook` | enabled | — | — | — | — |
| `dp_data_catalog` | enabled | — | — | — | — |
| `dp_environments` | enabled | — | — | — | — |
| `dp_mcp_config` | enabled | — | — | — | — |
| `dp_retention_policy` | enabled | — | — | — | — |
| `dp_user_roles` | enabled | — | — | — | — |
| `empresas` | enabled | public: id = public.user_empresa_id() OR auth.jwt() ->> 'role' = 'super_admin'<br>authenticated: id IN (SELECT get_user_empresas(auth.uid()))<br>authenticated: is_admin(auth.uid()) | public: auth.jwt() ->> 'role' = 'super_admin'<br>authenticated: is_admin(auth.uid()) | public: id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'super_admin')<br>authenticated: is_admin(auth.uid()) | public: auth.jwt() ->> 'role' = 'super_admin'<br>authenticated: is_admin(auth.uid()) |
| `emprestimos_consignados` | enabled | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `entity_versions` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: true | public: auth.uid() = changed_by OR changed_by IS NULL | — | — |
| `epis` | enabled | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `epis_entregas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `epis_fichas` | enabled | authenticated: EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id)<br>authenticated: EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id) AND ( | authenticated: EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id) AND ( | authenticated: EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id) AND ( | authenticated: EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id) AND ( |
| `epis_fichas_assinaturas` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.epis_fichas f JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id WHERE f.id = epis_fi | authenticated: EXISTS ( SELECT 1 FROM public.epis_fichas f JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id WHERE f.id = epis_fi | — | — |
| `epis_fichas_itens` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.epis_fichas f JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id WHERE f.id = epis_fi | authenticated: EXISTS ( SELECT 1 FROM public.epis_fichas f JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id WHERE f.id = epis_fi | authenticated: EXISTS ( SELECT 1 FROM public.epis_fichas f JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id WHERE f.id = epis_fi | authenticated: EXISTS ( SELECT 1 FROM public.epis_fichas f JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id WHERE f.id = epis_fi |
| `escalas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `escalas_trabalho` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `esocial_eventos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: (empresa_id IS NOT NULL AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) OR public.is_admin(auth.uid()) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `esocial_lotes` | enabled | public: auth.role() = 'authenticated'<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.role() = 'authenticated'<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.role() = 'authenticated'<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `esocial_retornos` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `esocial_transmissao_logs` | enabled | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | — | — | — |
| `etnias` | enabled | public: ("auth"."role"() = 'authenticated'::"text") | — | — | — |
| `eventos_rh` | enabled | — | — | — | — |
| `eventos_variaveis` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `exames` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) ) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) ) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id) ) |
| `exames_agendamentos` | enabled | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) OR public.has_role(auth.uid() | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) OR public.has_role(auth.uid() | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) OR public.has_role(auth.uid() | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) OR public.has_role(auth.uid() |
| `exames_medicos` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `faixas_inss` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `faixas_irrf` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `faltas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `feedbacks_360` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `feriados` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() OR empresa_id IS NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `feriados_brasileiros` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `ferias` | enabled | public: colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())<br>public: colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id()) AND auth.jwt() ->> 'role' IN ('admin', <br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | public: colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id()) AND auth.jwt() ->> 'role' IN ('admin', <br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id()) AND auth.jwt() ->> 'role' IN ('admin', <br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | public: colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id()) AND auth.jwt() ->> 'role' IN ('admin', <br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `ferias_abono` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `ferias_aprovacoes` | enabled | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) |
| `ferias_aprovacoes_log` | enabled | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | — | — | — |
| `ferias_arquivos` | enabled | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) |
| `ferias_audit_log` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() OR empresa_id IS NULL<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | — | — | — |
| `ferias_coletivas` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `ferias_programacao` | enabled | public: auth.role() = 'authenticated'<br>authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) OR EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = ferias_pr | public: auth.role() = 'authenticated'<br>authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | public: auth.role() = 'authenticated'<br>authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid( | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) AND (public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'a |
| `ferias_reconciliacao_logs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'rh') | — | — | — |
| `ferias_solicitacoes` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `fgts_digital_logs` | enabled | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | — | — | — |
| `fila_notificacoes` | enabled | public: ("auth"."uid"() = "user_id") | — | — | — |
| `fila_processamento` | enabled | public: auth.uid() = usuario_id | — | — | — |
| `folha_assinaturas` | enabled | authenticated: assinante_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin') | — | — | — |
| `folha_auditoria` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_auditoria.folha_id AND f.empresa_id IN (SELECT public.get<br>public: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_auditoria.folha_id AND (f.empresa_id IS NULL OR public.pertence_ | authenticated: ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'rh'::public.app_role) ) AND EXISTS ( <br>public: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_auditoria.folha_id AND (f.empresa_id IS NULL OR public.pertence_ | — | — |
| `folha_calculos` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `folha_competencias` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `folha_eventos_auditoria` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `folha_itens` | enabled | authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) )<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) ) | authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) ) | authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id) ) |
| `folha_lock_conflicts` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS ( SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_lock_co | — | — |
| `folha_pagamento` | enabled | public: empresa_id = public.user_empresa_id()<br>public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh', 'financeiro') | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh', 'financeiro') | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh', 'financeiro') | public: empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh', 'financeiro') |
| `folha_rubricas` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `folhas` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i | authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = folhas.colaborador_id AND c.empresa_id = public.get_auth_empresa_i |
| `folhas_pagamento` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `formacoes_academicas` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.c<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.colaborador_id AND public.pode_gerir_rh(c.emp<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.c<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.colaborador_id AND public.pode_gerir_rh(c.emp<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.c<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.colaborador_id AND public.pode_gerir_rh(c.emp<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id))<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.c<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = formacoes_academicas.colaborador_id AND public.pode_gerir_rh(c.emp<br>authenticated: public.sou_o_colaborador(colaborador_id) |
| `generos_documento` | enabled | authenticated: true | — | — | — |
| `geo_allowed_countries` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `geo_blocked_attempts` | enabled | authenticated: public.is_admin(auth.uid()) | — | — | — |
| `geo_blocking_config` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `govbr_auth_state` | enabled | service_role: true | service_role: true | service_role: true | service_role: true |
| `gratificacoes` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `grrf` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `guias_fgts` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `guias_fgts_digital` | enabled | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | — | — | — |
| `guias_inss` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `health_checks` | enabled | authenticated: true | — | — | — |
| `historico_alertas` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | — | — |
| `historico_calculos_folha` | enabled | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: empresa_id::uuid = ( current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id' )::uuid AND public |
| `historico_cargo` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) |
| `historico_contratos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `historico_ferias` | enabled | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.ferias f JOIN public.colaboradores c ON c.id = f.colaborador_id WHERE f.id = historico_ferias.f | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.ferias f JOIN public.colaboradores c ON c.id = f.colaborador_id WHERE f.id = historico_ferias.f | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.ferias f JOIN public.colaboradores c ON c.id = f.colaborador_id WHERE f.id = historico_ferias.f | authenticated: ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))<br>authenticated: EXISTS ( SELECT 1 FROM public.ferias f JOIN public.colaboradores c ON c.id = f.colaborador_id WHERE f.id = historico_ferias.f |
| `historico_rescisoes` | enabled | authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `historico_salarial` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `holerite_distribuicoes` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.folhas_pagamento fp JOIN public.user_empresas ue ON ue.empresa_id = fp.empresa_id WHERE fp.id = | — | — | — |
| `holerites` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: public.sou_o_colaborador(colaborador_id) | public: auth.uid() IS NOT NULL<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) ) | public: auth.uid() IS NOT NULL<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) ) | public: auth.uid() IS NOT NULL<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: empresa_id = public.get_auth_empresa_id()<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) )<br>authenticated: EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id) ) |
| `homologacoes` | enabled | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() | authenticated: empresa_id = public.get_auth_empresa_id() |
| `homologacoes_rescisao` | enabled | public: desligamento_id IN ( SELECT id FROM public.desligamentos WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>public: (EXISTS ( SELECT 1 FROM ("public"."desligamentos" "d" JOIN "public"."user_empresas" "ue" ON (("d"."empresa_id" = "ue"."empresa_id")) | public: desligamento_id IN ( SELECT id FROM public.desligamentos WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>public: (EXISTS ( SELECT 1 FROM ("public"."desligamentos" "d" JOIN "public"."user_empresas" "ue" ON (("d"."empresa_id" = "ue"."empresa_id")) | public: desligamento_id IN ( SELECT id FROM public.desligamentos WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>public: (EXISTS ( SELECT 1 FROM ("public"."desligamentos" "d" JOIN "public"."user_empresas" "ue" ON (("d"."empresa_id" = "ue"."empresa_id")) | public: desligamento_id IN ( SELECT id FROM public.desligamentos WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>public: (EXISTS ( SELECT 1 FROM ("public"."desligamentos" "d" JOIN "public"."user_empresas" "ue" ON (("d"."empresa_id" = "ue"."empresa_id")) |
| `ia_provisoes_alertas` | enabled | authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | — | — | — |
| `idempotency_keys` | enabled | service_role: true | service_role: true | service_role: true | service_role: true |
| `identidades_genero` | enabled | public: ("auth"."role"() = 'authenticated'::"text") | — | — | — |
| `inscricoes_cursos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `integracao_logs` | enabled | public: auth.role() = 'authenticated'<br>authenticated: public.is_admin(auth.uid())<br>authenticated: public.is_admin(auth.uid())<br>authenticated: public.is_admin(auth.uid()) | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `integracoes` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `ip_whitelist` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `itens_folha` | enabled | public: (EXISTS ( SELECT 1 FROM "public"."folhas_pagamento" "f" WHERE (("f"."id" = "itens_folha"."folha_id") AND ("f"."empresa_id" IN ( SELE | public: (EXISTS ( SELECT 1 FROM "public"."folhas_pagamento" "f" WHERE (("f"."id" = "itens_folha"."folha_id") AND ("f"."empresa_id" IN ( SELE | public: (EXISTS ( SELECT 1 FROM "public"."folhas_pagamento" "f" WHERE (("f"."id" = "itens_folha"."folha_id") AND ("f"."empresa_id" IN ( SELE | public: (EXISTS ( SELECT 1 FROM "public"."folhas_pagamento" "f" WHERE (("f"."id" = "itens_folha"."folha_id") AND ("f"."empresa_id" IN ( SELE |
| `jornadas` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() | public: auth.uid() IS NOT NULL<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id = public.get_auth_empresa_id() |
| `jornadas_horarios` | enabled | authenticated: jornada_id IN ( SELECT id FROM public.jornadas WHERE empresa_id = public.get_auth_empresa_id() ) | authenticated: jornada_id IN ( SELECT id FROM public.jornadas WHERE empresa_id = public.get_auth_empresa_id() ) | authenticated: jornada_id IN ( SELECT id FROM public.jornadas WHERE empresa_id = public.get_auth_empresa_id() ) | authenticated: jornada_id IN ( SELECT id FROM public.jornadas WHERE empresa_id = public.get_auth_empresa_id() ) |
| `lancamentos_contabeis` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: public.pertence_a_empresa(empresa_id) | — | — | — |
| `lancamentos_folha` | enabled | authenticated: holerite_id IN ( SELECT h.id FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE c.empresa_i<br>authenticated: EXISTS (SELECT 1 FROM public.holerites h WHERE h.id = lancamentos_folha.holerite_id AND public.sou_o_colaborador(h.colaborado<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.folhas_pagamento f ON f.id = h.folha_id WHERE h.id = lancamentos_folha.<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h WHERE h.id = lancamentos_folha.holerite_id AND public.sou_o_colaborador(h.colaborad | authenticated: holerite_id IN ( SELECT h.id FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE c.empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.folhas_pagamento f ON f.id = h.folha_id WHERE h.id = lancamentos_folha.<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol | authenticated: holerite_id IN ( SELECT h.id FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE c.empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.folhas_pagamento f ON f.id = h.folha_id WHERE h.id = lancamentos_folha.<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol | authenticated: holerite_id IN ( SELECT h.id FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE c.empresa_i<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.folhas_pagamento f ON f.id = h.folha_id WHERE h.id = lancamentos_folha.<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol<br>authenticated: EXISTS ( SELECT 1 FROM public.holerites h JOIN public.colaboradores c ON c.id = h.colaborador_id WHERE h.id = lancamentos_fol |
| `lgpd_consentimentos` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) ) |
| `lgpd_fila_limpeza` | enabled | authenticated: auth.jwt() ->> 'role' = 'service_role' | authenticated: auth.jwt() ->> 'role' = 'service_role' | authenticated: auth.jwt() ->> 'role' = 'service_role' | authenticated: auth.jwt() ->> 'role' = 'service_role' |
| `lgpd_politicas_retencao` | enabled | public: ("auth"."role"() = 'authenticated'::"text") | — | — | — |
| `lgpd_purge_log` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `lgpd_retencao_logs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `lgpd_solicitacoes` | enabled | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: colaborador_id IN ( SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresa_ids()) )<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `linhas_transporte` | enabled | authenticated: vale_transporte_id IN (SELECT id FROM public.vales_transporte WHERE colaborador_id IN (SELECT id FROM public.colaboradores WH<br>authenticated: vale_transporte_id IN ( SELECT vt.id FROM public.vales_transporte vt JOIN public.colaboradores c ON c.id = vt.colaborador_id  | authenticated: vale_transporte_id IN (SELECT id FROM public.vales_transporte WHERE colaborador_id IN (SELECT id FROM public.colaboradores WH<br>authenticated: vale_transporte_id IN ( SELECT vt.id FROM public.vales_transporte vt JOIN public.colaboradores c ON c.id = vt.colaborador_id  | authenticated: vale_transporte_id IN (SELECT id FROM public.vales_transporte WHERE colaborador_id IN (SELECT id FROM public.colaboradores WH<br>authenticated: vale_transporte_id IN ( SELECT vt.id FROM public.vales_transporte vt JOIN public.colaboradores c ON c.id = vt.colaborador_id  | authenticated: vale_transporte_id IN (SELECT id FROM public.vales_transporte WHERE colaborador_id IN (SELECT id FROM public.colaboradores WH<br>authenticated: vale_transporte_id IN ( SELECT vt.id FROM public.vales_transporte vt JOIN public.colaboradores c ON c.id = vt.colaborador_id  |
| `locais_trabalho` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `log_envio_relatorios` | enabled | authenticated: EXISTS (SELECT 1 FROM public.relatorios_agendados ra WHERE ra.id = log_envio_relatorios.agendamento_id AND ra.empresa_id IN ( | — | — | — |
| `login_attempts` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: auth.uid() IS NOT NULL | — | — |
| `login_lockouts` | enabled | service_role: true | service_role: true | service_role: true | service_role: true |
| `login_rate_limits` | enabled | public: "public"."is_admin"("auth"."uid"()) | public: "public"."is_admin"("auth"."uid"()) | public: "public"."is_admin"("auth"."uid"()) | public: "public"."is_admin"("auth"."uid"()) |
| `logs_integracoes` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | — | — |
| `logs_sincronizacao` | enabled | — | — | — | — |
| `logs_sistema` | enabled | authenticated: public.is_admin(auth.uid())<br>public: (EXISTS ( SELECT 1 FROM "auth"."users" WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text")<br>public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = 'admin'::"public"."app_ro | authenticated: empresa_id = ( current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id' )::uuid OR empresa_id IS<br>public: ("auth"."uid"() = "user_id") | — | — |
| `lotacoes` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.rls_tenant_or_admin(empresa_id) |
| `medidas_ciencia_tokens` | enabled | — | — | — | — |
| `medidas_disciplinares` | enabled | authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id)<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.sou_o_colaborador(colaborador_id) | authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id)<br>authenticated: public.pode_gerir_rh(empresa_id) |
| `medidas_disciplinares_anexos` | enabled | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ | public: ("auth"."uid"() IN ( SELECT "user_roles"."user_id" FROM "public"."user_roles" WHERE ("user_roles"."role" = ANY (ARRAY['admin'::"publ |
| `medidas_disciplinares_contestacao_anexos` | enabled | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) | — | authenticated: empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()) |
| `medidas_disciplinares_integracao` | enabled | — | — | — | — |
| `medidas_disciplinares_workflow_log` | enabled | authenticated: public.user_belongs_to_empresa(auth.uid(), empresa_id) | — | — | — |
| `metas_okrs` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `metricas_processamento` | enabled | public: "public"."is_admin"("auth"."uid"())<br>public: (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") | public: (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") | public: (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") | public: (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") |
| `migration_naming_audit` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `motivos_afastamento` | enabled | authenticated: true | — | — | — |
| `mv_refresh_log` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `nacionalidades` | enabled | public: ("auth"."role"() = 'authenticated'::"text") | — | — | — |
| `notificacoes` | enabled | public: usuario_id = auth.uid() OR empresa_id = public.user_empresa_id()<br>authenticated: public.is_admin(auth.uid()) OR user_id = auth.uid() OR ( empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid()<br>authenticated: user_id = auth.uid() | authenticated: public.is_admin(auth.uid()) OR user_id = auth.uid() OR ( empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid() | public: usuario_id = auth.uid()<br>authenticated: public.is_admin(auth.uid()) OR user_id = auth.uid() OR ( empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid()<br>authenticated: user_id = auth.uid() | authenticated: public.is_admin(auth.uid()) OR user_id = auth.uid() OR ( empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid()<br>public: auth.uid() = user_id AND lida = true |
| `notificacoes_admissao` | enabled | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) |
| `notificacoes_templates` | enabled | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | public: auth.role() = 'authenticated' | — |
| `onboarding_colaborador` | enabled | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())))<br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())))<br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())))<br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  | authenticated: colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid())))<br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  |
| `onboarding_documentos_obrigatorios` | enabled | — | — | — | — |
| `onboarding_kits` | enabled | — | — | — | — |
| `onboarding_tarefas` | enabled | authenticated: onboarding_id IN (SELECT oc.id FROM public.onboarding_colaborador oc JOIN public.colaboradores c ON c.id = oc.colaborador_id <br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  | authenticated: onboarding_id IN (SELECT oc.id FROM public.onboarding_colaborador oc JOIN public.colaboradores c ON c.id = oc.colaborador_id <br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  | authenticated: onboarding_id IN (SELECT oc.id FROM public.onboarding_colaborador oc JOIN public.colaboradores c ON c.id = oc.colaborador_id <br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  | authenticated: onboarding_id IN (SELECT oc.id FROM public.onboarding_colaborador oc JOIN public.colaboradores c ON c.id = oc.colaborador_id <br>public: (("empresa_id" = "auth"."uid"()) OR (( SELECT "c"."empresa_id" FROM "public"."colaboradores" "c" WHERE ("c"."id" = "auth"."uid"()))  |
| `onboarding_template_tarefas` | enabled | authenticated: template_id IN (SELECT id FROM public.onboarding_templates WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: template_id IN (SELECT id FROM public.onboarding_templates WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: template_id IN (SELECT id FROM public.onboarding_templates WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) | authenticated: template_id IN (SELECT id FROM public.onboarding_templates WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))) |
| `onboarding_templates` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `paises` | enabled | public: ("auth"."role"() = 'authenticated'::"text") | — | — | — |
| `parametros_fiscais` | enabled | — | — | — | — |
| `parametros_sistema` | enabled | authenticated: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id)<br>authenticated: public.rls_tenant_or_admin(empresa_id)<br>authenticated: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id) | authenticated: public.rls_tenant_or_admin(empresa_id) |
| `password_history` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `password_policies` | enabled | authenticated: true<br>authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `password_reset_config` | enabled | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `password_reset_requests` | enabled | authenticated: public.is_admin(auth.uid())<br>authenticated: user_id = auth.uid() | authenticated: public.is_admin(auth.uid())<br>authenticated: user_id = auth.uid() | authenticated: public.is_admin(auth.uid()) | authenticated: public.is_admin(auth.uid()) |
| `pcs_avaliacoes_cargo` | enabled | — | — | — | — |
| `pcs_fatores` | enabled | — | — | — | — |
| `pcs_grades` | enabled | — | — | — | — |
| `pcs_pesquisa_salarial` | enabled | authenticated: public.is_admin(auth.uid()) OR empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id) | authenticated: public.pode_gerir_rh(empresa_id) |
| `pcs_planos` | enabled | authenticated: deleted_at IS NULL AND ( public.is_admin(auth.uid()) OR empresa_id IN (SELECT public.get_user_empresas(auth.uid())) ) | authenticated: deleted_at IS NULL AND public.pode_gerir_rh(empresa_id) | authenticated: deleted_at IS NULL AND public.pode_gerir_rh(empresa_id) | authenticated: public.is_admin(auth.uid()) |
| `pdi_plano_desenvolvimento` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid()))<br>public: empresa_id IS NULL OR public.pertence_a_empresa(empresa_id) |
| `pdis` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| `pendencias` | enabled | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) | authenticated: empresa_id IN (SELECT public.get_user_empresas(auth.uid())) |
| … +160 linhas — lista completa em `context.json` | | | | | |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo.

## Onde o RLS é IGNORADO (service_role) — 278 arquivo(s)

- `e2e/cleanup/seed-cleanup.spec.ts`
- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/audit-edge-authz.mjs`
- `scripts/audit-rls-least-privilege.mjs`
- `scripts/audit-rls-pii.mjs`
- `scripts/audit-rls-tenant-open.mjs`
- `scripts/e2e/ensure-fixtures.mjs`
- `scripts/e2e/seed.mjs`
- `scripts/e2e/verify-seed.mjs`
- `scripts/inventario/gerar-banco.mjs`
- `scripts/provision-e2e-users.mjs`
- `scripts/regras_negocio/generate.py`
- `scripts/secfix_correcao2_rpcs.sql`
- `scripts/secfix_correcao3_pgsodium.sql`
- `scripts/simulacao/verify_bridge_contract.cjs`
- `scripts/supabase_snapshot/snapshot.py`
- `src/hooks/__tests__/useBruteForceProtection.test.ts`
- `src/hooks/useBruteForceProtection.ts`
- `src/services/__tests__/rescisaoService.test.ts`
- `src/services/esocialService.ts`
- `src/services/rescisaoService.ts`
- `src/tests/rpc-permissions.test.ts`
- `supabase/baseline/20260831_canonical/canonical_auth_schema.sql`
- `supabase/baseline/20260831_canonical/canonical_storage_schema.sql`
- `supabase/functions/OCR/index.ts`
- `supabase/functions/_shared/aal2.test.ts`
- `supabase/functions/_shared/authz.ts`
- `supabase/functions/_shared/monitor.ts`
- `supabase/functions/_shared/ssrf-guard.ts`
- `supabase/functions/adiantamento-salarial/index.ts`
- `supabase/functions/admissao-publica/index.ts`
- `supabase/functions/alertas-dp/index.ts`
- `supabase/functions/alertas-preditivos/index.ts`
- `supabase/functions/assinaturaDigital/index.ts`
- `supabase/functions/assistente-ia/index.ts`
- `supabase/functions/auditoria/index.ts`
- `supabase/functions/auth-gov-br/index.ts`
- `supabase/functions/auth-login/index.ts`
- `supabase/functions/backup-automatico/index.ts`
- `supabase/functions/backup/index.ts`
- `supabase/functions/cache/index.ts`
- `supabase/functions/calcular-13-salario/index.ts`
- `supabase/functions/calcular-ferias/index.ts`
- `supabase/functions/calcular-folha/index.ts`
- `supabase/functions/calcular-provisoes/index.ts`
- `supabase/functions/calcular-rescisao/index.ts`
- `supabase/functions/cnab-remessa/index.ts`
- `supabase/functions/consultarCEP/index.ts`
- `supabase/functions/consultarCNPJ/index.ts`
- `supabase/functions/criptografia/index.ts`
- `supabase/functions/dctfweb/index.ts`
- `supabase/functions/distribuir-holerites/index.ts`
- `supabase/functions/emprestimo-consignado/index.ts`
- `supabase/functions/enviar-email-admissao/index.ts`
- `supabase/functions/enviar-esocial/index.ts`
- `supabase/functions/enviar-relatorio/index.ts`
- `supabase/functions/exportacao/index.ts`
- `supabase/functions/external-db-bridge/access.ts`
- `supabase/functions/external-db-bridge/index.ts`
- `supabase/functions/external-db-bridge/validation.test.ts`
- `supabase/functions/external-db-bridge/validation.ts`
- `supabase/functions/fechar-folha/index.ts`
- `supabase/functions/fgts-digital/index.ts`
- `supabase/functions/folha-metrics/index.ts`
- `supabase/functions/gerar-aej/index.ts`
- `supabase/functions/gerar-afd/index.ts`
- `supabase/functions/gerar-contrato-pdf/index.ts`
- `supabase/functions/gerar-guias/index.ts`
- `supabase/functions/gerar-holerite/index.ts`
- `supabase/functions/gerar-ltcat-os/index.ts`
- `supabase/functions/gerar-medida-disciplinar-pdf/index.ts`
- `supabase/functions/gerar-pgr/index.ts`
- `supabase/functions/healthcheck/index.ts`
- `supabase/functions/importacao/index.ts`
- `supabase/functions/integracao/index.ts`
- `supabase/functions/limpeza/index.ts`
- `supabase/functions/metricas/index.ts`
- `supabase/functions/metrics/index.ts`
- `supabase/functions/notificacao/index.ts`
- `supabase/functions/pagar-desligamento/index.ts`
- `supabase/functions/parse-afdt/index.ts`
- `supabase/functions/pix-lote/index.ts`
- `supabase/functions/process-document-ocr/index.ts`
- `supabase/functions/processar-agendamentos/index.ts`
- `supabase/functions/processar-ponto-offline/index.ts`
- `supabase/functions/processar-ponto/index.ts`
- `supabase/functions/rateLimit/index.ts`
- `supabase/functions/reabrir-folha/index.ts`
- `supabase/functions/relatorio/index.ts`
- `supabase/functions/sincronizar-bitrix/index.ts`
- `supabase/functions/tabelas-dominio/index.ts`
- `supabase/functions/upload-certificado/index.ts`
- `supabase/functions/validar-biometria/index.ts`
- `supabase/functions/warmup/index.ts`
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/migrations/20260509173546_411fcf1e-69c1-4ac2-9387-383ecdff070d.sql`
- `supabase/migrations/20260522142107_56c6019a-7267-4762-abea-bc88fb67baac.sql`
- `supabase/migrations/20260522151147_134aa53d-d186-4e54-9baf-19e0ee352af6.sql`
- `supabase/migrations/20260522151224_9c98ea64-2049-4488-bc9c-cb33a697e4a5.sql`
- `supabase/migrations/20260523154556_61536354-b74b-4775-a1f1-ada966620321.sql`
- `supabase/migrations/20260527125800_f2cc5838-a6f5-41c0-84d7-2d5fb3f6cf37.sql`
- `supabase/migrations/20260619150614_35447ebf-a55a-49a4-a1c3-37040dd273b5.sql`
- `supabase/migrations/20260627190530_3d39cb13-77fc-4e76-9323-a41bdafe0068.sql`
- `supabase/migrations/20260711145433_9ec8a43a-f6a7-47f9-a876-6c6788f8701d.sql`
- `supabase/migrations/20260711150410_1308b423-3072-44f6-8780-6261c58dd040.sql`
- `supabase/migrations/20260711150513_069a9179-c986-4be9-bfdc-e3bbbf1d3c70.sql`
- `supabase/migrations/20260711152748_c98d7ea6-3c0c-48e5-92e2-ca19ac9f63f4.sql`
- `supabase/migrations/20260711153603_cff03a04-94c1-410e-862c-b8929436ad6a.sql`
- `supabase/migrations/20260711175817_6126e8a8-8d94-4919-991b-7fd7b4d58655.sql`
- `supabase/migrations/20260711182246_c4e2ce56-93c3-45f7-a1c3-41d8cfa6436e.sql`
- `supabase/migrations/20260712184140_0536e2cb-6844-417e-86f6-23fe7e74656a.sql`
- `supabase/migrations/20260712193819_94a9da9f-81b4-4737-867a-bc078939a53e.sql`
- `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql`
- `supabase/migrations/20260712203121_8562a409-33b5-4785-ace8-f055d7993a92.sql`
- `supabase/migrations/20260712205624_271b19b2-c825-4331-a42e-ee8ed3c9ed37.sql`
- `supabase/migrations/20260712211719_e90f14f4-f5a0-4be9-b2f8-64cb6c4cec8c.sql`
- `supabase/migrations/20260712211818_d725dfe0-bd03-404e-9fdf-f24b250680b2.sql`
- `supabase/migrations/20260712212039_d00bd73d-5336-4dc3-add0-12032006ed54.sql`
- `supabase/migrations/20260712212218_c692263b-72aa-41b9-a72c-ee07698c5723.sql`
- `supabase/migrations/20260712212325_3e455108-6227-4b98-92b1-86f54bcda510.sql`
- `supabase/migrations/20260712212615_55ae5f57-0022-4662-9e43-765fc46fa039.sql`
- `supabase/migrations/20260712212733_63fa24a8-821c-43f5-bb44-b58a0bd81da2.sql`
- `supabase/migrations/20260712212841_b1877f49-57bf-4aec-9c48-bc33d212289d.sql`
- `supabase/migrations/20260712213138_d047bbd8-ce51-4489-ba34-cca9843e27a6.sql`
- `supabase/migrations/20260712213253_6b730cf1-b93d-4117-8b98-7ff65a2820aa.sql`
- `supabase/migrations/20260712213407_20d37218-3f4b-4337-a867-a6b356d472c2.sql`
- `supabase/migrations/20260712213908_2a68d8c6-5402-4526-b55c-9b3f89124bbb.sql`
- `supabase/migrations/20260712214014_5ded020d-3162-4157-ba2e-724b53d8392b.sql`
- `supabase/migrations/20260712214929_4971f364-3f69-48cd-9150-a55524b1025d.sql`
- `supabase/migrations/20260712215539_349ae8a8-7ed9-41a5-b06c-ea4b8f35c7b5.sql`
- `supabase/migrations/20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql`
- `supabase/migrations/20260712215942_0c45a861-8424-4178-936a-cae1ebe129b2.sql`
- `supabase/migrations/20260712220248_803bf461-91a3-4d53-abd6-41fb5b5f0892.sql`
- `supabase/migrations/20260712222252_1d964bbd-0cff-41f7-9bcb-496036476e63.sql`
- `supabase/migrations/20260712222525_efdf4704-8024-4e4a-8fd4-414856e9b4fe.sql`
- `supabase/migrations/20260712222818_0ca2a3f1-2171-4072-bfce-14a5714f35e9.sql`
- `supabase/migrations/20260712223051_0c34a43a-072a-4c06-8ff7-f2ac782d9041.sql`
- `supabase/migrations/20260712232544_936c8e57-5bce-4539-80fa-e174ecf3ac9b.sql`
- `supabase/migrations/20260713105424_c760e8ed-e7ec-4790-ad43-ceadf29673fc.sql`
- `supabase/migrations/20260713105603_64ab5dcc-be95-4d7c-9c96-860adf72e2da.sql`
- `supabase/migrations/20260713124616_7ca546cf-4cfa-4fc5-b42e-3a06d1367387.sql`
- `supabase/migrations/20260713124728_fc2bfdf0-5cb2-4318-b4d4-e4b1130bb95b.sql`
- `supabase/migrations/20260713124926_a1152a5e-9744-4462-9fc2-f423c57445bb.sql`
- `supabase/migrations/20260713125122_10586a25-75f3-4d51-a949-e4a59fded62e.sql`
- `supabase/migrations/20260715151049_efa5e879-fa50-4804-8056-d6c860761e86.sql`
- `supabase/migrations/20260715154911_30dca9dd-27bf-46ba-a1c7-e1cb3923bf92.sql`
- `supabase/migrations/20260715173728_392ca7e2-2bbc-474b-8158-ccbc730c890b.sql`
- `supabase/migrations/20260716175930_c7892081-2003-4c95-a887-57976b9e54ef.sql`
- `supabase/migrations/20260717133719_0ecd2109-adf2-4d73-9e66-51e9608755e9.sql`
- … +128 (lista completa em `context.json`)

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `_admissao_token_row`
- `_assert`
- `_is_admin_bypass`
- `_purge_audit_log_internal`
- `_safe_audit_trigger`
- `_scan_status_anomalies_global`
- `_set_uid`
- `admin_associar_usuario_empresa`
- `admin_definir_pin_quiosque`
- `admin_list_profiles`
- `admin_list_security_definer_rpcs`
- `admin_list_user_roles`
- `admin_set_user_role`
- `admissao_assinar_contrato`
- `admissao_marcar_documentos`
- `admissao_registrar_documento`
- `admissao_salvar_dados`
- `anonimizar_dados_pessoais`
- `aplicar_medida_folha_ponto`
- `aprovar_despesa`
- `assinar_aviso_ferias`
- `assinar_desligamento`
- `assinar_espelho_ponto`
- `associar_pis_colaborador_afdt`
- `audit_delete_operation`
- `auto_vincular_admins_empresa`
- `calcular_prazo_cat`
- `candidatura_na_minha_empresa`
- `check_account_lockout`
- `check_brute_force`
- `check_ciencia_rate_limit`
- `check_idempotency_anomalies`
- `check_login_lock`
- `check_processamento_timeout`
- `check_rate_limit`
- `claim_admission_esocial_event`
- `claim_due_report_schedules`
- `clean_idle_connections`
- `cleanup_ciencia_rate_limits`
- `cleanup_expired_login_attempts`
- `cleanup_expired_rate_limit_logs`
- `cleanup_expired_rate_limits`
- `cleanup_old_login_attempts`
- `clinicas_proximas`
- `consumir_pendencias_medida_no_holerite`
- `contrato_assinar_por_token`
- `contrato_consultar_por_token`
- `contrato_estender_expiracao`
- `contrato_gerar_token_assinatura`
- `contrato_lembretes_pendentes`
- `contrato_montar_variaveis`
- `contrato_preview_url_por_token`
- `contrato_resolver_template`
- `contrato_revogar_token`
- `contrato_token_evento_registrar`
- `contrato_verificar_autenticidade`
- `contrato_verificar_autenticidade_v2`
- `contratos_alertar_vencimentos`
- `contratos_enviar_lembretes_assinatura`
- `create_entity_version`
- `criar_batida_da_divergencia_afdt`
- `decrypt_dados_bancarios`
- `decrypt_dados_bancarios_tenant`
- `decrypt_pii`
- `detectar_fraude_ponto`
- `documento_listar`
- `documento_registrar`
- `documentos_sync_empresa_id`
- `dp_audit_log_immutable`
- `dp_audit_log_prevent_future`
- `dp_catalog_pii`
- `dp_check_log_rotation`
- `dp_check_rls_index_coverage`
- `dp_connection_health`
- `dp_create_next_partition`
- `dp_decrypt_pii`
- `dp_encrypt_pii`
- `dp_has_role`
- `dp_hash_pii`
- `dp_missing_indexes`
- `dp_post_migration_check`
- `dp_pre_deploy_gate`
- `dp_require_role`
- `dp_run_retention`
- `dp_track_pii_access`
- `edge_rate_limit_check`
- `empresa_do_colaborador`
- `encrypt_contas_bancarias_fields`
- `encrypt_dados_bancarios`
- `encrypt_pii`
- `encrypt_pix_itens_fields`
- `enfileirar_esocial_medida_disciplinar`
- `enforce_afastamento_hash`
- `enforce_aso_hash`
- `enforce_batida_ponto_hash`
- `enforce_cat_hash`
- `enforce_cnab_remessa_hash`
- `enforce_desligamento_hash`
- `enforce_documento_assinatura_hash`
- `enforce_epi_entrega_hash`
- `enforce_esocial_evento_hash`
- `enforce_ferias_hash`
- `enforce_folha_pagamento_hash`
- `enforce_holerite_signed_hash`
- `enforce_log_retention`
- `enforce_medida_disciplinar_hash`
- `enforce_report_schedule_authorship`
- `finish_report_schedule_claim`
- `fn_alert_pii_access_anomaly`
- `fn_alert_severe_disciplinary_measure`
- `fn_atualizar_status_ferias_diario`
- `fn_audit_biometric_failure`
- `fn_auto_generate_training_certificate`
- `fn_candidatura_set_empresa`
- `fn_colaborador_sync_cargo_texto`
- `fn_consolidar_batidas`
- `fn_create_default_onboarding_tasks`
- `fn_documentos_afastamento_validacao`
- `fn_enqueue_notification`
- `fn_faltas_sync_faltas_periodo`
- `fn_link_gov_br_account`
- `fn_pensoes_set_empresa`
- `fn_recalcular_dobra_e_alertas`
- `fn_sync_holerite_from_folha_item`
- `fn_trigger_whatsapp_on_event`
- `fn_update_admissao_checklist`
- `fn_update_candidatura_history`
- `fn_validar_medida_disciplinar_clt`
- `fn_workflow_admissao_auto`
- `folha_conflict_stats`
- `fwd_to_audit_unified`
- `garantir_rubrica_suspensao`
- `gerar_alertas_preditivos_ia`
- `gerar_canonical_espelho_ponto`
- `gerar_qr_extintor`
- `gerar_rubricas_ferias`
- `get_admissao_por_token`
- `get_audit_trail`
- `get_audit_trail_by_entity`
- `get_audit_trail_by_user`
- `get_colaborador_banco_horas`
- `get_company_rh_recipient_emails`
- `get_cron_jobs_health`
- `get_default_filter`
- `get_dlq_stats`
- `get_empresa_admin_ids`
- `get_idempotency_health`
- `get_my_permissions`
- `get_my_user_empresas`
- `get_query_telemetry`
- `get_security_alerts_summary`
- `get_user_default_empresa`
- `get_user_empresa_ids`
- `get_user_empresas`
- `get_user_roles`
- `get_user_scope_empresas`
- `get_user_tenants`
- `handle_new_user`
- `handle_new_user_role`
- `has_role`
- `hash_pii`
- `is_admin`
- `is_country_allowed`
- `is_ip_blocked`
- `is_ip_whitelisted`
- `limpar_govbr_states_expirados`
- `listar_auditoria`
- `log_audit_change`
- `log_despesa_status_change`
- `log_esocial_transmission`
- `log_frontend_error`
- `maintenance_archive_old_audit`
- `maintenance_weekly_analyze`
- `medida_aprovar`
- `medida_arquivar`
- `medida_consultar_por_token`
- `medida_contestar`
- `medida_enviar_aprovacao`
- `medida_gerar_link_ciencia`
- `medida_registrar_ciencia_publica`
- `medida_rejeitar`
- `medida_responder_contestacao`
- `medida_verificar_ciencia_hash`
- `medidas_analytics_reincidencia`
- `mv_refresh_all`
- `next_cnab_sequencial`
- `notificar_divergencias_afdt`
- `notificar_ferias_pagamento_d5`
- `notificar_ferias_reconciliacao_sla_baixo`
- `pagar_desligamento`
- `pcs_enquadramento`
- `pcs_gerar_grades`
- `pcs_grades_mercado`
- `pcs_pode_gerir_plano`
- `pcs_pode_ver_plano`
- `pcs_simular_impacto`
- `pertence_a_empresa`
- `pode_gerir_pessoas`
- `pode_gerir_pessoas_para`
- `pode_gerir_rh`
- `pode_gerir_rh_para`
- `process_audit_log`
- `process_ferias_audit`
- `process_lgpd_cleanup_queue`
- `processar_ajuste_aprovado`
- `processar_auditoria_premiacao`
- `programacao_ferias_aprovar_gestor`
- `programacao_ferias_aprovar_rh`
- `programacao_ferias_converter`
- `programacao_ferias_mover`
- `programacao_ferias_rejeitar`
- `provisao_auditoria_set_empresa`
- `purgar_ferias_reconciliacao_logs_antigos`
- `purge_audit_log_old`
- `purge_expired_idempotency_keys`
- `purge_expired_security_data`
- `purge_old_lock_conflicts`
- `purge_old_records`
- `purge_pii_access_logs`
- `purge_rate_limits`
- `reconciliar_afdt`
- `reconciliar_ferias_folha_batch`
- `record_backup_run`
- `record_failed_login`
- `record_login_attempt`
- `record_pii_access`
- `refresh_dashboard_mvs`
- `refresh_dashboard_views`
- `refresh_passivo_trabalhista`
- `refresh_telemetry_views`
- `registrar_auditoria`
- `registrar_auditoria_contratual`
- `registrar_auditoria_ponto`
- `registrar_batida_ponto`
- `registrar_comunicado_ferias_coletivas`
- `registrar_pagamento_ferias`
- `rejeitar_despesa`
- `replace_monthly_provisions`
- `report_destination_is_allowed`
- `reset_account_lockout`
- `reset_login_attempts`
- `resolve_security_alert`
- `resolver_divergencia_afdt`
- `revogar_espelho_ponto`
- `rls_auto_enable`
- `rls_tenant_or_admin`
- `run_lgpd_purge`
- `seal_enforce`
- `search_audit_unified`
- `sec_audit_policies`
- `sec_audit_policies_scan`
- `sec_policy_regressions_purge`
- `sec_verify_seals`
- `sec_verify_seals_admin`
- `sec_verify_seals_scan`
- `set_own_default_empresa`
- `solicitar_adiantamento_13_ferias`
- `sou_o_colaborador`
- `sst_cat_dashboard`
- `sst_dashboard_sla`
- `sst_extintores_dashboard`
- `sst_regimento_assinar`
- `sst_regimento_dashboard`
- `sst_regimento_notificar_pendentes`
- `sst_regimento_pendentes_lista`
- `sst_regimento_publicar`
- `storage_user_is_path_colaborador`
- `sugerir_proxima_medida`
- `trg_audit_status_change`
- `trg_contab_msg_bump_thread`
- `trg_contrato_token_auditar`
- `trg_detect_status_anomaly`
- `trg_ferias_gerar_rubricas`
- `trg_ferias_reconciliacao_alert`
- `trg_medida_aplicada_integrar`
- `trg_medida_contestacao_notify`
- `trg_medida_contestacao_notify_after`
- `trg_medida_esocial_on_aplicada`
- `uid`
- `update_extintor_status_vencimento`
- `user_belongs_to_empresa`
- `user_can_manage_tenant_storage`
- `user_empresa_id`
- `validar_contrato_clt`
- `validate_ponto_compliance`
- `verificar_espelho_ponto`
- `verificar_pin_quiosque`
- `vincular_colaborador_ao_usuario`

## Edge functions públicas (sem JWT — qualquer um chama)

- `auth-login`
- `auth-gov-br`
- `healthcheck`
- `metrics`
- `admissao-publica`
- `webhook`

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| / | ProtectedRoute |  | `scripts/tests/inventario-rotas.test.mjs` |
| / | ProtectedRoute |  | `src/App.tsx` |
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |
| /ponto/kiosk | ProtectedRoute |  | `src/App.tsx` |
| admin/diagnostico-migracao | AdminRoute |  | `src/App.tsx` |
| admin/idempotencia | AdminRoute |  | `src/App.tsx` |
| admin/operacao | AdminRoute |  | `src/App.tsx` |
| admin/ponto/divergencias | AdminRoute |  | `src/App.tsx` |
| admin/security | AdminRoute |  | `src/App.tsx` |
| admin/sst/agendamentos | AdminRoute |  | `src/App.tsx` |
| admin/sst/aso | AdminRoute |  | `src/App.tsx` |
| admin/sst/cat | AdminRoute |  | `src/App.tsx` |
| admin/sst/clinicas | AdminRoute |  | `src/App.tsx` |
| admin/sst/dashboard | AdminRoute |  | `src/App.tsx` |
| admin/sst/epis | AdminRoute |  | `src/App.tsx` |
| admin/sst/extintores | AdminRoute |  | `src/App.tsx` |
| admin/sst/regimento | AdminRoute |  | `src/App.tsx` |
| admin/telemetria | AdminRoute |  | `src/App.tsx` |
| auditoria | AdminRoute |  | `src/App.tsx` |
| backup | AdminRoute |  | `src/App.tsx` |
| configuracoes | AdminRoute |  | `src/App.tsx` |
| configuracoes/contratos-templates | AdminRoute |  | `src/App.tsx` |
| contratos-gerados | AdminRoute |  | `src/App.tsx` |
| controle-acesso | AdminRoute |  | `src/App.tsx` |
| lgpd | AdminRoute |  | `src/App.tsx` |
| seguranca | AdminRoute |  | `src/App.tsx` |
| usuarios | AdminRoute |  | `scripts/tests/inventario-rotas.test.mjs` |
| usuarios | AdminRoute |  | `src/App.tsx` |

Guards usados: AdminRoute, Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | anon | execute | `log_frontend_error`, `get_admissao_por_token` |
| grant | anon | select | `storage.objects` |
| grant | anon, authenticated | execute | `check_login_lock`, `record_failed_login`, `reset_login_attempts`, `check_brute_force`, `check_rate_limit`, `check_login_lock`, `record_failed_login`, `get_admissao_por_token`, `contrato_consultar_por_token`, `contrato_assinar_por_token`, `contrato_preview_url_por_token`, `contrato_verificar_autenticidade`, `contrato_verificar_autenticidade_v2`, `contrato_verificar_autenticidade_v2`, `contrato_verificar_autenticidade` … +9 |
| grant | anon, authenticated, service_role | execute | `check_login_lock`, `record_failed_login`, `contrato_assinar_por_token`, `medida_consultar_por_token`, `medida_registrar_ciencia_publica`, `contrato_assinar_por_token`, `contrato_assinar_por_token`, `admissao_assinar_contrato`, `admissao_marcar_documentos`, `admissao_registrar_documento`, `admissao_salvar_dados`, `check_brute_force`, `check_rate_limit`, `contrato_consultar_por_token`, `contrato_preview_url_por_token` … +9 |
| grant | anon, authenticated, service_role | select | `storage.buckets` |
| grant | authenticated | execute | `has_role`, `is_admin`, `get_user_roles`, `get_user_default_empresa`, `get_user_empresas`, `user_belongs_to_empresa`, `anonimizar_dados_pessoais`, `fn_link_gov_br_account`, `processar_ajuste_aprovado`, `get_colaborador_banco_horas`, `get_user_empresas`, `get_auth_empresa_id`, `user_belongs_to_empresa`, `get_user_default_empresa`, `has_role` … +112 |
| grant | authenticated | select | `vw_folha_compliance`, `v_idempotency_metrics`, `v_slow_queries_top50`, `audit_log_unified`, `audit_log_unified_archive`, `holerite_distribuicoes`, `v_audit_legacy`, `v_system_health`, `v_ferias_alerta_pagamento_d2`, `v_ferias_adiant13_elegibilidade`, `v_ferias_folha_reconciliacao`, `ferias_reconciliacao_logs`, `v_contratos_vencendo`, `v_contratos_assinatura_kpi`, `v_contratos_tokens_pendentes` … +20 |
| grant | authenticated | select, insert | `logs_sistema`, `folha_lock_conflicts`, `despesas_aprovacoes_log`, `aej_geracoes`, `ponto_espelhos_revogacoes`, `epis_fichas_assinaturas`, `sst_regimento_assinaturas`, `medidas_disciplinares_workflow_log`, `audit_log`, `folha_auditoria`, `afd_geracoes` |
| grant | authenticated | select, insert, update | `login_lockouts`, `contrato_assinatura_tokens` |
| grant | authenticated | select, insert, update, delete | `contabilidade_contatos`, `contabilidade_threads`, `contabilidade_mensagens`, `afdt_importacoes`, `afdt_registros_raw`, `afdt_divergencias`, `clinicas_partners`, `clinicas_partners_servicos`, `clinicas_partners_horarios`, `exames_agendamentos`, `sst_ordens_servico`, `sst_ltcat_laudos`, `epis_fichas`, `epis_fichas_itens`, `sst_extintores` … +20 |
| grant | authenticated, anon | execute | `distancia_haversine`, `user_empresa_id`, `get_auth_empresa_id` |
| grant | authenticated, service_role | execute | `get_cron_jobs_health`, `get_security_alerts_summary`, `resolve_security_alert`, `search_audit_unified`, `purge_audit_log_old`, `resolve_security_alert`, `sst_regimento_notificar_pendentes`, `calcular_dias_direito_ferias`, `validar_split_ferias`, `eh_dia_valido_inicio_ferias`, `contrato_token_evento_registrar`, `pertence_a_empresa`, `sec_audit_policies`, `registrar_auditoria`, `listar_auditoria` … +40 |
| grant | authenticated, service_role | select | `v_audit_trail`, `mv_status_change_daily`, `mv_anomalies_hourly`, `v_ferias_alertas_criticos`, `v_pii_access_suspeitos`, `vw_folha_compliance` |
| grant | authenticated, service_role | select, insert, update, delete | `storage.objects` |
| grant | ci_auditor | execute | `extensions` |
| grant | ci_auditor | select | `cron.job` |
| grant | service_role | all | `logs_sistema`, `login_lockouts`, `idempotency_keys`, `folha_lock_conflicts`, `audit_log_unified`, `audit_log_unified_archive`, `rate_limits`, `rate_limit_logs`, `rate_limit_config`, `despesas_aprovacoes_log`, `contabilidade_contatos`, `contabilidade_threads`, `contabilidade_mensagens`, `holerite_distribuicoes`, `afdt_importacoes` … +53 |
| grant | service_role | execute | `detectar_fraude_ponto`, `check_brute_force`, `check_rate_limit`, `is_ip_blocked`, `is_ip_whitelisted`, `is_country_allowed`, `fn_link_gov_br_account`, `processar_ajuste_aprovado`, `purge_expired_idempotency_keys`, `check_idempotency_anomalies`, `enforce_folha_pagamento_hash`, `proibir_delete_folha_fechada`, `enforce_holerite_signed_hash`, `enforce_esocial_evento_hash`, `enforce_cnab_remessa_hash` … +99 |
| grant | service_role | select | `vw_folha_compliance`, `v_idempotency_metrics`, `health_checks`, `mv_folha_summary`, `health_checks` |
| grant | service_role | select, insert, delete | `pii_access_logs`, `pii_access_alerts` |
| revoke | PUBLIC | all | `_is_admin_bypass`, `_purge_audit_log_internal`, `_scan_status_anomalies_global`, `admin_list_security_definer_rpcs`, `admin_list_user_roles`, `admin_set_user_role`, `anonimizar_dados_pessoais`, `aplicar_medida_folha_ponto`, `aprovar_despesa`, `assinar_aviso_ferias`, `assinar_desligamento`, `assinar_espelho_ponto`, `associar_pis_colaborador_afdt`, `auto_vincular_admins_empresa`, `check_idempotency_anomalies` … +312 |
| revoke | PUBLIC | execute | `has_role`, `is_admin`, `get_user_roles`, `get_user_default_empresa`, `get_user_empresas`, `user_belongs_to_empresa`, `anonimizar_dados_pessoais`, `fn_link_gov_br_account`, `processar_ajuste_aprovado`, `get_colaborador_banco_horas`, `check_processamento_timeout`, `fn_alert_severe_disciplinary_measure`, `fn_audit_biometric_failure`, `fn_auto_generate_training_certificate`, `fn_consolidar_batidas` … +38 |
| revoke | PUBLIC, anon | all | `get_idempotency_health`, `check_idempotency_anomalies`, `v_slow_queries_top50`, `get_query_telemetry`, `get_dlq_stats`, `get_audit_trail_by_user`, `get_audit_trail_by_entity`, `search_audit_unified`, `rate_limit_logs`, `rate_limit_config`, `purge_audit_log_old`, `resolve_security_alert`, `refresh_dashboard_mvs`, `mv_status_change_daily`, `mv_anomalies_hourly` … +99 |
| revoke | PUBLIC, anon | execute | `get_cron_jobs_health`, `get_security_alerts_summary`, `resolve_security_alert`, `pode_gerir_rh`, `pode_gerir_pessoas`, `sou_o_colaborador`, `empresa_do_colaborador`, `is_admin`, `sou_o_colaborador` |
| revoke | PUBLIC, anon | select | `v_system_health` |
| revoke | PUBLIC, anon, authenticated | all | `enforce_batida_ponto_hash`, `enforce_folha_pagamento_hash`, `proibir_delete_folha_fechada`, `enforce_holerite_signed_hash`, `enforce_esocial_evento_hash`, `enforce_cnab_remessa_hash`, `enforce_desligamento_hash`, `enforce_ferias_hash`, `enforce_medida_disciplinar_hash`, `enforce_aso_hash`, `enforce_cat_hash`, `enforce_epi_entrega_hash`, `enforce_documento_assinatura_hash`, `enforce_afastamento_hash`, `purge_old_lock_conflicts` … +71 |
| revoke | PUBLIC, anon, authenticated | execute | `check_processamento_timeout`, `fn_alert_severe_disciplinary_measure`, `fn_audit_biometric_failure`, `fn_auto_generate_training_certificate`, `fn_consolidar_batidas`, `fn_create_default_onboarding_tasks`, `fn_enqueue_notification`, `fn_trigger_whatsapp_on_event`, `fn_update_admissao_checklist`, `fn_update_candidatura_history`, `fn_workflow_admissao_auto`, `handle_new_user`, `handle_new_user_role`, `log_audit_change`, `log_esocial_transmission` … +41 |
| revoke | PUBLIC, anon, authenticated | select | `v_audit_trail`, `mv_folha_summary`, `health_checks` |
| revoke | anon | all | `detectar_fraude_ponto`, `contrato_estender_expiracao`, `pcs_pode_gerir_plano`, `pcs_pode_ver_plano`, `pcs_gerar_grades`, `pcs_enquadramento`, `pcs_simular_impacto`, `medidas_ciencia_tokens`, `audit_log`, `folha_auditoria`, `sst_regimento_interno` |
| revoke | anon | execute | `has_role`, `is_admin`, `get_user_roles`, `get_user_default_empresa`, `get_user_empresas`, `user_belongs_to_empresa`, `anonimizar_dados_pessoais`, `fn_link_gov_br_account`, `processar_ajuste_aprovado`, `get_colaborador_banco_horas`, `processar_ajuste_aprovado`, `associar_pis_colaborador_afdt`, `criar_batida_da_divergencia_afdt`, `resolver_divergencia_afdt`, `pagar_desligamento` … +2 |
| revoke | anon | insert, update, delete | `admissao_tokens` |
| revoke | anon | references, trigger, truncate, maintain | `v_pii_access_suspeitos` |
| revoke | anon | select | `cnab_itens`, `pix_itens`, `documentos_afastamento`, `prorrogacoes_afastamento`, `sst_regimento_interno`, `audit_log`, `auditoria`, `dp_audit_log_colaborador`, `dp_audit_log_rh`, `dp_data_catalog_public`, `dp_security_advisors`, `dp_slow_queries`, `excecoes_ponto`, `pontos_abertos`, `v_alertas_timeout` … +34 |
| revoke | anon | select, insert, update, delete | `folha_auditoria` |
| revoke | anon, PUBLIC | execute | `rls_tenant_or_admin`, `contrato_verificar_autenticidade`, `get_empresa_admin_ids`, `get_empresa_admin_ids` |
| revoke | anon, authenticated | all | `edge_rate_limit_check`, `purge_rate_limits`, `check_account_lockout`, `record_login_attempt`, `run_lgpd_purge`, `drenar_fila_limpeza_lgpd`, `run_lgpd_purge`, `drenar_fila_limpeza_lgpd`, `process_lgpd_cleanup_queue`, `run_lgpd_purge` |
| revoke | anon, authenticated | execute | `maintenance_archive_old_audit`, `_admissao_token_row` |
| revoke | anon, authenticated | references, trigger, truncate, maintain | `pii_access_logs` |
| revoke | anon, authenticated | update, delete | `ponto_espelhos_assinados` |
| revoke | anon, authenticated, PUBLIC | execute | `check_brute_force`, `check_rate_limit`, `is_ip_blocked`, `is_ip_whitelisted`, `is_country_allowed`, `fn_link_gov_br_account`, `fwd_to_audit_unified`, `maintenance_weekly_analyze`, `record_failed_login`, `check_login_lock`, `record_failed_login` |
| revoke | anon, authenticated, public | execute | `fn_validar_medida_disciplinar_clt`, `validar_contrato_clt`, `trg_contrato_token_auditar`, `trg_medida_contestacao_notify`, `trg_medida_contestacao_notify_after` |
| revoke | anon, public | execute | `medida_contestar`, `medida_responder_contestacao`, `contrato_montar_variaveis`, `contrato_resolver_template` |
| revoke | authenticated | all | `detectar_fraude_ponto` |
| revoke | authenticated | execute | `processar_ajuste_aprovado`, `associar_pis_colaborador_afdt`, `criar_batida_da_divergencia_afdt`, `resolver_divergencia_afdt`, `pagar_desligamento` |
| revoke | authenticated | insert, update, delete | `folha_auditoria`, `admissao_tokens` |
| revoke | authenticated | insert, update, delete, truncate, references | `log_envio_relatorios` |
| revoke | authenticated, anon | execute | `check_login_lock`, `record_failed_login`, `purge_expired_idempotency_keys`, `check_idempotency_anomalies` |
| revoke | authenticated, anon | insert | `auditoria` |
| revoke | authenticated, anon | insert, update, delete | `audit_log`, `auditoria` |
| revoke | authenticated, anon | update | `historico_calculos_folha` |
| revoke | authenticated, anon | update, delete | `logs_sistema`, `auditoria` |
| revoke | authenticated, anon, PUBLIC | execute | `enforce_afastamento_hash`, `enforce_aso_hash`, `enforce_batida_ponto_hash`, `enforce_cat_hash`, `enforce_cnab_remessa_hash`, `enforce_desligamento_hash`, `enforce_documento_assinatura_hash`, `enforce_epi_entrega_hash`, `enforce_esocial_evento_hash`, `enforce_ferias_hash`, `enforce_folha_pagamento_hash`, `enforce_holerite_signed_hash`, `enforce_log_retention`, `enforce_medida_disciplinar_hash`, `trg_audit_status_change` … +38 |
| revoke | service_role | delete | `pii_access_logs` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `config_afastamentos` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/services/tabelas/rhService.ts` |
| `config_alertas_indicadores` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/InlineTabs.tsx` |
| `configuracoes` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/ConfiguracoesGeraisTab.tsx` |
| `lancamentos_contabeis` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/services/contabilidadeService.ts` |
| `medidas_disciplinares_integracao` | RLS ligado sem nenhuma política → só service_role acessa | `src/services/medidasDisciplinaresService.ts` |
| `pcs_avaliacoes_cargo` | RLS ligado sem nenhuma política → só service_role acessa | `src/services/pcsService.ts` |
| `pcs_fatores` | RLS ligado sem nenhuma política → só service_role acessa | `src/services/pcsService.ts` |
| `pcs_grades` | RLS ligado sem nenhuma política → só service_role acessa | `src/services/pcsService.ts` |
| `ponto_auditoria` | RLS ligado sem nenhuma política → só service_role acessa | `src/services/pontoMonitorService.ts` |
| `query_telemetry` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/pages/AdminTelemetriaPage.tsx` |
| `report_dispatch_attempts` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `tarefas_onboarding` | RLS ligado sem nenhuma política → só service_role acessa | `src/components/admissoes/OnboardingPageContent.tsx`<br>`src/pages/OnboardingPage.tsx` |

## Multi-tenancy

- Chave de tenant: **`empresa_id`** presente em 199 tabela(s): `despesas`, `medidas_disciplinares`, `desligamentos`, `ferias`, `ferias_reconciliacao_logs`, `batidas_ponto`, `ferias_coletivas`, `adiantamentos_salariais`, `admissoes`, `aej_geracoes`, `afastamentos`, `afdt_divergencias`, `afdt_importacoes`, `afdt_registros_raw`, `asos`, `audit_log`, `audit_log_unified`, `audit_log_unified_archive`, `audit_logs`, `auditoria`, `auditoria_logs`, `banco_horas`, `banco_horas_config`, `beneficio_arquivos`, `beneficio_regras_elegibilidade`, `beneficios`, `campos_customizados`, `canal_etica`, `candidatos`, `candidaturas`, `cargos`, `catalogo_cursos`, `catalogo_infracoes`, `centros_custo`, `certificados_digitais`, `ciclos_avaliacao`, `clinicas_partners`, `cnab_configuracoes`, `cnab_remessas`, `colaboradores`, `competencias_config`, `competencias_matriz`, `comunicados`, `configuracoes_esocial`, `configuracoes_intervalo`, `configuracoes_ponto`, `conformidade_ponto_logs`, `contabilidade_contatos`, `contabilidade_mensagens`, `contabilidade_threads`, `contas_bancarias`, `contrato_assinatura_tokens`, `contrato_templates`, `contrato_token_eventos`, `contratos`, `contratos_gerados`, `controle_acesso`, `convenios`, `curriculos_arquivos`, `dados_estagiario`, `dctfweb_declaracoes`, `departamentos`, `despesas_aprovacoes_log`, `documento_templates`, `documentos_assinatura`, `emprestimos_consignados`, `epis`, `epis_entregas`, `epis_fichas`, `escalas`, `escalas_trabalho`, `esocial_eventos`, `esocial_lotes`, `esocial_transmissao_logs`, `eventos_variaveis`, `exames_agendamentos`, `faltas`, `feedbacks_360`, `feriados`, `ferias_audit_log`, `ferias_solicitacoes`, `fgts_digital_logs`, `fila_processamento`, `folha_lock_conflicts`, `folhas_pagamento`, `guias_fgts`, `guias_fgts_digital`, `guias_inss`, `historico_calculos_folha`, `historico_contratos`, `historico_rescisoes`, `historico_salarial`, `ia_provisoes_alertas`, `idempotency_keys`, `inscricoes_cursos`, `jornadas`, `lancamentos_contabeis`, `lgpd_consentimentos`, `lgpd_solicitacoes`, `locais_trabalho`, `logs_sincronizacao`, `lotacoes`, `medidas_ciencia_tokens`, `medidas_disciplinares_contestacao_anexos`, `medidas_disciplinares_integracao`, `medidas_disciplinares_workflow_log`, `metas_okrs`, `notificacoes`, `onboarding_colaborador`, `onboarding_documentos_obrigatorios`, `onboarding_kits`, `onboarding_tarefas`, `onboarding_templates`, `parametros_sistema`, `pdi_plano_desenvolvimento`, `pdis`, `pendencias`, `periodos_aquisitivos`, `permissao_perfis`, `personnel_budget`, `pesquisas`, `pii_access_alerts`, `pii_access_logs`, `pix_lotes`, `plano_contas`, `planos_saude`, `ponto_espelhos_assinados`, `ponto_regras_aprovacao`, `registros_ponto`, `premiacoes_campanhas`, `premiacoes_cenarios_simulacao`, `provisao_logs`, `provisoes_folha`, `provisoes_mensais`, `recrutamento_agendamentos`, `recrutamento_anotacoes`, `recrutamento_entrevistas`, `recrutamento_testes`, `relatorios_agendados`, `rubricas_folha`, `sefip_arquivos`, `seguros_vida`, `simulacoes_fiscais`, `solicitacoes_ajuste_ponto`, `solicitacoes_hora_extra`, `sst_cat`, `sst_extintores`, `sst_extintores_inspecoes`, `sst_incidentes`, `sst_ltcat_laudos`, `sst_ordens_servico`, `sst_programas`, `sst_regimento_assinaturas`, `sst_regimento_documentos`, `sst_regimento_interno`, `sst_riscos_ambientais`, `times`, `treinamento_certificados`, `treinamento_instancias`, `treinamentos`, `triagem_notas`, `trilhas_aprendizado`, `turnos`, `user_empresas`, `vaga_entrevistas`, `vaga_etapas`, `vagas`, `vales_alimentacao`, `webhooks`, `webhooks_config`, `whatsapp_config`, `whatsapp_mensagens_logs`, `whatsapp_templates`, `workflows_config`, `workflows_definicoes`, `workflows_execucoes`, `rubricas`, `folha_pagamento`, `backup_logs`, `atrasos`, `adicionais`, `gratificacoes`, `comissoes`, `recibos_ferias`, `recibos_rescisao`, `darfs`, `grrf`, `trct`, `homologacoes`, `exames_medicos`, `cas`, `avaliacoes`, `ferias_programacao`, `pcs_planos`, `pcs_pesquisa_salarial`, `feriados_brasileiros`, `report_dispatch_attempts`, `cnab_sequencias`, `afd_geracoes`
- Cobertura: 43% das tabelas. Abaixo de 60% — isolamento provavelmente por usuário (auth.uid()) ou misto; não flagado por tabela.

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `auth.oauth_clients` | `deleted_at` |
| `auth.users` | `deleted_at` |
| `beneficios` | `ativo` |
| `beneficios_colaborador` | `ativo` |
| `beneficios_colaboradores` | `ativo` |
| `campos_customizados` | `ativo` |
| `cargos` | `ativo` |
| `catalogo_cursos` | `ativo` |
| `catalogo_infracoes` | `ativo` |
| `centros_custo` | `ativo` |
| `certificados_digitais` | `ativo` |
| `clinicas_partners_horarios` | `ativo` |
| `clinicas_partners_servicos` | `ativo` |
| `competencias_config` | `ativo` |
| `competencias_matriz` | `ativo` |
| `comunicados` | `ativo` |
| `configuracoes_intervalo` | `ativo` |
| `contabilidade_contatos` | `ativo` |
| `contas_bancarias` | `ativo` |
| `contrato_templates` | `ativo` |
| `convenios` | `ativo` |
| `convenios_colaboradores` | `ativo` |
| `departamentos` | `ativo` |
| `dependentes_beneficios` | `ativo` |
| `documento_templates` | `ativo` |
| `dp_user_roles` | `active` |
| `epis` | `ativo` |
| `escalas` | `ativo` |
| `historico_salarial` | `ativo` |
| `locais_trabalho` | `ativo` |
| `onboarding_kits` | `ativo` |
| `onboarding_templates` | `ativo` |
| `parametros_fiscais` | `ativo` |
| `pensoes` | `ativo` |
| `planos_saude` | `ativo` |
| `push_subscriptions` | `active` |
| `relatorios_agendados` | `ativo` |
| `rubricas_folha` | `ativo` |
| `seguros_vida` | `ativo` |
| `sst_extintores` | `deleted_at` |
| `times` | `ativo` |
| `tipos_beneficio` | `ativo` |
| `trilhas_aprendizado` | `ativo` |
| `turnos` | `ativo` |
| `user_sessions` | `is_active` |
| `vales_alimentacao` | `ativo` |
| `webhooks` | `ativo` |
| `webhooks_config` | `ativo` |
| `workflows_config` | `ativo` |
| `workflows_definicoes` | `ativo` |
| `storage.buckets_analytics` | `deleted_at` |
| `rubricas` | `ativo` |
| `atrasos` | `ativo` |
| `adicionais` | `ativo` |
| `gratificacoes` | `ativo` |
| `comissoes` | `ativo` |
| `recibos_ferias` | `ativo` |
| `config_retencao` | `ativo` |
| `lgpd_retencao_logs` | `ativo` |
| `pcs_planos` | `deleted_at` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `auth.audit_log_entries` | `created_at` |
| `auth.custom_oauth_providers` | `created_at`, `updated_at` |
| `auth.flow_state` | `created_at`, `updated_at` |
| `auth.identities` | `created_at`, `updated_at` |
| `auth.instances` | `created_at`, `updated_at` |
| `auth.mfa_amr_claims` | `created_at`, `updated_at` |
| `auth.mfa_challenges` | `created_at` |
| `auth.mfa_factors` | `created_at`, `updated_at` |
| `auth.oauth_authorizations` | `created_at` |
| `auth.oauth_client_states` | `created_at` |
| `auth.oauth_clients` | `created_at`, `updated_at` |
| `auth.one_time_tokens` | `created_at`, `updated_at` |
| `auth.refresh_tokens` | `created_at`, `updated_at` |
| `auth.saml_providers` | `created_at`, `updated_at` |
| `auth.saml_relay_states` | `created_at`, `updated_at` |
| `auth.sessions` | `created_at`, `updated_at` |
| `auth.sso_domains` | `created_at`, `updated_at` |
| `auth.sso_providers` | `created_at`, `updated_at` |
| `auth.users` | `created_at`, `updated_at` |
| `auth.webauthn_challenges` | `created_at` |
| `auth.webauthn_credentials` | `created_at`, `updated_at` |
| `despesas` | `created_at`, `updated_at` |
| `admissao_tokens` | `created_at`, `updated_at` |
| `medidas_disciplinares` | `created_at`, `updated_at` |
| `desligamentos` | `created_at`, `created_by`, `updated_at` |
| `ferias` | `created_at`, `created_by`, `updated_at` |
| `batidas_ponto` | `created_at`, `updated_at` |
| `ferias_coletivas` | `created_at`, `created_by`, `updated_at` |
| `security_alerts` | `created_at` |
| `adiantamentos_salariais` | `created_at`, `updated_at` |
| `admissoes` | `created_at`, `created_by`, `updated_at` |
| `aej_geracoes` | `created_at` |
| `afastamentos` | `created_at`, `created_by`, `updated_at` |
| `afdt_divergencias` | `created_at` |
| `afdt_importacoes` | `created_at`, `updated_at` |
| `afdt_registros_raw` | `created_at` |
| `ajustes_ponto` | `created_at`, `created_by` |
| `anotacoes_colaborador` | `created_at`, `created_by`, `updated_at` |
| `asos` | `created_at`, `updated_at` |
| `audit_log` | `created_at` |
| `audit_logs` | `created_at` |
| `auditoria` | `created_at` |
| `auditoria_contratual` | `created_at` |
| `auditoria_logs` | `created_at` |
| `auth_gov_br_sessions` | `created_at` |
| `automacao_logs` | `created_at` |
| `banco_horas` | `created_at`, `created_by` |
| `banco_horas_config` | `created_at`, `updated_at` |
| `beneficiarios_plano` | `created_at` |
| `beneficiarios_seguro` | `created_at` |
| `beneficio_arquivos` | `created_at` |
| `beneficio_movimentacoes` | `created_at` |
| `beneficio_regras_elegibilidade` | `created_at`, `updated_at` |
| `beneficio_utilizacao` | `created_at` |
| `beneficios` | `created_at`, `updated_at` |
| `beneficios_colaborador` | `created_at`, `created_by`, `updated_at` |
| `beneficios_colaboradores` | `created_at` |
| `bitrix24_config` | `created_at`, `updated_at` |
| `bitrix24_sync_logs` | `created_at` |
| `blocked_ips` | `created_at` |
| `campos_customizados` | `created_at`, `updated_at` |
| `canal_etica` | `created_at`, `updated_at` |
| `candidatos` | `created_at`, `updated_at` |
| `candidaturas` | `created_at`, `updated_at` |
| `cargo_faixas_salariais` | `created_at`, `updated_at` |
| `cargos` | `created_at`, `updated_at` |
| `catalogo_cursos` | `created_at`, `updated_at` |
| `catalogo_infracoes` | `created_at`, `updated_at` |
| `categorias_trabalhador` | `created_at` |
| `centros_custo` | `created_at`, `updated_at` |
| `certificados_digitais` | `created_at` |
| `ciclos_avaliacao` | `created_at`, `updated_at` |
| `cid10` | `created_at` |
| `ciencia_rate_limits` | `created_at` |
| `clinicas_partners` | `created_at`, `created_by`, `updated_at` |
| `clinicas_partners_horarios` | `created_at`, `updated_at` |
| `clinicas_partners_servicos` | `created_at`, `updated_at` |
| `cnab_configuracoes` | `created_at`, `updated_at` |
| `cnab_itens` | `created_at` |
| `cnab_remessas` | `created_at`, `updated_at` |
| `colaborador_beneficios` | `created_at` |
| `colaboradores` | `created_at`, `created_by`, `updated_at` |
| `competencias_config` | `created_at` |
| `competencias_matriz` | `created_at`, `updated_at` |
| `comunicados` | `created_at`, `created_by` |
| `condicoes_ingresso` | `created_at` |
| `config_afastamentos` | `created_at` |
| `config_alertas_indicadores` | `created_at`, `updated_at` |
| `configuracoes` | `created_at`, `updated_at` |
| `configuracoes_esocial` | `created_at`, `updated_at` |
| `configuracoes_intervalo` | `created_at`, `updated_at` |
| `configuracoes_ponto` | `created_at`, `updated_at` |
| `contabilidade_contatos` | `created_at`, `updated_at` |
| `contabilidade_mensagens` | `created_at` |
| `contabilidade_threads` | `created_at`, `updated_at` |
| `contas_bancarias` | `created_at`, `updated_at` |
| `contatos_emergencia` | `created_at`, `updated_at` |
| `contrato_assinatura_tokens` | `created_at`, `created_by` |
| `contrato_templates` | `created_at`, `created_by`, `updated_at` |
| `contrato_token_eventos` | `created_at` |
| `contratos` | `created_at`, `updated_at` |
| `contratos_gerados` | `created_at`, `updated_at` |
| `controle_acesso` | `created_at` |
| `convenios` | `created_at` |
| `convenios_colaboradores` | `created_at` |
| `curriculos_arquivos` | `created_at` |
| `dados_estagiario` | `created_at`, `updated_at` |
| `dados_estrangeiro` | `created_at`, `updated_at` |
| `dctfweb_declaracoes` | `created_at` |
| `deficiencias` | `created_at`, `updated_at` |
| `departamentos` | `created_at`, `updated_at` |
| `dependentes` | `created_at` |
| `dependentes_beneficios` | `created_at` |
| `descricoes_logradouro` | `created_at` |
| `despesas_aprovacoes_log` | `created_at` |
| `documento_templates` | `created_at`, `created_by`, `updated_at` |
| `documentos` | `created_at`, `updated_at` |
| `documentos_admissao` | `created_at` |
| `documentos_afastamento` | `created_at`, `created_by` |
| `documentos_assinatura` | `created_at`, `created_by` |
| `documentos_colaborador` | `created_at`, `created_by` |
| `documentos_historico` | `created_at` |
| `documentos_pessoais_arquivos` | `created_at`, `created_by`, `updated_at` |
| `dp_audit_log` | `created_at` |
| `dp_audit_log_2026_07` | `created_at` |
| `dp_audit_log_2026_08` | `created_at` |
| `dp_audit_log_2026_09` | `created_at` |
| `dp_audit_log_2026_10` | `created_at` |
| `dp_audit_log_2026_11` | `created_at` |
| `dp_audit_log_2026_12` | `created_at` |
| `dp_audit_log_default` | `created_at` |
| `dp_backup_runbook` | `created_at` |
| `dp_data_catalog` | `created_at`, `updated_at` |
| `dp_environments` | `created_at` |
| `dp_mcp_config` | `updated_at` |
| `dp_retention_policy` | `created_at`, `updated_at` |
| `empresas` | `created_at`, `updated_at` |
| `emprestimos_consignados` | `created_at`, `updated_at` |
| `epis` | `created_at`, `updated_at` |
| `epis_entregas` | `created_at` |
| `epis_fichas` | `created_at`, `updated_at` |
| `epis_fichas_itens` | `created_at` |
| `escalas` | `created_at`, `updated_at` |
| `escalas_trabalho` | `created_at`, `created_by` |
| `esocial_eventos` | `created_at`, `updated_at` |
| `esocial_lotes` | `created_at`, `updated_at` |
| `esocial_transmissao_logs` | `created_at` |
| `etnias` | `created_at` |
| `eventos_variaveis` | `created_at`, `created_by` |
| `exames` | `created_at` |
| `exames_agendamentos` | `created_at`, `criado_por`, `updated_at` |
| `faltas` | `created_at`, `created_by`, `updated_at` |
| `feedbacks_360` | `created_at`, `updated_at` |
| `feriados` | `created_at` |
| `ferias_aprovacoes` | `created_at`, `updated_at` |
| `ferias_aprovacoes_log` | `created_at` |
| `ferias_arquivos` | `created_at`, `updated_at` |
| `ferias_audit_log` | `created_at` |
| `ferias_solicitacoes` | `created_at` |
| `fgts_digital_logs` | `created_at` |
| `fila_notificacoes` | `created_at` |
| `fila_processamento` | `created_at`, `updated_at` |
| `folha_assinaturas` | `created_at` |
| `folha_auditoria` | `created_at`, `criado_por` |
| `folha_eventos_auditoria` | `created_at` |
| `folha_itens` | `created_at` |
| `folha_lock_conflicts` | `created_at` |
| `folhas_pagamento` | `created_at`, `created_by`, `updated_at` |
| `formacoes_academicas` | `created_at`, `updated_at` |
| `generos_documento` | `created_at` |
| `geo_allowed_countries` | `created_at` |
| `geo_blocked_attempts` | `created_at` |
| `geo_blocking_config` | `updated_at`, `updated_by` |
| `govbr_auth_state` | `created_at` |
| `guias_fgts` | `created_at` |
| `guias_fgts_digital` | `created_at`, `updated_at` |
| `guias_inss` | `created_at` |
| `historico_alertas` | `created_at` |
| `historico_calculos_folha` | `created_at`, `criado_por` |
| `historico_cargo` | `created_at`, `created_by` |
| `historico_contratos` | `created_at`, `created_by`, `updated_at` |
| `historico_ferias` | `created_at`, `created_by` |
| `historico_rescisoes` | `created_at`, `created_by` |
| `historico_salarial` | `created_at`, `created_by`, `updated_at` |
| `holerite_distribuicoes` | `created_at`, `updated_at` |
| `holerites` | `created_at` |
| `homologacoes_rescisao` | `created_at` |
| `ia_provisoes_alertas` | `created_at` |
| `idempotency_keys` | `created_at` |
| `identidades_genero` | `created_at` |
| `inscricoes_cursos` | `created_at`, `updated_at` |
| `integracao_logs` | `created_at` |
| `integracoes` | `created_at`, `updated_at` |
| `ip_whitelist` | `created_at` |
| `itens_folha` | `created_at` |
| `jornadas` | `created_at`, `updated_at` |
| `jornadas_horarios` | `created_at` |
| `lancamentos_contabeis` | `created_at`, `updated_at` |
| `lancamentos_folha` | `created_at` |
| `lgpd_consentimentos` | `created_at`, `updated_at` |
| `lgpd_fila_limpeza` | `created_at` |
| `lgpd_politicas_retencao` | `updated_at` |
| `lgpd_solicitacoes` | `created_at`, `updated_at` |
| `linhas_transporte` | `created_at` |
| `locais_trabalho` | `created_at`, `updated_at` |
| `log_envio_relatorios` | `created_at` |
| `login_attempts` | `created_at` |
| `login_lockouts` | `created_at`, `updated_at` |
| `login_rate_limits` | `created_at`, `updated_at` |
| `logs_integracoes` | `created_at` |
| `logs_sincronizacao` | `created_at` |
| `logs_sistema` | `created_at` |
| `lotacoes` | `created_at`, `updated_at` |
| `medidas_ciencia_tokens` | `created_at`, `created_by` |
| `medidas_disciplinares_anexos` | `created_at` |
| `medidas_disciplinares_contestacao_anexos` | `created_at` |
| `medidas_disciplinares_integracao` | `created_at`, `updated_at` |
| `medidas_disciplinares_workflow_log` | `created_at` |
| `metas_okrs` | `created_at`, `updated_at` |
| `motivos_afastamento` | `created_at` |
| `nacionalidades` | `created_at` |
| `notificacoes` | `created_at` |
| `notificacoes_admissao` | `created_at` |
| `onboarding_colaborador` | `created_at`, `created_by`, `updated_at` |
| `onboarding_documentos_obrigatorios` | `created_at`, `updated_at` |
| `onboarding_kits` | `created_at` |
| `onboarding_tarefas` | `created_at` |
| `onboarding_template_tarefas` | `created_at` |
| `onboarding_templates` | `created_at`, `created_by` |
| `paises` | `created_at` |
| `parametros_fiscais` | `created_at` |
| `parametros_sistema` | `created_at`, `updated_at` |
| `password_history` | `created_at` |
| `password_policies` | `created_at`, `updated_at` |
| `password_reset_config` | `updated_at`, `updated_by` |
| `password_reset_requests` | `created_at` |
| `pdi_plano_desenvolvimento` | `created_at`, `updated_at` |
| `pdis` | `created_at`, `updated_at` |
| `pensoes` | `created_at` |
| `periodos_aquisitivos` | `created_at` |
| `periodos_experiencia` | `created_at`, `updated_at` |
| `periodos_ponto` | `created_at` |
| `permissao_perfis` | `created_at`, `updated_at` |
| `permissao_recursos` | `created_at` |
| `permissions` | `created_at` |
| `personnel_budget` | `created_at`, `updated_at` |
| `pesquisas` | `created_at`, `created_by`, `updated_at` |
| `pesquisas_perguntas` | `created_at` |
| `pesquisas_respostas` | `created_at` |
| `pii_access_alerts` | `created_at` |
| `pii_access_logs` | `created_at` |
| `pix_itens` | `created_at` |
| `pix_lotes` | `created_at`, `updated_at` |
| `plano_contas` | `created_at`, `updated_at` |
| `planos_saude` | `created_at` |
| `ponto_ajustes` | `created_at`, `updated_at` |
| `ponto_auditoria` | `created_at` |
| `ponto_auditoria_fraude` | `created_at` |
| `ponto_espelhos_assinados` | `created_at` |
| `ponto_regras_aprovacao` | `created_at`, `updated_at` |
| `registros_ponto` | `created_at`, `created_by`, `updated_at` |
| `portal_notificacoes_settings` | `created_at` |
| `premiacoes_alertas` | `created_at` |
| `premiacoes_auditoria` | `created_at` |
| `premiacoes_campanhas` | `created_at`, `updated_at` |
| `premiacoes_cenarios_simulacao` | `created_at`, `criado_por` |
| `premiacoes_pagamentos` | `created_at`, `updated_at` |
| `premiacoes_regras` | `created_at` |
| `premiacoes_roi_cenarios` | `created_at` |
| `profiles` | `created_at`, `updated_at` |
| `promo_brindes` | `created_at`, `updated_at` |
| `promocoes` | `created_at` |
| `prorrogacoes_afastamento` | `created_at`, `created_by` |
| `provisao_auditoria` | `created_at` |
| `provisao_logs` | `created_at` |
| `provisoes_folha` | `created_at` |
| `provisoes_mensais` | `created_at`, `updated_at` |
| `push_subscriptions` | `created_at`, `updated_at` |
| `query_telemetry` | `created_at` |
| `rate_limit_config` | `created_at`, `updated_at` |
| `rate_limit_logs` | `created_at` |
| `rate_limits` | `created_at` |
| `recargas_vale` | `created_at` |
| `recrutamento_agendamentos` | `created_at`, `updated_at` |
| `recrutamento_anotacoes` | `created_at` |
| `recrutamento_entrevistas` | `created_at`, `updated_at` |
| `recrutamento_testes` | `created_at`, `updated_at` |
| `relacionamentos_contato_emergencia` | `created_at` |
| `relacionamentos_dependentes` | `created_at` |
| `relatorios_agendados` | `created_at`, `created_by`, `updated_at` |
| `role_permissions` | `created_at`, `created_by` |
| `rubricas_folha` | `created_at` |
| `saved_filters` | `created_at`, `updated_at` |
| `sefip_arquivos` | `created_at`, `updated_at` |
| `seguros_colaboradores` | `created_at` |
| `seguros_vida` | `created_at` |
| `simulacoes_fiscais` | `created_at` |
| `sindicatos` | `created_at` |
| `sinistros_seguro` | `created_at` |
| `solicitacoes_ajuste_ponto` | `created_at`, `updated_at` |
| … +130 linhas — lista completa em `context.json` | |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `auth.audit_log_entries` | `ip_address` |
| `auth.identities` | `email` |
| `auth.mfa_challenges` | `ip_address` |
| `auth.mfa_factors` | `phone` |
| `auth.users` | `email` |
| `auth.users` | `phone` |
| `batidas_ponto` | `latitude` |
| `batidas_ponto` | `longitude` |
| `batidas_ponto` | `ip_address` |
| `security_alerts` | `ip_address` |
| `admissoes` | `cpf` |
| `admissoes` | `email` |
| `admissoes` | `telefone` |
| `afdt_registros_raw` | `cpf` |
| `audit_log` | `ip_address` |
| `audit_log_unified` | `ip_address` |
| `audit_log_unified_archive` | `ip_address` |
| `audit_logs` | `ip_address` |
| `auditoria` | `ip_address` |
| `auditoria_logs` | `ip_address` |
| `auth_gov_br_sessions` | `cpf` |
| `beneficiarios_plano` | `cpf` |
| `beneficiarios_seguro` | `cpf` |
| `blocked_ips` | `ip_address` |
| `candidatos` | `email` |
| `candidatos` | `telefone` |
| `candidatos` | `cpf` |
| `ciencia_rate_limits` | `ip_address` |
| `clinicas_partners` | `cnpj` |
| `clinicas_partners` | `email` |
| `clinicas_partners` | `telefone` |
| `clinicas_partners` | `cep` |
| `clinicas_partners` | `logradouro` |
| `colaboradores` | `cpf` |
| `colaboradores` | `rg` |
| `colaboradores` | `email` |
| `colaboradores` | `telefone` |
| `colaboradores` | `celular` |
| `colaboradores` | `cep` |
| `colaboradores` | `logradouro` |
| `colaboradores` | `whatsapp` |
| `contabilidade_contatos` | `email` |
| `contabilidade_contatos` | `telefone` |
| `contatos_emergencia` | `telefone` |
| `contatos_emergencia` | `celular` |
| `contatos_emergencia` | `email` |
| `controle_acesso` | `latitude` |
| `controle_acesso` | `longitude` |
| `controle_acesso` | `ip_address` |
| `dependentes` | `cpf` |
| `dp_audit_log` | `ip_address` |
| `dp_audit_log_2026_07` | `ip_address` |
| `dp_audit_log_2026_08` | `ip_address` |
| `dp_audit_log_2026_09` | `ip_address` |
| `dp_audit_log_2026_10` | `ip_address` |
| `dp_audit_log_2026_11` | `ip_address` |
| `dp_audit_log_2026_12` | `ip_address` |
| `dp_audit_log_default` | `ip_address` |
| `empresas` | `cnpj` |
| `empresas` | `cep` |
| `empresas` | `logradouro` |
| `empresas` | `telefone` |
| `empresas` | `email` |
| `epis_fichas_assinaturas` | `ip_address` |
| `geo_blocked_attempts` | `ip_address` |
| `historico_contratos` | `salario` |
| `historico_rescisoes` | `cpf` |
| `historico_rescisoes` | `salario` |
| `ip_whitelist` | `ip_address` |
| `lgpd_consentimentos` | `ip_address` |
| `locais_trabalho` | `endereco` |
| `locais_trabalho` | `cep` |
| `locais_trabalho` | `telefone` |
| `locais_trabalho` | `latitude` |
| `locais_trabalho` | `longitude` |
| `login_attempts` | `email` |
| `login_attempts` | `ip_address` |
| `lotacoes` | `endereco` |
| `medidas_ciencia_tokens` | `ip_address` |
| `password_reset_requests` | `ip_address` |
| `ponto_auditoria` | `ip_address` |
| `profiles` | `telefone` |
| `rate_limit_logs` | `ip_address` |
| `sindicatos` | `cnpj` |
| `sindicatos` | `telefone` |
| `sindicatos` | `email` |
| `sst_cat_testemunhas` | `cpf` |
| `sst_cat_testemunhas` | `telefone` |
| `sst_cat_testemunhas` | `endereco` |
| `sst_extintores` | `latitude` |
| `sst_extintores` | `longitude` |
| `sst_extintores_inspecoes` | `latitude` |
| `sst_extintores_inspecoes` | `longitude` |
| `sst_extintores_inspecoes` | `ip_address` |
| `trilha_auditoria_ponto` | `ip_address` |
| `user_sessions` | `ip_address` |
| `whatsapp_mensagens_logs` | `telefone` |
| `auditoria_acesso_bancario` | `ip_address` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

| Tabela | Coluna | Tipo |
|---|---|---|
| `auth.custom_oauth_providers` | `custom_claims_allowlist` | `"text"[]` |
| `despesas` | `valor` | `numeric(10,2)` |
| `desligamentos` | `saldo_salario` | `numeric` |
| `desligamentos` | `multa_fgts` | `numeric` |
| `desligamentos` | `total_proventos` | `numeric` |
| `desligamentos` | `total_descontos` | `numeric` |
| `desligamentos` | `valor_liquido` | `numeric` |
| `ferias` | `valor_ferias` | `numeric(12,2)` |
| `ferias` | `valor_terco` | `numeric(12,2)` |
| `ferias` | `valor_abono` | `numeric(12,2)` |
| `ferias` | `valor_terco_abono` | `numeric(12,2)` |
| `ferias` | `valor_total` | `numeric(12,2)` |
| `ferias` | `descontos_inss` | `numeric(12,2)` |
| `ferias` | `descontos_irrf` | `numeric(12,2)` |
| `ferias` | `valor_liquido` | `numeric(12,2)` |
| `ferias` | `saldo_gasto` | `integer` |
| `ferias` | `valor_abono_pecuniario` | `numeric(12,2)` |
| `ferias` | `valor_adiantamento_13` | `numeric(12,2)` |
| `adiantamentos_salariais` | `valor_solicitado` | `numeric(12,2)` |
| `aej_geracoes` | `total_colaboradores` | `integer` |
| `aej_geracoes` | `total_marcacoes` | `integer` |
| `afdt_importacoes` | `total_linhas` | `integer` |
| `afdt_importacoes` | `total_registros` | `integer` |
| `afdt_importacoes` | `total_erros` | `integer` |
| `ajustes_ponto` | `valor_anterior` | `"text"` |
| `ajustes_ponto` | `valor_novo` | `"text"` |
| `auditoria_contratual` | `valor_antigo` | `"text"` |
| `auditoria_contratual` | `valor_novo` | `"text"` |
| `banco_horas` | `saldo_anterior` | `interval` |
| `banco_horas` | `saldo_atual` | `interval` |
| `banco_horas_config` | `saldo_maximo_horas` | `integer` |
| `beneficio_utilizacao` | `valor_total` | `numeric` |
| `beneficio_utilizacao` | `valor_desconto_folha` | `numeric` |
| `beneficios` | `valor` | `numeric` |
| `beneficios` | `valor_empresa` | `numeric(12,2)` |
| `beneficios` | `valor_colaborador` | `numeric(12,2)` |
| `beneficios_colaborador` | `valor` | `numeric(10,2)` |
| `beneficios_colaborador` | `desconto` | `numeric(10,2)` |
| `beneficios_colaboradores` | `valor_customizado` | `numeric(15,2)` |
| `candidaturas` | `feedback` | `"text"` |
| `candidaturas` | `feedback_ia` | `"text"` |
| `cargo_faixas_salariais` | `valor_minimo` | `numeric(12,2)` |
| `cargo_faixas_salariais` | `valor_maximo` | `numeric(12,2)` |
| `clinicas_partners_servicos` | `preco` | `numeric(10,2)` |
| `cnab_itens` | `valor_pagamento` | `numeric(18,2)` |
| `cnab_remessas` | `total_pagamentos` | `integer` |
| `cnab_remessas` | `valor_total` | `numeric(18,2)` |
| `configuracoes` | `valor` | `"jsonb"` |
| `convenios_colaboradores` | `saldo_utilizado` | `numeric` |
| `dados_estagiario` | `valor_bolsa` | `numeric` |
| `dctfweb_declaracoes` | `total_debitos` | `numeric` |
| `dctfweb_declaracoes` | `total_remuneracao` | `numeric` |
| `dctfweb_declaracoes` | `total_fgts` | `numeric` |
| `dependentes_beneficios` | `valor_dependente` | `numeric(12,2)` |
| `dependentes_beneficios` | `valor_empresa` | `numeric(12,2)` |
| `emprestimos_consignados` | `valor_total` | `numeric(12,2)` |
| `emprestimos_consignados` | `valor_parcela` | `numeric(12,2)` |
| `emprestimos_consignados` | `taxa_juros` | `numeric(5,2)` |
| `eventos_variaveis` | `valor` | `numeric(12,2)` |
| `faltas` | `desconto_aplicado` | `boolean` |
| `folha_itens` | `total_proventos` | `numeric(12,2)` |
| `folha_itens` | `total_descontos` | `numeric(12,2)` |
| `folha_itens` | `total_liquido` | `numeric(12,2)` |
| `folhas_pagamento` | `total_proventos` | `numeric(14,2)` |
| `folhas_pagamento` | `total_descontos` | `numeric(14,2)` |
| `folhas_pagamento` | `total_liquido` | `numeric(14,2)` |
| `folhas_pagamento` | `total_fgts` | `numeric(14,2)` |
| `folhas_pagamento` | `total_inss_patronal` | `numeric(14,2)` |
| `folhas_pagamento` | `total_colaboradores` | `integer` |
| `guias_fgts` | `valor_total` | `numeric` |
| `guias_fgts` | `valor_multa` | `numeric` |
| `guias_fgts` | `valor_total_recolher` | `numeric` |
| `guias_fgts_digital` | `valor_total` | `numeric(15,2)` |
| `guias_inss` | `valor_empresa` | `numeric` |
| `guias_inss` | `valor_segurados` | `numeric` |
| `guias_inss` | `valor_total` | `numeric` |
| `historico_alertas` | `valor` | `numeric` |
| `historico_rescisoes` | `saldo_fgts` | `numeric` |
| `historico_rescisoes` | `total_proventos` | `numeric` |
| `historico_rescisoes` | `total_descontos` | `numeric` |
| `historico_rescisoes` | `total_liquido` | `numeric` |
| `holerites` | `total_proventos` | `numeric(12,2)` |
| `holerites` | `total_descontos` | `numeric(12,2)` |
| `holerites` | `valor_inss` | `numeric(12,2)` |
| `holerites` | `valor_irrf` | `numeric(12,2)` |
| `holerites` | `valor_fgts` | `numeric(12,2)` |
| `itens_folha` | `valor` | `numeric(15,2)` |
| `lancamentos_contabeis` | `valor` | `numeric(18,2)` |
| `lancamentos_folha` | `valor` | `numeric(12,2)` |
| `linhas_transporte` | `valor` | `numeric` |
| `medidas_disciplinares_integracao` | `valor` | `numeric(12,2)` |
| `metas_okrs` | `valor_atual` | `numeric` |
| `parametros_fiscais` | `valor_inicial` | `numeric(12,2)` |
| `parametros_fiscais` | `valor_final` | `numeric(12,2)` |
| `parametros_fiscais` | `valor_fixo` | `numeric(12,2)` |
| `parametros_sistema` | `valor` | `"text"` |
| `pensoes` | `valor_fixo` | `numeric` |
| `personnel_budget` | `valor_orcado` | `numeric(15,2)` |
| `pesquisas_respostas` | `valor_numerico` | `integer` |
| `pesquisas_respostas` | `valor_texto` | `"text"` |
| `pii_access_alerts` | `total_registros` | `bigint` |
| `pix_itens` | `valor` | `numeric(18,2)` |
| `pix_lotes` | `valor_total` | `numeric(18,2)` |
| `planos_saude` | `valor_mensal` | `numeric` |
| `ponto_espelhos_assinados` | `total_horas_trabalhadas` | `interval` |
| `ponto_espelhos_assinados` | `saldo_banco_horas_periodo` | `interval` |
| `ponto_espelhos_assinados` | `total_batidas` | `integer` |
| `registros_ponto` | `total_batidas` | `integer` |
| `premiacoes_pagamentos` | `valor_calculado` | `numeric(12,2)` |
| `premiacoes_pagamentos` | `valor_aprovado` | `numeric(12,2)` |
| `premiacoes_pagamentos` | `valor_folha_real` | `numeric(12,2)` |
| `premiacoes_regras` | `valor_base` | `numeric(12,2)` |
| `promo_brindes` | `preco` | `numeric(10,2)` |
| `provisao_auditoria` | `valor_anterior` | `numeric(15,2)` |
| `provisao_auditoria` | `valor_novo` | `numeric(15,2)` |
| `provisao_logs` | `total_colaboradores` | `integer` |
| `provisao_logs` | `valor_total_provisionado` | `numeric(15,2)` |
| `provisoes_folha` | `valor_13_salario` | `numeric(12,2)` |
| `provisoes_folha` | `valor_ferias` | `numeric(12,2)` |
| `provisoes_mensais` | `valor_principal` | `numeric(15,2)` |
| `provisoes_mensais` | `total` | `numeric(15,2)` |
| `recargas_vale` | `valor` | `numeric` |
| `recrutamento_agendamentos` | `feedback_entrevistador` | `"text"` |
| `recrutamento_entrevistas` | `feedback` | `"text"` |
| `sefip_arquivos` | `total_remuneracao` | `numeric` |
| `sefip_arquivos` | `total_fgts` | `numeric` |
| `sefip_arquivos` | `total_colaboradores` | `integer` |
| `taxas_cambio` | `taxa` | `numeric(15,6)` |
| `tipos_beneficio` | `valor_padrao` | `numeric(10,2)` |
| `tipos_beneficio` | `desconto_colaborador` | `numeric(5,2)` |
| `vaga_entrevistas` | `feedback` | `"text"` |
| `vales_alimentacao` | `valor_mensal` | `numeric` |
| `vales_alimentacao` | `valor_por_dia` | `numeric` |
| `vales_transporte` | `valor_diario` | `numeric` |
| `vales_transporte` | `valor_mensal` | `numeric` |
| `vales_transporte` | `desconto` | `numeric` |
| `vales_transporte` | `valor_liquido` | `numeric` |
| `valores_campos_customizados` | `valor` | `"text"` |
| `verbas_rescisorias` | `valor` | `numeric(15,2)` |
| `webhooks` | `total_sucesso` | `integer` |
| `webhooks` | `total_falha` | `integer` |
| `folha_pagamento` | `total_proventos` | `DECIMAL(15,2)` |
| `folha_pagamento` | `total_descontos` | `DECIMAL(15,2)` |
| `folha_pagamento` | `total_liquido` | `DECIMAL(15,2)` |
| `folha_pagamento` | `total_encargos` | `DECIMAL(15,2)` |
| `eventos_rh` | `valor_anterior` | `DECIMAL(12,2)` |
| `eventos_rh` | `valor_novo` | `DECIMAL(12,2)` |
| `folhas` | `descontos` | `NUMERIC(10,2)` |
| `atrasos` | `valor` | `DECIMAL(15,2)` |
| `adicionais` | `valor` | `DECIMAL(15,2)` |
| `gratificacoes` | `valor` | `DECIMAL(15,2)` |
| `comissoes` | `valor` | `DECIMAL(15,2)` |
| `recibos_ferias` | `valor` | `DECIMAL(15,2)` |
| `recibos_rescisao` | `valor` | `DECIMAL(15,2)` |
| `darfs` | `valor` | `DECIMAL(15,2)` |
| `grrf` | `valor` | `DECIMAL(15,2)` |
| `trct` | `valor` | `DECIMAL(15,2)` |
| `homologacoes` | `valor` | `DECIMAL(15,2)` |
| `exames_medicos` | `valor` | `DECIMAL(15,2)` |
| `cas` | `valor` | `DECIMAL(15,2)` |
| `avaliacoes` | `valor` | `DECIMAL(15,2)` |
| `report_dispatch_attempts` | `total_registros` | `integer` |
| `afd_geracoes` | `total_colaboradores` | `integer` |
| `afd_geracoes` | `total_marcacoes` | `integer` |
