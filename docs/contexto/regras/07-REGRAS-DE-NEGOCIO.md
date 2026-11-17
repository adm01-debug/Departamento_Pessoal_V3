# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `3084304556` · branch `main` · 2026-11-17 20:11 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

_Nenhum arquivo em `manual/`. Copie `manual/TEMPLATE-regras-de-negocio.md` para `manual/regras.md` e preencha._

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real em `06`)

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `ponto_auditoria` | Users can view their own point audit | SELECT | authenticated | permissive | `(("usuario_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1 FROM "public"."registros_ponto" "rp" WHERE (("rp"."id" = "ponto_auditoria"."registro_id") AND ("rp"."colaborador_id" IN ( SELECT "colaboradores"."id" FROM "public"."colaboradores" WHERE ("colaboradores"."empresa_id" IN ( SELECT "public"."get_use …` |  |
| `user_empresas` | Usuários podem ver suas associações | SELECT | public | permissive | `("user_id" = "auth"."uid"())` |  |
| `fila_notificacoes` | Usuários podem ver suas próprias notificações | SELECT | public | permissive | `("auth"."uid"() = "user_id")` |  |
| `dp_user_roles` | admin_full | ALL | authenticated | permissive | `(("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'rh'::"text"]))` |  |
| `dp_audit_log` | auth_own_events | SELECT | authenticated | permissive | `("actor_user_id" = "auth"."uid"())` |  |
| `curriculos_arquivos` | empresa_isolation_curriculos_arquivos | ALL | authenticated | permissive | `("empresa_id" = "public"."get_auth_empresa_id"())` | `("empresa_id" = "public"."get_auth_empresa_id"())` |
| `onboarding_documentos_obrigatorios` | empresa_isolation_onboarding_documentos_obrigatorios | ALL | authenticated | permissive | `("empresa_id" = "public"."get_auth_empresa_id"())` | `("empresa_id" = "public"."get_auth_empresa_id"())` |
| `onboarding_kits` | empresa_isolation_onboarding_kits | ALL | authenticated | permissive | `("empresa_id" = "public"."get_auth_empresa_id"())` | `("empresa_id" = "public"."get_auth_empresa_id"())` |
| `triagem_notas` | empresa_isolation_triagem_notas | ALL | authenticated | permissive | `("empresa_id" = "public"."get_auth_empresa_id"())` | `("empresa_id" = "public"."get_auth_empresa_id"())` |
| `vaga_entrevistas` | empresa_isolation_vaga_entrevistas | ALL | authenticated | permissive | `("empresa_id" = "public"."get_auth_empresa_id"())` | `("empresa_id" = "public"."get_auth_empresa_id"())` |
| `vaga_etapas` | empresa_isolation_vaga_etapas | ALL | authenticated | permissive | `("empresa_id" = "public"."get_auth_empresa_id"())` | `("empresa_id" = "public"."get_auth_empresa_id"())` |
| `dp_user_roles` | own_roles | SELECT | authenticated | permissive | `("user_id" = "auth"."uid"())` |  |
| `dp_data_catalog` | rh_readonly | SELECT | authenticated | permissive | `(("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['rh'::"text", 'admin'::"text", 'auditoria'::"text"]))` |  |
| `dp_user_roles` | service_full | ALL | service_role | permissive | `true` | `true` |
| `dp_environments` | service_role_env | ALL | service_role | permissive | `true` | `true` |
| `dp_data_catalog` | service_role_full | ALL | service_role | permissive | `true` | `true` |
| `dp_audit_config` | service_role_full_audit_config | ALL | service_role | permissive | `true` | `true` |
| `dp_backup_runbook` | service_role_full_runbook | ALL | service_role | permissive | `true` | `true` |
| `dp_audit_log` | service_role_insert_only | INSERT | service_role | permissive |  | `true` |
| `dp_mcp_config` | service_role_mcp_config | ALL | service_role | permissive | `true` | `true` |
| `dp_retention_policy` | service_role_only_retention | ALL | service_role | permissive | `true` | `true` |
| `dp_audit_log` | service_role_select | SELECT | service_role | permissive | `true` |  |
| `medidas_disciplinares_integracao` | tenant_medidas_integracao_admin | ALL | authenticated | permissive | `(("empresa_id" IN ( SELECT "public"."get_user_empresas"("auth"."uid"()) AS "get_user_empresas")) AND ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'rh'::"public"."app_role")))` | `("empresa_id" IN ( SELECT "public"."get_user_empresas"("auth"."uid"()) AS "get_user_empresas"))` |
| `medidas_disciplinares_integracao` | tenant_medidas_integracao_select | SELECT | authenticated | permissive | `("empresa_id" IN ( SELECT "public"."get_user_empresas"("auth"."uid"()) AS "get_user_empresas"))` |  |
| `storage.objects` | tenant_delete_comprovantes_despesas | DELETE | authenticated | permissive | `(("bucket_id" = 'comprovantes-despesas'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")) AND (("owner" = "auth"."uid"()) OR "public"."user_can_manage_tenant_storage"("auth"."uid"(), "public"."storage_path_empresa_id"("name"))))` |  |
| `storage.objects` | tenant_delete_contabilidade_anexos | DELETE | authenticated | permissive | `(("bucket_id" = 'contabilidade-anexos'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")) AND (("owner" = "auth"."uid"()) OR "public"."user_can_manage_tenant_storage"("auth"."uid"(), "public"."storage_path_empresa_id"("name"))))` |  |
| `storage.objects` | tenant_insert_comprovantes_despesas | INSERT | authenticated | permissive |  | `(("bucket_id" = 'comprovantes-despesas'::"text") AND ("owner" = "auth"."uid"()) AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")))` |
| `storage.objects` | tenant_insert_contabilidade_anexos | INSERT | authenticated | permissive |  | `(("bucket_id" = 'contabilidade-anexos'::"text") AND ("owner" = "auth"."uid"()) AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")))` |
| `storage.objects` | tenant_select_comprovantes_despesas | SELECT | authenticated | permissive | `(("bucket_id" = 'comprovantes-despesas'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")))` |  |
| `storage.objects` | tenant_select_contabilidade_anexos | SELECT | authenticated | permissive | `(("bucket_id" = 'contabilidade-anexos'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")))` |  |
| `storage.objects` | tenant_select_relatorios_privados | SELECT | authenticated | permissive | `(("bucket_id" = 'relatorios-privados'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")))` |  |
| `storage.objects` | tenant_select_sst_programas | SELECT | authenticated | permissive | `(("bucket_id" = 'sst-programas'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")))` |  |
| `storage.objects` | tenant_update_comprovantes_despesas | UPDATE | authenticated | permissive | `(("bucket_id" = 'comprovantes-despesas'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")) AND (("owner" = "auth"."uid"()) OR "public"."user_can_manage_tenant_storage"("auth"."uid"(), "public"."storage_path_empresa_id"("name"))))` | `(("bucket_id" = 'comprovantes-despesas'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")) AND (("owner" = "auth"."uid"()) OR "public"."user_can_manage_tenant_storage"("auth"."uid"(), "public"."storage_path_empresa_id"("name"))))` |
| `storage.objects` | tenant_update_contabilidade_anexos | UPDATE | authenticated | permissive | `(("bucket_id" = 'contabilidade-anexos'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")) AND (("owner" = "auth"."uid"()) OR "public"."user_can_manage_tenant_storage"("auth"."uid"(), "public"."storage_path_empresa_id"("name"))))` | `(("bucket_id" = 'contabilidade-anexos'::"text") AND "public"."user_belongs_to_empresa"("auth"."uid"(), "public"."storage_path_empresa_id"("name")) AND (("owner" = "auth"."uid"()) OR "public"."user_can_manage_tenant_storage"("auth"."uid"(), "public"."storage_path_empresa_id"("name"))))` |
| `empresas` | empresa_select | SELECT | public | permissive | `id = public.user_empresa_id() OR auth.jwt() ->> 'role' = 'super_admin'` |  |
| `empresas` | empresa_insert | INSERT | public | permissive |  | `auth.jwt() ->> 'role' = 'super_admin'` |
| `empresas` | empresa_update | UPDATE | public | permissive | `id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'super_admin')` |  |
| `empresas` | empresa_delete | DELETE | public | permissive | `auth.jwt() ->> 'role' = 'super_admin'` |  |
| `colaboradores` | colab_select | SELECT | public | permissive | `empresa_id = public.user_empresa_id()` |  |
| `colaboradores` | colab_insert | INSERT | public | permissive |  | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')` |
| `colaboradores` | colab_update | UPDATE | public | permissive | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')` |  |
| `colaboradores` | colab_delete | DELETE | public | permissive | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' = 'admin'` |  |
| `departamentos` | depto_select | SELECT | public | permissive | `empresa_id = public.user_empresa_id()` |  |
| `departamentos` | depto_all | ALL | public | permissive | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')` |  |
| `cargos` | cargos_select | SELECT | public | permissive | `empresa_id = public.user_empresa_id()` |  |
| `cargos` | cargos_all | ALL | public | permissive | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh')` |  |
| `folha_pagamento` | folha_select | SELECT | public | permissive | `empresa_id = public.user_empresa_id()` |  |
| `folha_pagamento` | folha_all | ALL | public | permissive | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' IN ('admin', 'rh', 'financeiro')` |  |
| `ferias` | ferias_select | SELECT | public | permissive | `colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())` |  |
| `ferias` | ferias_all | ALL | public | permissive | `colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id()) AND auth.jwt() ->> 'role' IN ('admin', 'rh')` |  |
| `ponto_registros` | ponto_select | SELECT | public | permissive | `colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id())` |  |
| `ponto_registros` | ponto_all | ALL | public | permissive | `colaborador_id IN (SELECT id FROM colaboradores WHERE empresa_id = public.user_empresa_id()) AND auth.jwt() ->> 'role' IN ('admin', 'rh')` |  |
| `auditoria` | audit_select | SELECT | public | permissive | `empresa_id = public.user_empresa_id() AND auth.jwt() ->> 'role' = 'admin'` |  |
| `notificacoes` | notif_select | SELECT | public | permissive | `usuario_id = auth.uid() OR empresa_id = public.user_empresa_id()` |  |
| `notificacoes` | notif_update | UPDATE | public | permissive | `usuario_id = auth.uid()` |  |
| `saved_filters` | Users can manage own filters | ALL | public | permissive | `auth.uid() = user_id` |  |
| `saved_filters` | Users can view own filters | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `saved_filters` | Users can insert own filters | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `saved_filters` | Users can update own filters | UPDATE | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `saved_filters` | Users can delete own filters | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `entity_versions` | Users can insert versions | INSERT | public | permissive |  | `auth.uid() = changed_by OR changed_by IS NULL` |
| `storage.objects` | Public can upload signatures via token | INSERT | public | permissive |  | `bucket_id = 'assinaturas'` |
| `storage.objects` | Public can view signatures via token | SELECT | public | permissive | `bucket_id = 'assinaturas'` |  |
| `jornadas` | jornadas_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `jornadas` | jornadas_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `jornadas` | jornadas_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `jornadas` | jornadas_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `turnos` | turnos_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `turnos` | turnos_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `turnos` | turnos_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `turnos` | turnos_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `atrasos` | atrasos_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `atrasos` | atrasos_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `atrasos` | atrasos_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `atrasos` | atrasos_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `adicionais` | adicionais_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `adicionais` | adicionais_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `adicionais` | adicionais_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `adicionais` | adicionais_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `gratificacoes` | gratificacoes_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `gratificacoes` | gratificacoes_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `gratificacoes` | gratificacoes_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `gratificacoes` | gratificacoes_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `pensoes` | pensoes_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `pensoes` | pensoes_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `pensoes` | pensoes_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `pensoes` | pensoes_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `holerites` | holerites_select | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `holerites` | holerites_insert | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `holerites` | holerites_update | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `holerites` | holerites_delete | DELETE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `asos` | asos_all | ALL | public | permissive | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` |
| `treinamentos` | treinamentos_all | ALL | public | permissive | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` |
| `colaboradores_historico` | colaboradores_historico_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `colaboradores_historico` | colaboradores_historico_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `colaboradores_historico` | colaboradores_historico_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `folha_competencias` | folha_competencias_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `folha_competencias` | folha_competencias_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `folha_competencias` | folha_competencias_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `folha_rubricas` | folha_rubricas_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `folha_rubricas` | folha_rubricas_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `folha_rubricas` | folha_rubricas_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `folha_calculos` | folha_calculos_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `folha_calculos` | folha_calculos_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `folha_calculos` | folha_calculos_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `ponto_banco_horas` | ponto_banco_horas_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `ponto_banco_horas` | ponto_banco_horas_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `ponto_banco_horas` | ponto_banco_horas_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `ponto_escalas` | ponto_escalas_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `ponto_escalas` | ponto_escalas_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `ponto_escalas` | ponto_escalas_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `ponto_compensacoes` | ponto_compensacoes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `ponto_compensacoes` | ponto_compensacoes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `ponto_compensacoes` | ponto_compensacoes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `ferias_programacao` | ferias_programacao_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `ferias_programacao` | ferias_programacao_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `ferias_programacao` | ferias_programacao_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `ferias_abono` | ferias_abono_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `ferias_abono` | ferias_abono_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `ferias_abono` | ferias_abono_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `rescisao_simulacoes` | rescisao_simulacoes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `rescisao_simulacoes` | rescisao_simulacoes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `rescisao_simulacoes` | rescisao_simulacoes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `rescisao_homologacoes` | rescisao_homologacoes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `rescisao_homologacoes` | rescisao_homologacoes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `rescisao_homologacoes` | rescisao_homologacoes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `beneficios_elegibilidade` | beneficios_elegibilidade_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `beneficios_elegibilidade` | beneficios_elegibilidade_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `beneficios_elegibilidade` | beneficios_elegibilidade_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `beneficios_movimentacoes` | beneficios_movimentacoes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `beneficios_movimentacoes` | beneficios_movimentacoes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `beneficios_movimentacoes` | beneficios_movimentacoes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `esocial_lotes` | esocial_lotes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `esocial_lotes` | esocial_lotes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `esocial_lotes` | esocial_lotes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `esocial_retornos` | esocial_retornos_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `esocial_retornos` | esocial_retornos_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `esocial_retornos` | esocial_retornos_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `documentos_assinaturas` | documentos_assinaturas_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `documentos_assinaturas` | documentos_assinaturas_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `documentos_assinaturas` | documentos_assinaturas_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `documentos_versoes` | documentos_versoes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `documentos_versoes` | documentos_versoes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `documentos_versoes` | documentos_versoes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `treinamentos_certificados` | treinamentos_certificados_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `treinamentos_certificados` | treinamentos_certificados_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `treinamentos_certificados` | treinamentos_certificados_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `treinamentos_avaliacoes` | treinamentos_avaliacoes_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `treinamentos_avaliacoes` | treinamentos_avaliacoes_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `treinamentos_avaliacoes` | treinamentos_avaliacoes_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `sst_exames` | sst_exames_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `sst_exames` | sst_exames_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `sst_exames` | sst_exames_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `sst_epis` | sst_epis_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `sst_epis` | sst_epis_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `sst_epis` | sst_epis_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `auditoria_logs` | auditoria_logs_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `auditoria_logs` | auditoria_logs_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `notificacoes_templates` | notificacoes_templates_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `notificacoes_templates` | notificacoes_templates_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `notificacoes_templates` | notificacoes_templates_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `integracao_logs` | integracao_logs_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `integracao_logs` | integracao_logs_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `integracao_logs` | integracao_logs_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `cache_tabelas` | cache_tabelas_select | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `cache_tabelas` | cache_tabelas_insert | INSERT | public | permissive |  | `auth.role() = 'authenticated'` |
| `cache_tabelas` | cache_tabelas_update | UPDATE | public | permissive | `auth.role() = 'authenticated'` |  |
| `user_sessions` | Users can view own sessions | SELECT | authenticated | permissive | `user_id = auth.uid() OR public.is_admin(auth.uid())` |  |
| `password_history` | Users can view own password history | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `webauthn_credentials` | Users can view their own credentials | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `webauthn_credentials` | Users can update their own credentials | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `webauthn_challenges` | Allow all operations on challenges | ALL | public | permissive | `true` | `true` |
| `role_permissions` | Usuários autenticados podem visualizar role_permissions | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `password_reset_requests` | Users can view their own requests | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `saved_filters` | Users manage own filters | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `storage.objects` | Auth users upload contratacao | ALL | authenticated | permissive | `bucket_id = 'contratacao'` | `bucket_id = 'contratacao'` |
| `tipos_desligamento` | tipos_desligamento_read | SELECT | authenticated | permissive | `true` |  |
| `tipos_aviso_previo` | tipos_aviso_previo_read | SELECT | authenticated | permissive | `true` |  |
| `tipos_deficiencia` | tipos_deficiencia_read | SELECT | authenticated | permissive | `true` |  |
| `tipos_pagamento` | tipos_pagamento_read | SELECT | authenticated | permissive | `true` |  |
| `tipos_salario` | tipos_salario_read | SELECT | authenticated | permissive | `true` |  |
| `relacionamentos_dependentes` | relacionamentos_dependentes_read | SELECT | authenticated | permissive | `true` |  |
| `generos_documento` | generos_documento_read | SELECT | authenticated | permissive | `true` |  |
| `tipos_visto` | tipos_visto_read | SELECT | authenticated | permissive | `true` |  |
| `condicoes_ingresso` | condicoes_ingresso_read | SELECT | authenticated | permissive | `true` |  |
| `tempos_residencia` | tempos_residencia_read | SELECT | authenticated | permissive | `true` |  |
| `descricoes_logradouro` | descricoes_logradouro_read | SELECT | authenticated | permissive | `true` |  |
| `categorias_trabalhador` | categorias_trabalhador_read | SELECT | authenticated | permissive | `true` |  |
| `relacionamentos_contato_emergencia` | relacionamentos_contato_emergencia_read | SELECT | authenticated | permissive | `true` |  |
| `motivos_afastamento` | motivos_afastamento_read | SELECT | authenticated | permissive | `true` |  |
| `banco_horas` | empresa_banco_horas | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `pesquisas` | empresa_pesquisas | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `turnos` | empresa_turnos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `escalas_trabalho` | empresa_escalas_trabalho | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `workflows_definicoes` | empresa_workflows_def | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `workflows_execucoes` | empresa_workflows_exec | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `despesas` | empresa_despesas | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `controle_acesso` | empresa_controle_acesso | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `lgpd_consentimentos` | empresa_lgpd_consentimentos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `ciclos_avaliacao` | ciclos_avaliacao_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `ciclos_avaliacao` | ciclos_avaliacao_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `metas_okrs` | metas_okrs_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `metas_okrs` | metas_okrs_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `metas_okrs` | metas_okrs_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `pdis` | pdis_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `pdis` | pdis_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `pdis` | pdis_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `competencias_matriz` | competencias_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `competencias_matriz` | competencias_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `competencias_matriz` | competencias_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `catalogo_cursos` | catalogo_cursos_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `catalogo_cursos` | catalogo_cursos_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `catalogo_cursos` | catalogo_cursos_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `catalogo_cursos` | catalogo_cursos_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `trilhas_aprendizado` | trilhas_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `trilhas_aprendizado` | trilhas_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `trilhas_aprendizado` | trilhas_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `trilhas_aprendizado` | trilhas_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `inscricoes_cursos` | inscricoes_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `inscricoes_cursos` | inscricoes_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `inscricoes_cursos` | inscricoes_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `inscricoes_cursos` | inscricoes_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `trilhas_cursos` | trilhas_cursos_select | SELECT | authenticated | permissive | `trilha_id IN (SELECT id FROM public.trilhas_aprendizado WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |  |
| `trilhas_cursos` | trilhas_cursos_insert | INSERT | authenticated | permissive |  | `trilha_id IN (SELECT id FROM public.trilhas_aprendizado WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `trilhas_cursos` | trilhas_cursos_delete | DELETE | authenticated | permissive | `trilha_id IN (SELECT id FROM public.trilhas_aprendizado WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |  |
| `metas_okrs` | metas_okrs_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `pdis` | pdis_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `competencias_matriz` | competencias_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `escalas` | escalas_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `escalas` | escalas_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `escalas` | escalas_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `escalas` | escalas_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `comunicados_leituras` | comunicados_leituras_select | SELECT | authenticated | permissive | `usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `comunicados_leituras` | comunicados_leituras_insert | INSERT | authenticated | permissive |  | `usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `comunicados_leituras` | comunicados_leituras_update | UPDATE | authenticated | permissive | `usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` | `usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `comunicados_leituras` | comunicados_leituras_delete | DELETE | authenticated | permissive | `usuario_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.comunicados c WHERE c.id = comunicado_id AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `pesquisas_perguntas` | pesquisas_perguntas_select | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `pesquisas_perguntas` | pesquisas_perguntas_insert | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `pesquisas_perguntas` | pesquisas_perguntas_update | UPDATE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `pesquisas_perguntas` | pesquisas_perguntas_delete | DELETE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `pesquisas_respostas` | pesquisas_respostas_select | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `pesquisas_respostas` | pesquisas_respostas_insert | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `pesquisas_respostas` | pesquisas_respostas_update | UPDATE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `pesquisas_respostas` | pesquisas_respostas_delete | DELETE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_id AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `workflows_etapas` | workflows_etapas_select | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.workflows_definicoes w WHERE w.id = workflow_id AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `workflows_etapas` | workflows_etapas_insert | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.workflows_definicoes w WHERE w.id = workflow_id AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `workflows_etapas` | workflows_etapas_update | UPDATE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.workflows_definicoes w WHERE w.id = workflow_id AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` | `EXISTS ( SELECT 1 FROM public.workflows_definicoes w WHERE w.id = workflow_id AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `workflows_etapas` | workflows_etapas_delete | DELETE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.workflows_definicoes w WHERE w.id = workflow_id AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `workflows_historico` | workflows_historico_select | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.workflows_execucoes e WHERE e.id = execucao_id AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `workflows_historico` | workflows_historico_insert | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.workflows_execucoes e WHERE e.id = execucao_id AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `workflows_historico` | workflows_historico_update | UPDATE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.workflows_execucoes e WHERE e.id = execucao_id AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` | `EXISTS ( SELECT 1 FROM public.workflows_execucoes e WHERE e.id = execucao_id AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |
| `workflows_historico` | workflows_historico_delete | DELETE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.workflows_execucoes e WHERE e.id = execucao_id AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid())) )` |  |
| `beneficios` | tenant_beneficios | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `campos_customizados` | tenant_campos_customizados | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `cargos` | tenant_cargos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `centros_custo` | tenant_centros_custo | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `configuracoes_intervalo` | tenant_configuracoes_intervalo | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `contratos` | tenant_contratos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `dados_estagiario` | tenant_dados_estagiario | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `dctfweb_declaracoes` | tenant_dctfweb_declaracoes | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `esocial_eventos` | tenant_esocial_eventos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `esocial_lotes` | tenant_esocial_lotes | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `feriados` | tenant_feriados | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `ferias_coletivas` | tenant_ferias_coletivas | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `ferias_solicitacoes` | tenant_ferias_solicitacoes | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `guias_fgts` | tenant_guias_fgts | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `guias_inss` | tenant_guias_inss | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `historico_contratos` | tenant_historico_contratos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `jornadas` | tenant_jornadas | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `locais_trabalho` | tenant_locais_trabalho | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `lotacoes` | tenant_lotacoes | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `planos_saude` | tenant_planos_saude | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `sefip_arquivos` | tenant_sefip_arquivos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `solicitacoes_hora_extra` | tenant_solicitacoes_hora_extra | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `times` | tenant_times | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `treinamentos` | tenant_treinamentos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `vales_alimentacao` | tenant_vales_alimentacao | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `webhooks` | tenant_webhooks | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `webhooks_config` | tenant_webhooks_config | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `ajustes_ponto` | tenant_ajustes_ponto | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `beneficiarios_seguro` | tenant_beneficiarios_seguro | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `colaborador_beneficios` | tenant_colaborador_beneficios | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `convenios_colaboradores` | tenant_convenios_colaboradores | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `dados_estrangeiro` | tenant_dados_estrangeiro | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `deficiencias` | tenant_deficiencias | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `documentos` | tenant_documentos | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `eventos_variaveis` | tenant_eventos_variaveis | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `historico_cargo` | tenant_historico_cargo | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `periodos_experiencia` | tenant_periodos_experiencia | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `promocoes` | tenant_promocoes | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `recargas_vale` | tenant_recargas_vale | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `seguros_colaboradores` | tenant_seguros_colaboradores | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `sinistros_seguro` | tenant_sinistros_seguro | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `transferencias` | tenant_transferencias | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `treinamento_participantes` | tenant_treinamento_participantes | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `vales_transporte` | tenant_vales_transporte | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `valores_campos_customizados` | tenant_valores_campos_customizados | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `vinculos` | tenant_vinculos | ALL | authenticated | permissive | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `ferias_aprovacoes` | tenant_ferias_aprovacoes | ALL | authenticated | permissive | `ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| `ferias_arquivos` | tenant_ferias_arquivos | ALL | authenticated | permissive | `ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` | `ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))` |
| … +863 linhas — lista completa em `context.json` | | | | | | |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada)

| Tabela | Coluna | Regra |
|---|---|---|
| `auth.audit_log_entries` | `id` | obrigatório |
| `auth.audit_log_entries` | `ip_address` | default ''::character |
| `auth.audit_log_entries` | `(tabela)` | constraint audit_log_entries_pkey PRIMARY KEY ("id") |
| `auth.custom_oauth_providers` | `id` | default "gen_random_uuid"() |
| `auth.custom_oauth_providers` | `provider_type` | obrigatório |
| `auth.custom_oauth_providers` | `identifier` | obrigatório |
| `auth.custom_oauth_providers` | `name` | obrigatório |
| `auth.custom_oauth_providers` | `client_id` | obrigatório |
| `auth.custom_oauth_providers` | `client_secret` | obrigatório |
| `auth.custom_oauth_providers` | `acceptable_client_ids` | default '{}'::"text"[] |
| `auth.custom_oauth_providers` | `scopes` | default '{}'::"text"[] |
| `auth.custom_oauth_providers` | `pkce_enabled` | default true |
| `auth.custom_oauth_providers` | `attribute_mapping` | default '{}'::"jsonb" |
| `auth.custom_oauth_providers` | `authorization_params` | default '{}'::"jsonb" |
| `auth.custom_oauth_providers` | `enabled` | default true |
| `auth.custom_oauth_providers` | `email_optional` | default false |
| `auth.custom_oauth_providers` | `skip_nonce_check` | default false |
| `auth.custom_oauth_providers` | `created_at` | default "now"() |
| `auth.custom_oauth_providers` | `updated_at` | default "now"() |
| `auth.custom_oauth_providers` | `custom_claims_allowlist` | default '{}'::"text"[] |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK ((("authorization_url" IS NULL) OR ("authorization_url" ~~ 'https://%'::"text"))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK ((("authorization_url" IS NULL) OR ("char_length"("authorization_url") <= 2048))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_client_id_length" CHECK ((("char_length"("client_id") >= 1) AND ("char_length"("client_id") <= 512))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK ((("discovery_url" IS NULL) OR ("char_length"("discovery_url") <= 2048))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (("identifier" ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::"text")) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_issuer_length" CHECK ((("issuer" IS NULL) OR (("char_length"("issuer") >= 1) AND ("char_length"("issuer") <= 2048)))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK ((("jwks_uri" IS NULL) OR ("jwks_uri" ~~ 'https://%'::"text"))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK ((("jwks_uri" IS NULL) OR ("char_length"("jwks_uri") <= 2048))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK ((("provider_type" <> 'oauth2'::"text") OR (("authorization_url" IS NOT NULL) AND ("token_url" IS NOT NULL) AND ("userinfo_url" IS NOT NULL)))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("discovery_url" IS NULL) OR ("discovery_url" ~~ 'https://%'::"text"))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NULL) OR ("issuer" ~~ 'https://%'::"text"))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NOT NULL))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['oauth2'::"text", 'oidc'::"text"]))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_token_url_https" CHECK ((("token_url" IS NULL) OR ("token_url" ~~ 'https://%'::"text"))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_token_url_length" CHECK ((("token_url" IS NULL) OR ("char_length"("token_url") <= 2048))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK ((("userinfo_url" IS NULL) OR ("userinfo_url" ~~ 'https://%'::"text"))) |
| `auth.custom_oauth_providers` | `(tabela)` | CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK ((("userinfo_url" IS NULL) OR ("char_length"("userinfo_url") <= 2048))) |
| `auth.custom_oauth_providers` | `(tabela)` | constraint custom_oauth_providers_identifier_key UNIQUE ("identifier") |
| `auth.custom_oauth_providers` | `(tabela)` | constraint custom_oauth_providers_pkey PRIMARY KEY ("id") |
| `auth.flow_state` | `id` | obrigatório |
| `auth.flow_state` | `provider_type` | obrigatório |
| `auth.flow_state` | `authentication_method` | obrigatório |
| `auth.flow_state` | `email_optional` | default false |
| `auth.flow_state` | `(tabela)` | constraint flow_state_pkey PRIMARY KEY ("id") |
| `auth.identities` | `provider_id` | obrigatório |
| `auth.identities` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `auth.identities` | `identity_data` | obrigatório |
| `auth.identities` | `provider` | obrigatório |
| `auth.identities` | `id` | default "gen_random_uuid"() |
| `auth.identities` | `(tabela)` | constraint identities_pkey PRIMARY KEY ("id") |
| `auth.identities` | `(tabela)` | constraint identities_provider_id_provider_unique UNIQUE ("provider_id", "provider") |
| `auth.identities` | `(tabela)` | constraint identities_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.instances` | `id` | obrigatório |
| `auth.instances` | `(tabela)` | constraint instances_pkey PRIMARY KEY ("id") |
| `auth.mfa_amr_claims` | `session_id` | obrigatório; FK → sessions.id ON DELETE CASCADE |
| `auth.mfa_amr_claims` | `created_at` | obrigatório |
| `auth.mfa_amr_claims` | `updated_at` | obrigatório |
| `auth.mfa_amr_claims` | `authentication_method` | obrigatório |
| `auth.mfa_amr_claims` | `id` | obrigatório |
| `auth.mfa_amr_claims` | `(tabela)` | constraint amr_id_pk PRIMARY KEY ("id") |
| `auth.mfa_amr_claims` | `(tabela)` | constraint mfa_amr_claims_session_id_authentication_method_pkey UNIQUE ("session_id", "authentication_method") |
| `auth.mfa_amr_claims` | `(tabela)` | constraint mfa_amr_claims_session_id_fkey FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE |
| `auth.mfa_challenges` | `id` | obrigatório |
| `auth.mfa_challenges` | `factor_id` | obrigatório; FK → mfa_factors.id ON DELETE CASCADE |
| `auth.mfa_challenges` | `created_at` | obrigatório |
| `auth.mfa_challenges` | `ip_address` | obrigatório |
| `auth.mfa_challenges` | `(tabela)` | constraint mfa_challenges_pkey PRIMARY KEY ("id") |
| `auth.mfa_challenges` | `(tabela)` | constraint mfa_challenges_auth_factor_id_fkey FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE |
| `auth.mfa_factors` | `id` | obrigatório |
| `auth.mfa_factors` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `auth.mfa_factors` | `factor_type` | obrigatório |
| `auth.mfa_factors` | `status` | obrigatório |
| `auth.mfa_factors` | `created_at` | obrigatório |
| `auth.mfa_factors` | `updated_at` | obrigatório |
| `auth.mfa_factors` | `(tabela)` | constraint mfa_factors_last_challenged_at_key UNIQUE ("last_challenged_at") |
| `auth.mfa_factors` | `(tabela)` | constraint mfa_factors_pkey PRIMARY KEY ("id") |
| `auth.mfa_factors` | `(tabela)` | constraint mfa_factors_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.oauth_authorizations` | `id` | obrigatório |
| `auth.oauth_authorizations` | `authorization_id` | obrigatório |
| `auth.oauth_authorizations` | `client_id` | obrigatório; FK → oauth_clients.id ON DELETE CASCADE |
| `auth.oauth_authorizations` | `user_id` | FK → users.id ON DELETE CASCADE |
| `auth.oauth_authorizations` | `redirect_uri` | obrigatório |
| `auth.oauth_authorizations` | `scope` | obrigatório |
| `auth.oauth_authorizations` | `response_type` | default 'code'::"auth"."oauth_response_type" |
| `auth.oauth_authorizations` | `status` | default 'pending'::"auth"."oauth_authorization_status" |
| `auth.oauth_authorizations` | `created_at` | default "now"() |
| `auth.oauth_authorizations` | `expires_at` | default ("now"() |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)) |
| `auth.oauth_authorizations` | `(tabela)` | CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096)) |
| `auth.oauth_authorizations` | `(tabela)` | constraint oauth_authorizations_authorization_code_key UNIQUE ("authorization_code") |
| `auth.oauth_authorizations` | `(tabela)` | constraint oauth_authorizations_authorization_id_key UNIQUE ("authorization_id") |
| `auth.oauth_authorizations` | `(tabela)` | constraint oauth_authorizations_pkey PRIMARY KEY ("id") |
| `auth.oauth_authorizations` | `(tabela)` | constraint oauth_authorizations_client_id_fkey FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE |
| `auth.oauth_authorizations` | `(tabela)` | constraint oauth_authorizations_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.oauth_client_states` | `id` | obrigatório |
| `auth.oauth_client_states` | `provider_type` | obrigatório |
| `auth.oauth_client_states` | `created_at` | obrigatório |
| `auth.oauth_client_states` | `(tabela)` | constraint oauth_client_states_pkey PRIMARY KEY ("id") |
| `auth.oauth_clients` | `id` | obrigatório |
| `auth.oauth_clients` | `registration_type` | obrigatório |
| `auth.oauth_clients` | `redirect_uris` | obrigatório |
| `auth.oauth_clients` | `grant_types` | obrigatório |
| `auth.oauth_clients` | `created_at` | default "now"() |
| `auth.oauth_clients` | `updated_at` | default "now"() |
| `auth.oauth_clients` | `client_type` | default 'confidential'::"auth"."oauth_client_type" |
| `auth.oauth_clients` | `token_endpoint_auth_method` | obrigatório |
| `auth.oauth_clients` | `(tabela)` | CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)) |
| `auth.oauth_clients` | `(tabela)` | CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)) |
| `auth.oauth_clients` | `(tabela)` | CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048)) |
| `auth.oauth_clients` | `(tabela)` | CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (("token_endpoint_auth_method" = ANY (ARRAY['client_secret_basic'::"text", 'client_secret_post'::"text", 'none'::"text"]))) |
| `auth.oauth_clients` | `(tabela)` | constraint oauth_clients_pkey PRIMARY KEY ("id") |
| `auth.oauth_consents` | `id` | obrigatório |
| `auth.oauth_consents` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `auth.oauth_consents` | `client_id` | obrigatório; FK → oauth_clients.id ON DELETE CASCADE |
| `auth.oauth_consents` | `scopes` | obrigatório |
| `auth.oauth_consents` | `granted_at` | default "now"() |
| `auth.oauth_consents` | `(tabela)` | CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))) |
| `auth.oauth_consents` | `(tabela)` | CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)) |
| `auth.oauth_consents` | `(tabela)` | CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0)) |
| `auth.oauth_consents` | `(tabela)` | constraint oauth_consents_pkey PRIMARY KEY ("id") |
| `auth.oauth_consents` | `(tabela)` | constraint oauth_consents_user_client_unique UNIQUE ("user_id", "client_id") |
| `auth.oauth_consents` | `(tabela)` | constraint oauth_consents_client_id_fkey FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE |
| `auth.oauth_consents` | `(tabela)` | constraint oauth_consents_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.one_time_tokens` | `id` | obrigatório |
| `auth.one_time_tokens` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `auth.one_time_tokens` | `token_type` | obrigatório |
| `auth.one_time_tokens` | `token_hash` | obrigatório |
| `auth.one_time_tokens` | `relates_to` | obrigatório |
| `auth.one_time_tokens` | `created_at` | default "now"() |
| `auth.one_time_tokens` | `updated_at` | default "now"() |
| `auth.one_time_tokens` | `(tabela)` | CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0)) |
| `auth.one_time_tokens` | `(tabela)` | constraint one_time_tokens_pkey PRIMARY KEY ("id") |
| `auth.one_time_tokens` | `(tabela)` | constraint one_time_tokens_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.refresh_tokens` | `id` | default "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass") |
| `auth.refresh_tokens` | `session_id` | FK → sessions.id ON DELETE CASCADE |
| `auth.refresh_tokens` | `(tabela)` | constraint refresh_tokens_pkey PRIMARY KEY ("id") |
| `auth.refresh_tokens` | `(tabela)` | constraint refresh_tokens_token_unique UNIQUE ("token") |
| `auth.refresh_tokens` | `(tabela)` | constraint refresh_tokens_session_id_fkey FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE |
| `auth.saml_providers` | `id` | obrigatório |
| `auth.saml_providers` | `sso_provider_id` | obrigatório; FK → sso_providers.id ON DELETE CASCADE |
| `auth.saml_providers` | `entity_id` | obrigatório |
| `auth.saml_providers` | `metadata_xml` | obrigatório |
| `auth.saml_providers` | `(tabela)` | CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)) |
| `auth.saml_providers` | `(tabela)` | CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))) |
| `auth.saml_providers` | `(tabela)` | CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0)) |
| `auth.saml_providers` | `(tabela)` | constraint saml_providers_entity_id_key UNIQUE ("entity_id") |
| `auth.saml_providers` | `(tabela)` | constraint saml_providers_pkey PRIMARY KEY ("id") |
| `auth.saml_providers` | `(tabela)` | constraint saml_providers_sso_provider_id_fkey FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE |
| `auth.saml_relay_states` | `id` | obrigatório |
| `auth.saml_relay_states` | `sso_provider_id` | obrigatório; FK → sso_providers.id ON DELETE CASCADE |
| `auth.saml_relay_states` | `request_id` | obrigatório |
| `auth.saml_relay_states` | `flow_state_id` | FK → flow_state.id ON DELETE CASCADE |
| `auth.saml_relay_states` | `(tabela)` | CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0)) |
| `auth.saml_relay_states` | `(tabela)` | constraint saml_relay_states_pkey PRIMARY KEY ("id") |
| `auth.saml_relay_states` | `(tabela)` | constraint saml_relay_states_flow_state_id_fkey FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE |
| `auth.saml_relay_states` | `(tabela)` | constraint saml_relay_states_sso_provider_id_fkey FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE |
| `auth.schema_migrations` | `version` | obrigatório |
| `auth.schema_migrations` | `(tabela)` | constraint schema_migrations_pkey PRIMARY KEY ("version") |
| `auth.sessions` | `id` | obrigatório |
| `auth.sessions` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `auth.sessions` | `oauth_client_id` | FK → oauth_clients.id ON DELETE CASCADE |
| `auth.sessions` | `(tabela)` | CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096)) |
| `auth.sessions` | `(tabela)` | constraint sessions_pkey PRIMARY KEY ("id") |
| `auth.sessions` | `(tabela)` | constraint sessions_oauth_client_id_fkey FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE |
| `auth.sessions` | `(tabela)` | constraint sessions_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.sso_domains` | `id` | obrigatório |
| `auth.sso_domains` | `sso_provider_id` | obrigatório; FK → sso_providers.id ON DELETE CASCADE |
| `auth.sso_domains` | `domain` | obrigatório |
| `auth.sso_domains` | `(tabela)` | CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0)) |
| `auth.sso_domains` | `(tabela)` | constraint sso_domains_pkey PRIMARY KEY ("id") |
| `auth.sso_domains` | `(tabela)` | constraint sso_domains_sso_provider_id_fkey FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE |
| `auth.sso_providers` | `id` | obrigatório |
| `auth.sso_providers` | `(tabela)` | CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0))) |
| `auth.sso_providers` | `(tabela)` | constraint sso_providers_pkey PRIMARY KEY ("id") |
| `auth.users` | `id` | obrigatório |
| `auth.users` | `phone` | default NULL::character |
| `auth.users` | `phone_change` | default ''::character |
| `auth.users` | `phone_change_token` | default ''::character |
| `auth.users` | `confirmed_at` | CALCULADA = LEAST("email_confirmed_at", "phone_confirmed_at") |
| `auth.users` | `email_change_token_current` | default ''::character |
| `auth.users` | `email_change_confirm_status` | default 0 |
| `auth.users` | `reauthentication_token` | default ''::character |
| `auth.users` | `is_sso_user` | default false |
| `auth.users` | `is_anonymous` | default false |
| `auth.users` | `(tabela)` | CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2))) |
| `auth.users` | `(tabela)` | constraint users_phone_key UNIQUE ("phone") |
| `auth.users` | `(tabela)` | constraint users_pkey PRIMARY KEY ("id") |
| `auth.webauthn_challenges` | `id` | default "gen_random_uuid"() |
| `auth.webauthn_challenges` | `user_id` | FK → users.id ON DELETE CASCADE |
| `auth.webauthn_challenges` | `challenge_type` | obrigatório |
| `auth.webauthn_challenges` | `session_data` | obrigatório |
| `auth.webauthn_challenges` | `created_at` | default "now"() |
| `auth.webauthn_challenges` | `expires_at` | obrigatório |
| `auth.webauthn_challenges` | `(tabela)` | CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (("challenge_type" = ANY (ARRAY['signup'::"text", 'registration'::"text", 'authentication'::"text"]))) |
| `auth.webauthn_challenges` | `(tabela)` | constraint webauthn_challenges_pkey PRIMARY KEY ("id") |
| `auth.webauthn_challenges` | `(tabela)` | constraint webauthn_challenges_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `auth.webauthn_credentials` | `id` | default "gen_random_uuid"() |
| `auth.webauthn_credentials` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `auth.webauthn_credentials` | `credential_id` | obrigatório |
| `auth.webauthn_credentials` | `public_key` | obrigatório |
| `auth.webauthn_credentials` | `attestation_type` | default ''::"text" |
| `auth.webauthn_credentials` | `sign_count` | default 0 |
| `auth.webauthn_credentials` | `transports` | default '[]'::"jsonb" |
| `auth.webauthn_credentials` | `backup_eligible` | default false |
| `auth.webauthn_credentials` | `backed_up` | default false |
| `auth.webauthn_credentials` | `friendly_name` | default ''::"text" |
| `auth.webauthn_credentials` | `created_at` | default "now"() |
| `auth.webauthn_credentials` | `updated_at` | default "now"() |
| `auth.webauthn_credentials` | `(tabela)` | constraint webauthn_credentials_pkey PRIMARY KEY ("id") |
| `auth.webauthn_credentials` | `(tabela)` | constraint webauthn_credentials_user_id_fkey FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE |
| `despesas` | `id` | default "gen_random_uuid"() |
| `despesas` | `colaborador_id` | obrigatório; FK → colaboradores.id |
| `despesas` | `categoria` | obrigatório |
| `despesas` | `descricao` | obrigatório |
| `despesas` | `valor` | obrigatório |
| `despesas` | `data_despesa` | obrigatório |
| `despesas` | `status` | default 'pendente'::"text" |
| `despesas` | `empresa_id` | FK → empresas.id |
| `despesas` | `created_at` | default "now"() |
| `despesas` | `updated_at` | default "now"() |
| `despesas` | `tipo` | default 'reembolso'::"text" |
| `despesas` | `folha_id` | FK → folhas_pagamento.id ON DELETE SET NULL |
| `despesas` | `(tabela)` | CONSTRAINT "despesas_status_check" CHECK (("status" = ANY (ARRAY['rascunho'::"text", 'pendente'::"text", 'aprovado'::"text", 'rejeitado'::"text", 'integrado_folha'::"text", 'pago'::"text", 'cancelado'::"text"]))) |
| `despesas` | `(tabela)` | CONSTRAINT "despesas_tipo_check" CHECK (("tipo" = ANY (ARRAY['reembolso'::"text", 'adiantamento'::"text", 'despesa_viagem'::"text", 'material'::"text", 'alimentacao'::"text", 'transporte'::"text", 'outro'::"text"]))) |
| `despesas` | `(tabela)` | CONSTRAINT "despesas_valor_positivo" CHECK (("valor" > (0)::numeric)) |
| `despesas` | `(tabela)` | constraint despesas_pkey PRIMARY KEY ("id") |
| `despesas` | `(tabela)` | constraint despesas_colaborador_id_fkey FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") |
| `despesas` | `(tabela)` | constraint despesas_empresa_id_fkey FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") |
| `despesas` | `(tabela)` | constraint despesas_folha_id_fkey FOREIGN KEY ("folha_id") REFERENCES "public"."folhas_pagamento"("id") ON DELETE SET NULL |
| `admissao_tokens` | `id` | default "gen_random_uuid"() |
| `admissao_tokens` | `admissao_id` | obrigatório; FK → admissoes.id ON DELETE CASCADE |
| `admissao_tokens` | `token` | default "encode"("extensions"."gen_random_bytes"(32) |
| `admissao_tokens` | `data_expiracao` | default ("now"() |
| `admissao_tokens` | `dados_preenchidos` | default false |
| `admissao_tokens` | `documentos_enviados` | default false |
| `admissao_tokens` | `contrato_gerado` | default false |
| `admissao_tokens` | `contrato_assinado` | default false |
| `admissao_tokens` | `created_at` | default "now"() |
| `admissao_tokens` | `updated_at` | default "now"() |
| `admissao_tokens` | `(tabela)` | constraint admissao_tokens_pkey PRIMARY KEY ("id") |
| `admissao_tokens` | `(tabela)` | constraint admissao_tokens_token_key UNIQUE ("token") |
| `admissao_tokens` | `(tabela)` | constraint admissao_tokens_admissao_id_fkey FOREIGN KEY ("admissao_id") REFERENCES "public"."admissoes"("id") ON DELETE CASCADE |
| `medidas_disciplinares` | `id` | default "gen_random_uuid"() |
| `medidas_disciplinares` | `colaborador_id` | obrigatório; FK → colaboradores.id ON DELETE RESTRICT |
| `medidas_disciplinares` | `empresa_id` | FK → empresas.id |
| `medidas_disciplinares` | `tipo` | obrigatório |
| `medidas_disciplinares` | `data_ocorrencia` | obrigatório |
| `medidas_disciplinares` | `descricao` | obrigatório |
| `medidas_disciplinares` | `dias_suspensao` | default 0 |
| `medidas_disciplinares` | `status` | default 'pendente'::"text" |
| `medidas_disciplinares` | `created_at` | default "now"() |
| `medidas_disciplinares` | `updated_at` | default "now"() |
| `medidas_disciplinares` | `colaborador_ciente` | default false |
| `medidas_disciplinares` | `recusa_assinatura` | default false |
| `medidas_disciplinares` | `evidenciado_por` | default '[]'::"jsonb" |
| `medidas_disciplinares` | `recorrencia_infrafacao` | default false |
| `medidas_disciplinares` | `prazo_ciencia_dias` | default 3 |
| `medidas_disciplinares` | `status_workflow` | default 'aplicada'::"text" |
| `medidas_disciplinares` | `aprovador_id` | FK → users.id |
| `medidas_disciplinares` | `aprovado_gestor_por` | FK → users.id |
| `medidas_disciplinares` | `aprovado_rh_por` | FK → users.id |
| `medidas_disciplinares` | `aprovado_juridico_por` | FK → users.id |
| `medidas_disciplinares` | `rejeitado_por` | FK → users.id |
| `medidas_disciplinares` | `arquivado_por` | FK → users.id |
| `medidas_disciplinares` | `contestacao_prazo_horas` | default 48 |
| `medidas_disciplinares` | `(tabela)` | CONSTRAINT "medidas_disciplinares_gravidade_check" CHECK ((("gravidade" IS NULL) OR ("gravidade" = ANY (ARRAY['leve'::"text", 'media'::"text", 'grave'::"text", 'gravissima'::"text"])))) |
| `medidas_disciplinares` | `(tabela)` | CONSTRAINT "medidas_disciplinares_status_workflow_check" CHECK (("status_workflow" = ANY (ARRAY['rascunho'::"text", 'aguardando_gestor'::"text", 'aguardando_rh'::"text", 'aguardando_juridico'::"text", 'aplicada'::"text", 'rejeitada'::"text", 'arquivada'::"text", 'contestada'::"text"]))) |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_pkey PRIMARY KEY ("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_aprovado_gestor_por_fkey FOREIGN KEY ("aprovado_gestor_por") REFERENCES "auth"."users"("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_aprovado_juridico_por_fkey FOREIGN KEY ("aprovado_juridico_por") REFERENCES "auth"."users"("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_aprovado_rh_por_fkey FOREIGN KEY ("aprovado_rh_por") REFERENCES "auth"."users"("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_aprovador_id_fkey FOREIGN KEY ("aprovador_id") REFERENCES "auth"."users"("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_arquivado_por_fkey FOREIGN KEY ("arquivado_por") REFERENCES "auth"."users"("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_colaborador_id_fkey FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE RESTRICT |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_empresa_id_fkey FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") |
| `medidas_disciplinares` | `(tabela)` | constraint medidas_disciplinares_rejeitado_por_fkey FOREIGN KEY ("rejeitado_por") REFERENCES "auth"."users"("id") |
| `desligamentos` | `id` | default "gen_random_uuid"() |
| `desligamentos` | `colaborador_id` | obrigatório; FK → colaboradores.id ON DELETE CASCADE |
| `desligamentos` | `tipo` | obrigatório |
| `desligamentos` | `data_desligamento` | obrigatório |
| `desligamentos` | `status` | default 'em_andamento'::"text" |
| `desligamentos` | `salario_base` | default 0 |
| `desligamentos` | `saldo_salario` | default 0 |
| `desligamentos` | `aviso_previo` | default 0 |
| `desligamentos` | `ferias_vencidas` | default 0 |
| `desligamentos` | `ferias_proporcionais` | default 0 |
| `desligamentos` | `terco_constitucional` | default 0 |
| `desligamentos` | `decimo_terceiro` | default 0 |
| `desligamentos` | `multa_fgts` | default 0 |
| `desligamentos` | `total_proventos` | default 0 |
| `desligamentos` | `total_descontos` | default 0 |
| `desligamentos` | `valor_liquido` | default 0 |
| `desligamentos` | `checklist_comunicacao` | default false |
| … +4397 linhas — lista completa em `context.json` | | |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| enforce_bucket_name_length_trigger | BEFORE INSERT OR UPDATE OF "NAME" | `storage.buckets` | `enforce_bucket_name_length` |  |
| protect_buckets_delete | BEFORE DELETE | `storage.buckets` | `protect_delete` |  |
| protect_objects_delete | BEFORE DELETE | `storage.objects` | `protect_delete` |  |
| update_objects_updated_at | BEFORE UPDATE | `storage.objects` | `update_updated_at_column` |  |
| saved_filters_updated_at | BEFORE UPDATE | `saved_filters` | `update_saved_filters_timestamp` |  |
| trigger_saved_filters_updated_at | BEFORE UPDATE | `saved_filters` | `update_saved_filters_updated_at` |  |
| trigger_single_default_filter | BEFORE INSERT OR UPDATE OF IS_DEFAULT | `saved_filters` | `ensure_single_default_filter` | `NEW.is_default = true` |
| colaboradores_updated_at | BEFORE UPDATE | `colaboradores` | `update_colaborador_updated_at` |  |
| on_auth_user_created | AFTER INSERT | `auth.users` | `handle_new_user` |  |
| update_dependentes_updated_at | BEFORE UPDATE | `dependentes` | `update_updated_at_column` |  |
| update_faltas_updated_at | BEFORE UPDATE | `faltas` | `update_updated_at_column` |  |
| update_atrasos_updated_at | BEFORE UPDATE | `atrasos` | `update_updated_at_column` |  |
| update_adicionais_updated_at | BEFORE UPDATE | `adicionais` | `update_updated_at_column` |  |
| update_gratificacoes_updated_at | BEFORE UPDATE | `gratificacoes` | `update_updated_at_column` |  |
| update_comissoes_updated_at | BEFORE UPDATE | `comissoes` | `update_updated_at_column` |  |
| update_pensoes_updated_at | BEFORE UPDATE | `pensoes` | `update_updated_at_column` |  |
| update_emprestimos_consignados_updated_at | BEFORE UPDATE | `emprestimos_consignados` | `update_updated_at_column` |  |
| update_holerites_updated_at | BEFORE UPDATE | `holerites` | `update_updated_at_column` |  |
| update_recibos_ferias_updated_at | BEFORE UPDATE | `recibos_ferias` | `update_updated_at_column` |  |
| trigger_dependentes_updated_at | BEFORE UPDATE | `dependentes` | `update_dependentes_updated_at` |  |
| trigger_jornadas_updated_at | BEFORE UPDATE | `jornadas` | `update_jornadas_updated_at` |  |
| trigger_escalas_updated_at | BEFORE UPDATE | `escalas` | `update_escalas_updated_at` |  |
| trigger_turnos_updated_at | BEFORE UPDATE | `turnos` | `update_turnos_updated_at` |  |
| trigger_faltas_updated_at | BEFORE UPDATE | `faltas` | `update_faltas_updated_at` |  |
| trigger_atrasos_updated_at | BEFORE UPDATE | `atrasos` | `update_atrasos_updated_at` |  |
| trigger_adicionais_updated_at | BEFORE UPDATE | `adicionais` | `update_adicionais_updated_at` |  |
| trigger_gratificacoes_updated_at | BEFORE UPDATE | `gratificacoes` | `update_gratificacoes_updated_at` |  |
| trigger_comissoes_updated_at | BEFORE UPDATE | `comissoes` | `update_comissoes_updated_at` |  |
| trigger_pensoes_updated_at | BEFORE UPDATE | `pensoes` | `update_pensoes_updated_at` |  |
| trigger_emprestimos_consignados_updated_at | BEFORE UPDATE | `emprestimos_consignados` | `update_emprestimos_consignados_updated_at` |  |
| trigger_holerites_updated_at | BEFORE UPDATE | `holerites` | `update_holerites_updated_at` |  |
| trigger_recibos_ferias_updated_at | BEFORE UPDATE | `recibos_ferias` | `update_recibos_ferias_updated_at` |  |
| trigger_colaboradores_historico_updated_at | BEFORE UPDATE | `colaboradores_historico` | `update_colaboradores_historico_updated_at` |  |
| trigger_folha_competencias_updated_at | BEFORE UPDATE | `folha_competencias` | `update_folha_competencias_updated_at` |  |
| trigger_folha_rubricas_updated_at | BEFORE UPDATE | `folha_rubricas` | `update_folha_rubricas_updated_at` |  |
| trigger_folha_calculos_updated_at | BEFORE UPDATE | `folha_calculos` | `update_folha_calculos_updated_at` |  |
| trigger_ponto_banco_horas_updated_at | BEFORE UPDATE | `ponto_banco_horas` | `update_ponto_banco_horas_updated_at` |  |
| trigger_ponto_escalas_updated_at | BEFORE UPDATE | `ponto_escalas` | `update_ponto_escalas_updated_at` |  |
| trigger_ponto_compensacoes_updated_at | BEFORE UPDATE | `ponto_compensacoes` | `update_ponto_compensacoes_updated_at` |  |
| trigger_ferias_programacao_updated_at | BEFORE UPDATE | `ferias_programacao` | `update_ferias_programacao_updated_at` |  |
| trigger_ferias_abono_updated_at | BEFORE UPDATE | `ferias_abono` | `update_ferias_abono_updated_at` |  |
| trigger_rescisao_simulacoes_updated_at | BEFORE UPDATE | `rescisao_simulacoes` | `update_rescisao_simulacoes_updated_at` |  |
| trigger_rescisao_homologacoes_updated_at | BEFORE UPDATE | `rescisao_homologacoes` | `update_rescisao_homologacoes_updated_at` |  |
| trigger_beneficios_elegibilidade_updated_at | BEFORE UPDATE | `beneficios_elegibilidade` | `update_beneficios_elegibilidade_updated_at` |  |
| trigger_beneficios_movimentacoes_updated_at | BEFORE UPDATE | `beneficios_movimentacoes` | `update_beneficios_movimentacoes_updated_at` |  |
| trigger_esocial_lotes_updated_at | BEFORE UPDATE | `esocial_lotes` | `update_esocial_lotes_updated_at` |  |
| trigger_esocial_retornos_updated_at | BEFORE UPDATE | `esocial_retornos` | `update_esocial_retornos_updated_at` |  |
| trigger_documentos_assinaturas_updated_at | BEFORE UPDATE | `documentos_assinaturas` | `update_documentos_assinaturas_updated_at` |  |
| trigger_documentos_versoes_updated_at | BEFORE UPDATE | `documentos_versoes` | `update_documentos_versoes_updated_at` |  |
| trigger_treinamentos_certificados_updated_at | BEFORE UPDATE | `treinamentos_certificados` | `update_treinamentos_certificados_updated_at` |  |
| trigger_treinamentos_avaliacoes_updated_at | BEFORE UPDATE | `treinamentos_avaliacoes` | `update_treinamentos_avaliacoes_updated_at` |  |
| trigger_sst_exames_updated_at | BEFORE UPDATE | `sst_exames` | `update_sst_exames_updated_at` |  |
| trigger_sst_epis_updated_at | BEFORE UPDATE | `sst_epis` | `update_sst_epis_updated_at` |  |
| trigger_auditoria_logs_updated_at | BEFORE UPDATE | `auditoria_logs` | `update_auditoria_logs_updated_at` |  |
| trigger_notificacoes_templates_updated_at | BEFORE UPDATE | `notificacoes_templates` | `update_notificacoes_templates_updated_at` |  |
| trigger_integracao_logs_updated_at | BEFORE UPDATE | `integracao_logs` | `update_integracao_logs_updated_at` |  |
| trigger_cache_tabelas_updated_at | BEFORE UPDATE | `cache_tabelas` | `update_cache_tabelas_updated_at` |  |
| on_auth_user_created_role | AFTER INSERT | `auth.users` | `handle_new_user_role` |  |
| trg_audit_log_mask_sensitive | BEFORE INSERT | `audit_log` | `mask_sensitive_audit_data` |  |
| trg_audit_default_source | BEFORE INSERT | `audit_log_unified` | `audit_log_unified_default_source` |  |
| trg_documentos_afastamento_validacao | BEFORE UPDATE OF VALIDADO | `documentos_afastamento` | `fn_documentos_afastamento_validacao` |  |
| trg_colaborador_sync_cargo_texto | BEFORE INSERT OR UPDATE OF CARGO_ID | `colaboradores` | `fn_colaborador_sync_cargo_texto` |  |
| tr_set_provisoes_folha_total | BEFORE INSERT OR UPDATE OF VALOR_13_SALARIO, VALOR_FERIAS, ENCARGOS_PROVISAO, VALOR_TOTAL | `provisoes_folha` | `set_provisoes_folha_total` |  |
| tr_enforce_report_schedule_authorship | BEFORE INSERT OR UPDATE | `relatorios_agendados` | `enforce_report_schedule_authorship` |  |
| trg_pcs_planos_audit | BEFORE INSERT OR UPDATE | `pcs_planos` | `pcs_set_audit_fields` |  |
| trg_pcs_validate_factor | BEFORE INSERT OR UPDATE | `pcs_fatores` | `pcs_validate_factor` |  |
| trg_pcs_recalc_pontos | BEFORE INSERT OR UPDATE | `pcs_avaliacoes_cargo` | `pcs_recalc_pontos` |  |
| tr_protect_esocial_transport_fields | BEFORE UPDATE | `esocial_eventos` | `protect_esocial_transport_fields` |  |
| trg_sync_holerite_folha_item | AFTER INSERT OR DELETE OR UPDATE OF SALARIO_BASE, TOTAL_PROVENTOS, TOTAL_DESCONTOS, TOTAL_LIQUIDO, INSS_MES, IRRF_MES, FGTS_MES | `folha_itens` | `fn_sync_holerite_from_folha_item` |  |
| trg_provisao_auditoria_empresa | BEFORE INSERT | `provisao_auditoria` | `provisao_auditoria_set_empresa` |  |
| trg_documentos_sync_empresa_id | BEFORE INSERT OR UPDATE OF COLABORADOR_ID | `documentos` | `documentos_sync_empresa_id` |  |
| trg_lgpd_retencao_logs_updated_at | BEFORE UPDATE | `lgpd_retencao_logs` | `update_updated_at_column` |  |
| trg_contas_bancarias_encrypt | BEFORE INSERT OR UPDATE | `contas_bancarias` | `encrypt_contas_bancarias_fields` |  |
| trg_pix_itens_encrypt | BEFORE INSERT OR UPDATE | `pix_itens` | `encrypt_pix_itens_fields` |  |
| trg_feedbacks_360_revisao | BEFORE UPDATE | `feedbacks_360` | `tg_feedbacks_360_revisao` |  |
| update_training_images_updated_at | BEFORE UPDATE | `training_images` | `update_updated_at_column` |  |
| track_training_images_outcomes | BEFORE UPDATE | `training_images` | `training_images_track_outcomes` |  |
| update_training_image_settings_updated_at | BEFORE UPDATE | `training_image_settings` | `update_updated_at_column` |  |
| enqueue_training_image_course | AFTER INSERT | `catalogo_cursos` | `enqueue_training_image_request` |  |
| enqueue_training_image_learning_path | AFTER INSERT | `trilhas_aprendizado` | `enqueue_training_image_request` |  |
| trg_faltas_sync_faltas_periodo | AFTER INSERT OR UPDATE OR DELETE | `faltas` | `fn_faltas_sync_faltas_periodo` |  |
| trg_pensoes_set_empresa | BEFORE INSERT OR UPDATE OF COLABORADOR_ID, EMPRESA_ID | `pensoes` | `fn_pensoes_set_empresa` |  |
| tr_bloquear_aprovacao_ponto_sem_rh | BEFORE INSERT OR UPDATE | `registros_ponto` | `bloquear_aprovacao_ponto_sem_rh` |  |
| ajuste_ponto_status_transition | BEFORE UPDATE OF "STATUS" | `solicitacoes_ajuste_ponto` | `trg_ajuste_ponto_status_transition` |  |
| audit_admissoes | AFTER INSERT OR DELETE OR UPDATE | `admissoes` | `log_audit_change` |  |
| audit_afastamentos | AFTER INSERT OR DELETE OR UPDATE | `afastamentos` | `log_audit_change` |  |
| audit_beneficios | AFTER INSERT OR DELETE OR UPDATE | `beneficios` | `log_audit_change` |  |
| audit_beneficios_colaborador | AFTER INSERT OR DELETE OR UPDATE | `beneficios_colaborador` | `log_audit_change` |  |
| audit_cargos | AFTER INSERT OR DELETE OR UPDATE | `cargos` | `log_audit_change` |  |
| audit_colaboradores | AFTER INSERT OR DELETE OR UPDATE | `colaboradores` | `log_audit_change` |  |
| audit_departamentos | AFTER INSERT OR DELETE OR UPDATE | `departamentos` | `log_audit_change` |  |
| audit_desligamentos | AFTER INSERT OR DELETE OR UPDATE | `desligamentos` | `log_audit_change` |  |
| audit_ferias | AFTER INSERT OR DELETE OR UPDATE | `ferias` | `log_audit_change` |  |
| audit_folhas_pagamento | AFTER INSERT OR DELETE OR UPDATE | `folhas_pagamento` | `log_audit_change` |  |
| audit_holerites | AFTER INSERT OR DELETE OR UPDATE | `holerites` | `log_audit_change` |  |
| audit_registros_ponto | AFTER INSERT OR DELETE OR UPDATE | `registros_ponto` | `log_audit_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `ciclos_avaliacao` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `desligamentos` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `faltas` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `ferias` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `pdis` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `pesquisas` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `solicitacoes_ajuste_ponto` | `trg_audit_status_change` |  |
| audit_status_change | AFTER UPDATE OF "STATUS" | `vagas` | `trg_audit_status_change` |  |
| ciclos_status_transition | BEFORE UPDATE OF "STATUS" | `ciclos_avaliacao` | `trg_ciclos_status_transition` |  |
| desligamentos_status_transition | BEFORE UPDATE OF "STATUS" | `desligamentos` | `trg_desligamentos_status_transition` |  |
| detect_status_anomaly | AFTER INSERT | `audit_log` | `trg_detect_status_anomaly` |  |
| dp_audit_log_integrity_check | BEFORE INSERT | `dp_audit_log` | `dp_audit_log_prevent_future` |  |
| dp_audit_log_no_delete | BEFORE DELETE | `dp_audit_log` | `dp_audit_log_immutable` |  |
| dp_audit_log_no_update | BEFORE UPDATE | `dp_audit_log` | `dp_audit_log_immutable` |  |
| dp_data_catalog_audit | AFTER INSERT OR DELETE OR UPDATE | `dp_data_catalog` | `dp_track_pii_access` |  |
| dp_data_catalog_updated_at | BEFORE UPDATE | `dp_data_catalog` | `dp_set_updated_at` |  |
| dp_retention_updated_at | BEFORE UPDATE | `dp_retention_policy` | `dp_set_updated_at` |  |
| faltas_status_transition | BEFORE UPDATE OF "STATUS" | `faltas` | `trg_faltas_status_transition` |  |
| ferias_bloquear_gozo_sem_pagamento | BEFORE UPDATE OF "STATUS" | `ferias` | `trg_ferias_bloquear_gozo_sem_pagamento` |  |
| ferias_status_transition | BEFORE UPDATE OF "STATUS" | `ferias` | `trg_ferias_status_transition` |  |
| pdis_status_transition | BEFORE UPDATE OF "STATUS" | `pdis` | `trg_pdis_status_transition` |  |
| pesquisas_status_transition | BEFORE UPDATE OF "STATUS" | `pesquisas` | `trg_pesquisas_status_transition` |  |
| set_candidatos_updated_at | BEFORE UPDATE | `candidatos` | `update_updated_at_column` |  |
| set_candidaturas_updated_at | BEFORE UPDATE | `candidaturas` | `update_updated_at_column` |  |
| set_timestamp_beneficio_regras | BEFORE UPDATE | `beneficio_regras_elegibilidade` | `update_updated_at_column` |  |
| set_timestamp_cargo_faixas | BEFORE UPDATE | `cargo_faixas_salariais` | `update_updated_at_column` |  |
| set_timestamp_documento_templates | BEFORE UPDATE | `documento_templates` | `update_updated_at_column` |  |
| set_timestamp_documentos_assinatura | BEFORE UPDATE | `documentos_assinatura` | `update_updated_at_column` |  |
| set_timestamp_instancias | BEFORE UPDATE | `treinamento_instancias` | `update_updated_at_column` |  |
| set_timestamp_metas_okrs | BEFORE UPDATE | `metas_okrs` | `update_updated_at_column` |  |
| set_timestamp_pdi_plano | BEFORE UPDATE | `pdi_plano_desenvolvimento` | `update_updated_at_column` |  |
| set_timestamp_recrutamento_entrevistas | BEFORE UPDATE | `recrutamento_entrevistas` | `update_updated_at_column` |  |
| set_timestamp_recrutamento_testes | BEFORE UPDATE | `recrutamento_testes` | `update_updated_at_column` |  |
| set_timestamp_trilhas | BEFORE UPDATE | `trilhas_aprendizado` | `update_updated_at_column` |  |
| set_vagas_updated_at | BEFORE UPDATE | `vagas` | `update_updated_at_column` |  |
| tr_admissao_tokens_updated_at | BEFORE UPDATE | `admissao_tokens` | `update_updated_at_column` |  |
| tr_admissoes_updated_at | BEFORE UPDATE | `admissoes` | `update_updated_at_column` |  |
| tr_alert_severe_measure | AFTER INSERT | `medidas_disciplinares` | `fn_alert_severe_disciplinary_measure` |  |
| tr_asos_auto_marcar_agendamento | AFTER UPDATE OF "STATUS" | `asos` | `asos_auto_marcar_agendamento_realizado` |  |
| tr_asos_validar_restricoes | BEFORE INSERT OR UPDATE | `asos` | `asos_validar_restricoes` |  |
| tr_asos_validar_transicao | BEFORE UPDATE | `asos` | `asos_validar_transicao_status` |  |
| tr_audit_biometric_failure | AFTER INSERT OR UPDATE | `batidas_ponto` | `fn_audit_biometric_failure` |  |
| tr_audit_colaboradores | AFTER INSERT OR DELETE OR UPDATE | `colaboradores` | `process_audit_log` |  |
| tr_audit_esocial_transmission | AFTER UPDATE | `esocial_eventos` | `log_esocial_transmission` |  |
| tr_audit_ferias_solicitacoes | AFTER INSERT OR DELETE OR UPDATE | `ferias_solicitacoes` | `process_ferias_audit` |  |
| tr_audit_periodos_aquisitivos | AFTER INSERT OR DELETE OR UPDATE | `periodos_aquisitivos` | `process_ferias_audit` |  |
| tr_auditoria_premiacoes_campanhas | AFTER INSERT OR UPDATE | `premiacoes_campanhas` | `processar_auditoria_premiacao` |  |
| tr_auditoria_premiacoes_pagamentos | AFTER INSERT OR UPDATE | `premiacoes_pagamentos` | `processar_auditoria_premiacao` |  |
| tr_auditoria_registros_ponto | AFTER DELETE OR UPDATE | `registros_ponto` | `registrar_auditoria_ponto` |  |
| tr_auto_generate_certificate | AFTER UPDATE | `inscricoes_cursos` | `fn_auto_generate_training_certificate` |  |
| tr_auto_start_workflow_on_hiring | AFTER INSERT | `colaboradores` | `fn_start_workflow_on_colaborador_create` |  |
| tr_calcular_prazo_cat | BEFORE INSERT | `sst_cat` | `calcular_prazo_cat` |  |
| tr_calcular_total_provisao | BEFORE INSERT OR UPDATE | `provisoes_mensais` | `calcular_total_provisao` |  |
| tr_create_onboarding_tasks | AFTER INSERT | `admissoes` | `fn_create_default_onboarding_tasks` |  |
| tr_enforce_afastamento_hash | BEFORE INSERT OR UPDATE | `afastamentos` | `enforce_afastamento_hash` |  |
| tr_enforce_aso_hash | BEFORE INSERT OR UPDATE | `asos` | `enforce_aso_hash` |  |
| tr_enforce_cat_hash | BEFORE INSERT OR UPDATE | `sst_cat` | `enforce_cat_hash` |  |
| tr_enforce_documento_assinatura_hash | BEFORE INSERT OR UPDATE | `documentos_assinatura` | `enforce_documento_assinatura_hash` |  |
| tr_enforce_epi_entrega_hash | BEFORE INSERT OR UPDATE | `epis_entregas` | `enforce_epi_entrega_hash` |  |
| tr_enforce_medida_disciplinar_hash | BEFORE INSERT OR UPDATE | `medidas_disciplinares` | `enforce_medida_disciplinar_hash` |  |
| tr_folhas_updated_at | BEFORE UPDATE | `folhas_pagamento` | `update_folha_updated_at` |  |
| tr_gerar_conformidade_ponto | BEFORE UPDATE | `solicitacoes_ajuste_ponto` | `gerar_relatorio_conformidade_ponto` |  |
| tr_gerar_hash_batida_ponto | BEFORE INSERT | `batidas_ponto` | `gerar_hash_batida_ponto` |  |
| tr_gerar_hash_ponto | BEFORE INSERT | `registros_ponto` | `gerar_hash_ponto` |  |
| tr_impedir_alteracao_afastamento_encerrado | BEFORE UPDATE | `afastamentos` | `impedir_alteracao_afastamento_encerrado` |  |
| tr_impedir_alteracao_aso_emitido | BEFORE UPDATE | `asos` | `impedir_alteracao_aso_emitido` |  |
| tr_impedir_alteracao_cat_transmitida | BEFORE UPDATE | `sst_cat` | `impedir_alteracao_cat_transmitida` |  |
| tr_impedir_alteracao_documento_assinado | BEFORE UPDATE | `documentos_assinatura` | `impedir_alteracao_documento_assinado` |  |
| tr_impedir_alteracao_epi_entrega_assinada | BEFORE UPDATE | `epis_entregas` | `impedir_alteracao_epi_entrega_assinada` |  |
| tr_impedir_alteracao_medida_aplicada | BEFORE UPDATE | `medidas_disciplinares` | `impedir_alteracao_medida_aplicada` |  |
| tr_increment_version_cargos | BEFORE UPDATE | `cargos` | `increment_version` |  |
| tr_increment_version_colab | BEFORE UPDATE | `colaboradores` | `increment_version` |  |
| tr_increment_version_folhas | BEFORE UPDATE | `folhas_pagamento` | `increment_version` |  |
| tr_increment_version_ponto | BEFORE UPDATE | `registros_ponto` | `increment_version` |  |
| tr_monitor_timeout | AFTER UPDATE OF "STATUS" | `fila_processamento` | `check_processamento_timeout` | `("new"."status" = 'failed'::"text")` |
| tr_notify_new_holerite | AFTER INSERT | `holerites` | `fn_enqueue_notification` |  |
| tr_proibir_delete_afastamento_encerrado | BEFORE DELETE | `afastamentos` | `proibir_delete_afastamento_encerrado` |  |
| tr_proibir_delete_aso_emitido | BEFORE DELETE | `asos` | `proibir_delete_aso_emitido` |  |
| tr_proibir_delete_cat_transmitida | BEFORE DELETE | `sst_cat` | `proibir_delete_cat_transmitida` |  |
| tr_proibir_delete_documento_assinado | BEFORE DELETE | `documentos_assinatura` | `proibir_delete_documento_assinado` |  |
| tr_proibir_delete_epi_entrega_assinada | BEFORE DELETE | `epis_entregas` | `proibir_delete_epi_entrega_assinada` |  |
| tr_proibir_delete_medida_aplicada | BEFORE DELETE | `medidas_disciplinares` | `proibir_delete_medida_aplicada` |  |
| tr_update_admissao_checklist | AFTER UPDATE | `documentos_admissao` | `fn_update_admissao_checklist` |  |
| tr_update_candidatura_history | BEFORE UPDATE | `candidaturas` | `fn_update_candidatura_history` |  |
| tr_update_ferias_status | BEFORE INSERT OR UPDATE | `ferias` | `fn_update_ferias_status_by_date` |  |
| tr_update_fila_processamento_updated_at | BEFORE UPDATE | `fila_processamento` | `update_fila_processamento_updated_at` |  |
| tr_updated_at_auth_gov_br | BEFORE UPDATE | `auth_gov_br_sessions` | `update_updated_at_column` |  |
| tr_updated_at_beneficios | BEFORE UPDATE | `beneficios` | `update_updated_at_column` |  |
| tr_updated_at_blocked_ips | BEFORE UPDATE | `blocked_ips` | `update_updated_at_column` |  |
| tr_updated_at_candidatos | BEFORE UPDATE | `candidatos` | `update_updated_at_column` |  |
| tr_updated_at_candidaturas | BEFORE UPDATE | `candidaturas` | `update_updated_at_column` |  |
| tr_updated_at_config_esocial | BEFORE UPDATE | `configuracoes_esocial` | `update_updated_at_column` |  |
| tr_updated_at_config_intervalo | BEFORE UPDATE | `configuracoes_intervalo` | `update_updated_at_column` |  |
| tr_updated_at_config_ponto | BEFORE UPDATE | `configuracoes_ponto` | `update_updated_at_column` |  |
| tr_updated_at_configuracoes | BEFORE UPDATE | `configuracoes` | `update_updated_at_column` |  |
| tr_updated_at_controle_acesso | BEFORE UPDATE | `controle_acesso` | `update_updated_at_column` |  |
| tr_updated_at_folhas | BEFORE UPDATE | `folhas_pagamento` | `update_updated_at_column` |  |
| tr_updated_at_onboarding_colaborador | BEFORE UPDATE | `onboarding_colaborador` | `update_updated_at_column` |  |
| tr_updated_at_onboarding_documentos_obrigatorios | BEFORE UPDATE | `onboarding_documentos_obrigatorios` | `update_updated_at_column` |  |
| tr_updated_at_onboarding_tarefas | BEFORE UPDATE | `onboarding_tarefas` | `update_updated_at_column` |  |
| tr_updated_at_parametros_sistema | BEFORE UPDATE | `parametros_sistema` | `update_updated_at_column` |  |
| tr_updated_at_permissao_perfis | BEFORE UPDATE | `permissao_perfis` | `update_updated_at_column` |  |
| tr_updated_at_rubricas | BEFORE UPDATE | `rubricas_folha` | `update_updated_at_column` |  |
| tr_updated_at_sst_cat | BEFORE UPDATE | `sst_cat` | `set_updated_at_sst_cat` |  |
| tr_updated_at_vaga_entrevistas | BEFORE UPDATE | `vaga_entrevistas` | `update_updated_at_column` |  |
| tr_updated_at_vaga_etapas | BEFORE UPDATE | `vaga_etapas` | `update_updated_at_column` |  |
| tr_updated_at_vagas | BEFORE UPDATE | `vagas` | `update_updated_at_column` |  |
| tr_validate_ponto | AFTER INSERT | `batidas_ponto` | `validate_ponto_compliance` |  |
| tr_whatsapp_on_new_hiring | AFTER INSERT | `colaboradores` | `fn_trigger_whatsapp_on_event` |  |
| tr_workflows_automation_start | BEFORE INSERT | `workflows_execucoes` | `trigger_workflow_automation` |  |
| trg_admissao_auto_workflow | AFTER INSERT | `admissoes` | `fn_workflow_admissao_auto` |  |
| trg_afdt_imp_updated | BEFORE UPDATE | `afdt_importacoes` | `update_updated_at_column` |  |
| trg_audit_archive_append_only | BEFORE DELETE OR UPDATE | `audit_log_unified_archive` | `audit_log_append_only` |  |
| trg_audit_colaboradores | AFTER INSERT OR DELETE OR UPDATE | `colaboradores` | `process_audit_log` |  |
| trg_audit_folha | AFTER INSERT OR DELETE OR UPDATE | `folhas_pagamento` | `process_audit_log` |  |
| trg_audit_log_append_only | BEFORE DELETE OR UPDATE | `audit_log` | `audit_log_append_only` |  |
| trg_audit_log_no_delete | BEFORE DELETE | `audit_log` | `audit_log_append_only` |  |
| trg_audit_log_no_update | BEFORE UPDATE | `audit_log` | `audit_log_append_only` |  |
| trg_audit_logs_append_only | BEFORE DELETE OR UPDATE | `audit_logs` | `audit_log_append_only` |  |
| trg_audit_logs_no_delete | BEFORE DELETE | `audit_logs` | `audit_log_append_only` |  |
| trg_audit_logs_no_update | BEFORE UPDATE | `audit_logs` | `audit_log_append_only` |  |
| trg_auditoria_append_only | BEFORE DELETE OR UPDATE | `auditoria` | `audit_log_append_only` |  |
| trg_auditoria_contratual_append_only | BEFORE DELETE OR UPDATE | `auditoria_contratual` | `audit_log_append_only` |  |
| trg_auditoria_contratual_no_delete | BEFORE DELETE | `auditoria_contratual` | `audit_log_append_only` |  |
| trg_auditoria_contratual_no_update | BEFORE UPDATE | `auditoria_contratual` | `audit_log_append_only` |  |
| trg_auditoria_logs_append_only | BEFORE DELETE OR UPDATE | `auditoria_logs` | `audit_log_append_only` |  |
| trg_auditoria_logs_no_delete | BEFORE DELETE | `auditoria_logs` | `audit_log_append_only` |  |
| trg_auditoria_logs_no_update | BEFORE UPDATE | `auditoria_logs` | `audit_log_append_only` |  |
| trg_auditoria_no_delete | BEFORE DELETE | `auditoria` | `audit_log_append_only` |  |
| trg_auditoria_no_update | BEFORE UPDATE | `auditoria` | `audit_log_append_only` |  |
| trg_auto_vincular_admins | AFTER INSERT | `empresas` | `auto_vincular_admins_empresa` |  |
| trg_automacao_logs_no_delete | BEFORE DELETE | `automacao_logs` | `audit_log_append_only` |  |
| trg_automacao_logs_no_update | BEFORE UPDATE | `automacao_logs` | `audit_log_append_only` |  |
| trg_bitrix24_sync_logs_no_delete | BEFORE DELETE | `bitrix24_sync_logs` | `audit_log_append_only` |  |
| trg_bitrix24_sync_logs_no_update | BEFORE UPDATE | `bitrix24_sync_logs` | `audit_log_append_only` |  |
| trg_bump_contab_thread | AFTER INSERT | `contabilidade_mensagens` | `trg_contab_msg_bump_thread` |  |
| trg_candidatura_set_empresa | BEFORE INSERT OR UPDATE OF "VAGA_ID", "EMPRESA_ID" | `candidaturas` | `fn_candidatura_set_empresa` |  |
| trg_catalogo_infracoes_updated_at | BEFORE UPDATE | `catalogo_infracoes` | `tg_catalogo_infracoes_updated_at` |  |
| trg_clinicas_horarios_upd | BEFORE UPDATE | `clinicas_partners_horarios` | `update_updated_at_column` |  |
| trg_clinicas_partners_upd | BEFORE UPDATE | `clinicas_partners` | `update_updated_at_column` |  |
| trg_clinicas_servicos_upd | BEFORE UPDATE | `clinicas_partners_servicos` | `update_updated_at_column` |  |
| trg_colab_cpf_hash | BEFORE INSERT OR UPDATE OF "CPF" | `colaboradores` | `fn_colab_cpf_hash` |  |
| trg_conformidade_ponto_logs_append_only | BEFORE DELETE OR UPDATE | `conformidade_ponto_logs` | `audit_log_append_only` |  |
| trg_conformidade_ponto_logs_no_delete | BEFORE DELETE | `conformidade_ponto_logs` | `audit_log_append_only` |  |
| trg_conformidade_ponto_logs_no_update | BEFORE UPDATE | `conformidade_ponto_logs` | `audit_log_append_only` |  |
| trg_consolidar_batidas | AFTER INSERT OR UPDATE | `batidas_ponto` | `fn_consolidar_batidas` |  |
| trg_contab_contatos_updated | BEFORE UPDATE | `contabilidade_contatos` | `update_updated_at_column` |  |
| trg_contab_threads_updated | BEFORE UPDATE | `contabilidade_threads` | `update_updated_at_column` |  |
| trg_contrato_templates_updated | BEFORE UPDATE | `contrato_templates` | `update_updated_at_column` |  |
| trg_contrato_token_auditar | AFTER INSERT OR UPDATE | `contrato_assinatura_tokens` | `trg_contrato_token_auditar` |  |
| trg_contratos_gerados_updated | BEFORE UPDATE | `contratos_gerados` | `update_updated_at_column` |  |
| trg_despesas_log | AFTER INSERT OR UPDATE OF "STATUS" | `despesas` | `log_despesa_status_change` |  |
| trg_enforce_batida_ponto_hash | BEFORE INSERT | `batidas_ponto` | `enforce_batida_ponto_hash` |  |
| trg_enforce_cnab_remessa_hash | BEFORE INSERT OR UPDATE | `cnab_remessas` | `enforce_cnab_remessa_hash` |  |
| trg_enforce_desligamento_hash | BEFORE INSERT OR UPDATE | `desligamentos` | `enforce_desligamento_hash` |  |
| trg_enforce_esocial_evento_hash | BEFORE INSERT OR UPDATE | `esocial_eventos` | `enforce_esocial_evento_hash` |  |
| trg_enforce_ferias_hash | BEFORE INSERT OR UPDATE | `ferias` | `enforce_ferias_hash` |  |
| trg_enforce_folha_pagamento_hash | BEFORE INSERT OR UPDATE | `folhas_pagamento` | `enforce_folha_pagamento_hash` |  |
| trg_enforce_holerite_signed_hash | BEFORE INSERT OR UPDATE | `holerites` | `enforce_holerite_signed_hash` |  |
| trg_epi_item_ca | BEFORE INSERT OR UPDATE | `epis_fichas_itens` | `validate_epi_item_ca` |  |
| trg_epis_fichas_updated | BEFORE UPDATE | `epis_fichas` | `update_updated_at_column` |  |
| trg_esocial_transmissao_logs_no_delete | BEFORE DELETE | `esocial_transmissao_logs` | `audit_log_append_only` |  |
| trg_esocial_transmissao_logs_no_update | BEFORE UPDATE | `esocial_transmissao_logs` | `audit_log_append_only` |  |
| trg_exames_agend_updated_at | BEFORE UPDATE | `exames_agendamentos` | `update_updated_at_column` |  |
| trg_extintor_vencimento | BEFORE INSERT OR UPDATE | `sst_extintores` | `update_extintor_status_vencimento` |  |
| trg_ferias_aprovacoes_log_append_only | BEFORE DELETE OR UPDATE | `ferias_aprovacoes_log` | `audit_log_append_only` |  |
| trg_ferias_aprovacoes_log_no_delete | BEFORE DELETE | `ferias_aprovacoes_log` | `audit_log_append_only` |  |
| trg_ferias_aprovacoes_log_no_update | BEFORE UPDATE | `ferias_aprovacoes_log` | `audit_log_append_only` |  |
| trg_ferias_audit_log_append_only | BEFORE DELETE OR UPDATE | `ferias_audit_log` | `audit_log_append_only` |  |
| trg_ferias_audit_no_delete | BEFORE DELETE | `ferias_audit_log` | `audit_log_append_only` |  |
| trg_ferias_audit_no_update | BEFORE UPDATE | `ferias_audit_log` | `audit_log_append_only` |  |
| trg_ferias_gerar_rubricas | AFTER UPDATE OF "STATUS", "ENVIADO_CONTABILIDADE" | `ferias` | `trg_ferias_gerar_rubricas` |  |
| trg_ferias_reconciliacao_alert | AFTER INSERT | `ferias_reconciliacao_logs` | `trg_ferias_reconciliacao_alert` |  |
| trg_ferias_validar_aquisitivo | BEFORE INSERT OR UPDATE OF "PERIODO_AQUISITIVO_ID", "COLABORADOR_ID", "CANCELADO" | `ferias` | `trg_ferias_validar_aquisitivo` |  |
| trg_ferias_validar_inicio | BEFORE INSERT OR UPDATE OF "DATA_INICIO", "FERIAS_COLETIVA_ID", "CANCELADO" | `ferias` | `trg_ferias_validar_inicio` |  |
| trg_ferias_validar_split | BEFORE INSERT OR UPDATE OF "DIAS_GOZO", "PERIODO_AQUISITIVO_ID", "CANCELADO" | `ferias` | `trg_ferias_validar_split` |  |
| trg_fgts_digital_logs_no_delete | BEFORE DELETE | `fgts_digital_logs` | `audit_log_append_only` |  |
| trg_fgts_digital_logs_no_update | BEFORE UPDATE | `fgts_digital_logs` | `audit_log_append_only` |  |
| trg_fila_dlq_check | BEFORE UPDATE | `fila_processamento` | `fn_fila_dlq_check` |  |
| trg_fill_rec_anotacoes_empresa | BEFORE INSERT OR UPDATE | `recrutamento_anotacoes` | `fill_recrutamento_child_empresa` |  |
| trg_fill_rec_entrevistas_empresa | BEFORE INSERT OR UPDATE | `recrutamento_entrevistas` | `fill_recrutamento_child_empresa` |  |
| trg_fill_rec_testes_empresa | BEFORE INSERT OR UPDATE | `recrutamento_testes` | `fill_recrutamento_child_empresa` |  |
| trg_fill_treinamento_certificados_empresa | BEFORE INSERT OR UPDATE | `treinamento_certificados` | `fill_treinamento_certificados_empresa` |  |
| trg_fill_treinamento_instancias_empresa | BEFORE INSERT OR UPDATE | `treinamento_instancias` | `fill_treinamento_instancias_empresa` |  |
| trg_folha_assinaturas_no_delete | BEFORE DELETE | `folha_assinaturas` | `audit_log_append_only` |  |
| trg_folha_assinaturas_no_update | BEFORE UPDATE | `folha_assinaturas` | `audit_log_append_only` |  |
| trg_folha_auditoria_append_only | BEFORE DELETE OR UPDATE | `folha_auditoria` | `audit_log_append_only` |  |
| trg_folha_auditoria_no_delete | BEFORE DELETE | `folha_auditoria` | `audit_log_append_only` |  |
| trg_folha_auditoria_no_update | BEFORE UPDATE | `folha_auditoria` | `audit_log_append_only` |  |
| trg_folha_eventos_auditoria_append_only | BEFORE DELETE OR UPDATE | `folha_eventos_auditoria` | `audit_log_append_only` |  |
| trg_folha_eventos_auditoria_no_delete | BEFORE DELETE | `folha_eventos_auditoria` | `audit_log_append_only` |  |
| trg_folha_eventos_auditoria_no_update | BEFORE UPDATE | `folha_eventos_auditoria` | `audit_log_append_only` |  |
| trg_folha_lock_conflicts_ao | BEFORE DELETE OR UPDATE | `folha_lock_conflicts` | `audit_log_append_only` |  |
| trg_folha_optimistic_lock | BEFORE UPDATE | `folhas_pagamento` | `fn_folha_optimistic_lock` |  |
| trg_fprog_updated_at | BEFORE UPDATE | `ferias_programacao` | `fprog_touch_updated_at` |  |
| trg_fwd_audit_unified | AFTER INSERT | `audit_log` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `audit_logs` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `auditoria` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `auditoria_contratual` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `auditoria_logs` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `ferias_audit_log` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `folha_auditoria` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `folha_eventos_auditoria` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `ponto_auditoria` | `fwd_to_audit_unified` |  |
| … +161 linhas — lista completa em `context.json` | | | | |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `enforce_bucket_name_length` | bucket name "%" is too long (% characters). Max is 100. | `supabase/baseline/20260831_canonical/canonical_storage_schema.sql` |
| `protect_delete` | Direct deletion from storage tables is not allowed. Use the Storage API instead. | `supabase/baseline/20260831_canonical/canonical_storage_schema.sql` |
| `prevent_empty_empresa_id` | empresa_id cannot be an empty string | `supabase/migrations/20260719170000_security_indexes_constraints.sql` |
| `decrypt_pii` | Este campo foi armazenado como hash irreversível | `supabase/migrations/20260726100000_p1_025_encryption_pgcrypto.sql` |
| `decrypt_pii` | Chave de descriptografia não configurada | `supabase/migrations/20260726100000_p1_025_encryption_pgcrypto.sql` |
| `documento_registrar` | empresa_id não identificado para o contexto informado | `supabase/migrations/20260726110000_p2_037_consolidate_duplicates.sql` |
| `documento_registrar` | Acesso negado para a empresa informada | `supabase/migrations/20260726110000_p2_037_consolidate_duplicates.sql` |
| `documento_listar` | Acesso negado para a empresa informada | `supabase/migrations/20260726110000_p2_037_consolidate_duplicates.sql` |
| `edge_rate_limit_check` | p_key must contain between 1 and 512 characters | `supabase/migrations/20260911194000_p0_restore_atomic_rate_limit.sql` |
| `edge_rate_limit_check` | p_limit must be between 1 and 10000 | `supabase/migrations/20260911194000_p0_restore_atomic_rate_limit.sql` |
| `edge_rate_limit_check` | p_window_sec must be between 1 and 86400 seconds | `supabase/migrations/20260911194000_p0_restore_atomic_rate_limit.sql` |
| `dp_mig_set_search_path` | requires routine % | `supabase/migrations/20260912150000_p0_secdef_search_path.sql` |
| `claim_due_report_schedules` | invalid report schedule claim arguments | `supabase/migrations/20260912192000_p0_report_schedule_claims.sql` |
| `enforce_report_schedule_authorship` | report dispatch lease is service-owned | `supabase/migrations/20260912194000_p1_report_schedule_authorship.sql` |
| `enforce_report_schedule_authorship` | report schedule requires RH authorization | `supabase/migrations/20260912194000_p1_report_schedule_authorship.sql` |
| `enforce_report_schedule_authorship` | report destination is outside the company | `supabase/migrations/20260912194000_p1_report_schedule_authorship.sql` |
| `enforce_report_schedule_authorship` | service-created report schedule requires an explicit author | `supabase/migrations/20260912194000_p1_report_schedule_authorship.sql` |
| `get_audit_trail` | invalid audit trail arguments | `supabase/migrations/20260912195000_p1_scoped_audit_trail.sql` |
| `get_audit_trail` | authentication required | `supabase/migrations/20260912195000_p1_scoped_audit_trail.sql` |
| `get_audit_trail` | audit trail restricted to RH or administrator | `supabase/migrations/20260912195000_p1_scoped_audit_trail.sql` |
| `get_company_rh_recipient_emails` | invalid notification recipient arguments | `supabase/migrations/20260912201000_p1_internal_notification_recipients.sql` |
| `pcs_validate_factor` | graus must be a non-empty JSON array | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_validate_factor` | each PCS grade must contain numeric grau/pontos and a rotulo | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_validate_factor` | PCS factor grade identifiers must be unique | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_recalc_pontos` | pontuacoes must be a JSON object | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_recalc_pontos` | cargo does not belong to the PCS tenant | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_recalc_pontos` | pontuacoes must contain exactly one value per PCS factor | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_recalc_pontos` | pontuacoes contains an unknown factor or value | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_recalc_pontos` | avaliado_por is required | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_set_audit_fields` | created_by is required | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_set_audit_fields` | created_by is immutable | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_gerar_grades` | not authorized to manage this PCS plan | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_gerar_grades` | p_num_grades must be between 2 and 30 | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_gerar_grades` | p_salario_base_menor must be positive | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_gerar_grades` | at least two distinct evaluated scores are required | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_gerar_grades` | a positive salary base is required | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_simular_impacto` | not authorized to read this PCS plan | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `pcs_simular_impacto` | p_encargos_pct must be between 0 and 200 | `supabase/migrations/20260912202000_p1_pcs_contract.sql` |
| `protect_esocial_transport_fields` | eSocial transport fields are service-owned | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `claim_admission_esocial_event` | not authorized to claim admission eSocial event | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `claim_admission_esocial_event` | admission not found in company | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `claim_admission_esocial_event` | admission CPF is required | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `claim_admission_esocial_event` | inconsistent admission eSocial completion state | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `claim_admission_esocial_event` | admission eSocial transmission already in progress | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `complete_admission_esocial_event` | not authorized to complete admission eSocial event | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `complete_admission_esocial_event` | admission not found in company | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `complete_admission_esocial_event` | invalid admission eSocial completion | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `complete_admission_esocial_event` | eSocial completion requires matching persisted transport receipt | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `complete_admission_esocial_event` | invalid admission eSocial completion | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `fail_admission_esocial_event` | not authorized to fail admission eSocial event | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `admin_definir_pin_quiosque` | colaborador não encontrado | `supabase/migrations/20260924190000_p0_fix_search_path_pin_quiosque.sql` |
| `admin_definir_pin_quiosque` | sem permissão para definir PIN deste colaborador | `supabase/migrations/20260924190000_p0_fix_search_path_pin_quiosque.sql` |
| `admin_definir_pin_quiosque` | PIN deve ter de 4 a 6 dígitos numéricos | `supabase/migrations/20260924190000_p0_fix_search_path_pin_quiosque.sql` |
| `verificar_pin_quiosque` | PIN_BLOQUEADO | `supabase/migrations/20260924190000_p0_fix_search_path_pin_quiosque.sql` |
| `admissao_salvar_dados` | token invalido ou expirado | `supabase/migrations/20261002103000_p0_fix_audit_critical_gaps.sql` |
| `admissao_marcar_documentos` | token invalido ou expirado | `supabase/migrations/20261002103000_p0_fix_audit_critical_gaps.sql` |
| `admissao_registrar_documento` | token invalido ou expirado | `supabase/migrations/20261002103000_p0_fix_audit_critical_gaps.sql` |
| `admissao_registrar_documento` | path de documento fora do escopo da admissao | `supabase/migrations/20261002103000_p0_fix_audit_critical_gaps.sql` |
| `admin_list_profiles` | Apenas administradores podem listar usuários | `supabase/migrations/20261005140000_admin_list_profiles_rpc.sql` |
| `admissao_assinar_contrato` | token invalido ou expirado | `supabase/migrations/20261005160000_wave7_audit_fixes.sql` |
| `admissao_assinar_contrato` | assinatura ausente ou invalida | `supabase/migrations/20261005160000_wave7_audit_fixes.sql` |
| `drenar_fila_limpeza_lgpd` | tabela nao suportada para anonimizacao: % | `supabase/migrations/20261013152000_onda4b_vinculo_documentos_lgpd_crypto.sql` |
| `prevent_audit_log_modification` | audit_log records are immutable — UPDATE and DELETE are prohibited | `supabase/migrations/20261014120000_fix_cron_jobs_onda3b.sql` |
| `encrypt_dados_bancarios` | Encryption key not configured or too weak (>=32 chars). Configure vault secret "dados_bancarios_key". | `supabase/migrations/20261014160000_onda4c_review_fixes_empresa_id.sql` |
| `decrypt_dados_bancarios` | Encryption key not configured. Configure vault secret "dados_bancarios_key". | `supabase/migrations/20261014160000_onda4c_review_fixes_empresa_id.sql` |
| `criar_feedback_seguro` | nao_autenticado | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | perfil_nao_autorizado | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | nao_autorizado | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | avaliado_obrigatorio | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | ciclo_obrigatorio | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | categoria_invalida | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | nota_desempenho_invalida | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | potencial_invalido | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | idempotencia_ausente | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | avaliado_fora_da_empresa | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | avaliador_fora_da_empresa | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | ciclo_fora_da_empresa | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `criar_feedback_seguro` | idempotencia_conflito | `supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql` |
| `decrypt_dados_bancarios_tenant` | Acesso negado. | `supabase/migrations/20261019000000_qa3_db_fixes.sql` |
| `decrypt_dados_bancarios_tenant` | Acesso negado. | `supabase/migrations/20261019000000_qa3_db_fixes.sql` |
| `ponto_espelhos_assinados_guard_update` | Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %. | `supabase/migrations/20261023000000_qa_r3_fixes.sql` |
| `claim_training_image` | identificadores_obrigatorios | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `claim_training_image` | tipo_de_conteudo_invalido | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `claim_training_image` | content_hash_invalido | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `claim_training_image` | conteudo_nao_pertence_a_empresa | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `reconcile_training_image` | decisao_invalida | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `reconcile_training_image` | operador_obrigatorio | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `reconcile_training_image` | notas_obrigatorias | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `reconcile_training_image` | registro_inexistente | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `reconcile_training_image` | registro_nao_esta_em_estado_desconhecido | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `finish_training_image_request` | status_invalido | `supabase/migrations/20261023130000_training_image_autoqueue.sql` |
| `finish_training_image_request` | requisicao_inexistente | `supabase/migrations/20261023130000_training_image_autoqueue.sql` |
| `edge_rate_limit_check_dual` | chave_empresa_obrigatoria | `supabase/migrations/20261023140000_edge_rate_limit_dual.sql` |
| `edge_rate_limit_check_dual` | limite_empresa_invalido | `supabase/migrations/20261023140000_edge_rate_limit_dual.sql` |
| `edge_rate_limit_check_dual` | janela_invalida | `supabase/migrations/20261023140000_edge_rate_limit_dual.sql` |
| `edge_rate_limit_check_dual` | limite_usuario_invalido | `supabase/migrations/20261023140000_edge_rate_limit_dual.sql` |
| `editar_feedback_seguro` | nao_autenticado | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | idempotencia_ausente | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | perfil_nao_autorizado | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | registro_inexistente | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | nao_autorizado | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | tipo_invalido | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | nota_invalida | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | potencial_invalido | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | avaliado_invalido | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | avaliador_invalido | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | ciclo_invalido | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | avaliado_fora_da_responsabilidade | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | idempotencia_conflito | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | feedback_cancelado_nao_editavel | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `editar_feedback_seguro` | status_desconhecido | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `bloquear_exclusao_ciclo_com_dependencias` | ciclo_com_dependencias | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `ponto_espelhos_assinados_guard_delete` | Espelhos de ponto assinados são append-only (Portaria MTP 671/21). DELETE não é permitido. | `supabase/migrations/20261027120000_qa_r5_fixes.sql` |
| `listar_historico_feedback` | nao_autenticado | `supabase/migrations/20261028090000_ninebox_justificativa_historico.sql` |
| `listar_historico_feedback` | registro_inexistente | `supabase/migrations/20261028090000_ninebox_justificativa_historico.sql` |
| `listar_historico_feedback` | nao_autorizado | `supabase/migrations/20261028090000_ninebox_justificativa_historico.sql` |
| `listar_historico_feedback` | perfil_nao_autorizado | `supabase/migrations/20261028090000_ninebox_justificativa_historico.sql` |
| `set_own_default_empresa` | Autenticação obrigatória | `supabase/migrations/20261113000000_remediate_rv04_missing_rpcs.sql` |
| `set_own_default_empresa` | Empresa não vinculada ao usuário autenticado | `supabase/migrations/20261113000000_remediate_rv04_missing_rpcs.sql` |
| `admin_associar_usuario_empresa` | Apenas administradores podem associar usuários a empresas | `supabase/migrations/20261113000000_remediate_rv04_missing_rpcs.sql` |
| `bloquear_aprovacao_ponto_sem_rh` | Somente RH/admin pode aprovar registro de ponto | `supabase/migrations/20261114000600_rls_escrita_por_papel.sql` |
| `bloquear_aprovacao_ponto_sem_rh` | registro aprovado: só RH/gestor altera | `supabase/migrations/20261114000600_rls_escrita_por_papel.sql` |
| `bloquear_aprovacao_ponto_sem_rh` | Somente RH/admin pode aprovar registro de ponto | `supabase/migrations/20261114000600_rls_escrita_por_papel.sql` |
| `enviar_avaliacao_ao_gestor` | nao_autenticado | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | idempotencia_ausente | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | perfil_nao_autorizado | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | colaborador_inexistente | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | nao_autorizado | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | gestor_nao_atribuido | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | gestor_sem_conta_ou_papel | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | avaliacao_do_gestor_ausente_ou_pendente | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `enviar_avaliacao_ao_gestor` | aprovacao_ja_registrada | `supabase/migrations/20261115140000_ninebox_enviar_ao_gestor_do_canonico.sql` |
| `situacao_aprovacao` | nao_autorizado | `supabase/migrations/20261115150000_ninebox_canoniza_funcoes_do_canonico.sql` |
| `replace_monthly_provisions` | invalid monthly provision replacement arguments | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `replace_monthly_provisions` | invalid monthly provision row | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `replace_monthly_provisions` | invalid monthly provision tax contract | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `replace_monthly_provisions` | monthly provision batch carries % distinct tax rates | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `replace_monthly_provisions` | monthly provision collaborator is outside the company | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `replace_monthly_provisions` | monthly provision tax rate changed under lock: stored % bps, received % bps | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `replace_monthly_provisions` | monthly provision replacement row count mismatch | `supabase/migrations/20261116120000_provisoes_registra_aliquota_aplicada.sql` |
| `_purge_audit_log_internal` | Retenção mínima de 30 dias | `supabase/rebaseline/20260831_corrected_public.sql` |
| `admin_list_security_definer_rpcs` | access denied | `supabase/rebaseline/20260831_corrected_public.sql` |
| `admin_list_user_roles` | Apenas administradores podem listar papéis de usuário | `supabase/rebaseline/20260831_corrected_public.sql` |
| `admin_set_user_role` | Apenas administradores podem gerenciar papéis de usuário | `supabase/rebaseline/20260831_corrected_public.sql` |
| `aplicar_medida_folha_ponto` | medida_nao_encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `aplicar_medida_folha_ponto` | medida_nao_aplicada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `aplicar_medida_folha_ponto` | sem_permissao | `supabase/rebaseline/20260831_corrected_public.sql` |
| `aplicar_medida_folha_ponto` | dias_suspensao_invalidos | `supabase/rebaseline/20260831_corrected_public.sql` |
| `aplicar_medida_folha_ponto` | dias_suspensao_excede_clt | `supabase/rebaseline/20260831_corrected_public.sql` |
| `aprovar_despesa` | Despesa não encontrada ou não pode ser aprovada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `asos_validar_restricoes` | ASO com restrições exige descrição detalhada (mínimo 5 caracteres) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `asos_validar_restricoes` | ASO com restrições exige data_fim da restrição | `supabase/rebaseline/20260831_corrected_public.sql` |
| `asos_validar_transicao_status` | Transição de status inválida: % -> % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_aviso_ferias` | unauthenticated | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_aviso_ferias` | forbidden: apenas admin/rh podem assinar aviso | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_aviso_ferias` | hash SHA-256 inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_aviso_ferias` | ferias não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_aviso_ferias` | aviso requer aprovação prévia do gestor | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_aviso_ferias` | aviso já assinado com hash divergente | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_desligamento` | Parte invalida: % (use empresa ou colaborador) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_desligamento` | Apenas administradores podem confirmar assinatura de rescisao | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_desligamento` | Desligamento nao encontrado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_desligamento` | Rescisao precisa estar calculada e ainda nao homologada (status atual: %) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_desligamento` | Esta parte ja assinou esta rescisao | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_espelho_ponto` | Autenticação requerida | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_espelho_ponto` | Colaborador inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_espelho_ponto` | Sem permissão para assinar este espelho | `supabase/rebaseline/20260831_corrected_public.sql` |
| `assinar_espelho_ponto` | Espelho já assinado para esta competência (revogue antes de reassinar) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `associar_pis_colaborador_afdt` | Divergência não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `associar_pis_colaborador_afdt` | Divergência sem PIS | `supabase/rebaseline/20260831_corrected_public.sql` |
| `associar_pis_colaborador_afdt` | Colaborador não pertence à empresa da divergência | `supabase/rebaseline/20260831_corrected_public.sql` |
| `associar_pis_colaborador_afdt` | Sem permissão para esta empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `audit_log_append_only` | Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | Token inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | Nome completo obrigatório | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | CPF inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | Token não encontrado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | Token já utilizado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | Token expirado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_assinar_por_token` | CPF não confere com o destinatário | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_consultar_por_token` | Token inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_consultar_por_token` | Token não encontrado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_consultar_por_token` | Token já utilizado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_consultar_por_token` | Token expirado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_consultar_por_token` | Muitas tentativas | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_estender_expiracao` | não autenticado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_estender_expiracao` | extensão deve estar entre 1 e 30 dias | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_estender_expiracao` | token inexistente, revogado ou já utilizado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_estender_expiracao` | perfil sem permissão para estender token | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_estender_expiracao` | sem acesso à empresa do token | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_gerar_token_assinatura` | Contrato não encontrado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_gerar_token_assinatura` | Sem permissão | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_gerar_token_assinatura` | Contrato já assinado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_gerar_token_assinatura` | Contrato cancelado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_montar_variaveis` | Admissão % não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_montar_variaveis` | Sem acesso a esta admissão | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_preview_url_por_token` | Token inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_preview_url_por_token` | Token não encontrado ou inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_preview_url_por_token` | Token revogado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_preview_url_por_token` | Contrato já assinado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_preview_url_por_token` | Token expirado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_preview_url_por_token` | Documento indisponível | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_resolver_template` | Admissão % não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_resolver_template` | Sem acesso a esta admissão | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_revogar_token` | auth_required | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_revogar_token` | token_not_found | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_revogar_token` | forbidden_tenant | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_revogar_token` | forbidden_role | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_revogar_token` | token_already_signed | `supabase/rebaseline/20260831_corrected_public.sql` |
| `contrato_token_evento_registrar` | Token % não encontrado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `criar_batida_da_divergencia_afdt` | Divergência não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `criar_batida_da_divergencia_afdt` | Apenas divergências sem_batida podem gerar batida | `supabase/rebaseline/20260831_corrected_public.sql` |
| `criar_batida_da_divergencia_afdt` | Divergência incompleta (colaborador ou timestamp ausente) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `criar_batida_da_divergencia_afdt` | Sem permissão para esta empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_assert_rls` | dp_assert_rls: RLS NAO HABILITADO em public.% | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_audit_log_immutable` | dp_audit_log IMUTAVEL: UPDATE proibido em registros de auditoria. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_audit_log_immutable` | dp_audit_log IMUTAVEL: DELETE proibido. Use dp_run_retention() para expurgo controlado. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_audit_log_prevent_future` | dp_audit_log: created_at não pode ser no futuro (drift: %) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_audit_log_prevent_future` | dp_audit_log: actor_role=colaborador exige actor_user_id | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_decrypt_pii` | dp_decrypt_pii: Unauthorized. Requires service_role. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_encrypt_pii` | dp_encrypt_pii: Unauthorized. Requires service_role. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_require_role` | Acesso negado: role % necessario. User: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_run_retention` | dp_run_retention: Unauthorized. Requires service_role. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `dp_run_retention` | Policy not found: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `fn_candidatura_set_empresa` | Vaga % inexistente ou sem empresa vinculada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `fn_folha_optimistic_lock` | Conflito de concorrência em folha_pagamento (id=%): versão esperada %, versão atual %. Recarregue e tente novamente. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `fn_validar_medida_disciplinar_clt` | Medida disciplinar prescrita: fato ocorrido há % dias (limite CLT: 60 dias sem punição = perdão tácito) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `fn_validar_medida_disciplinar_clt` | Princípio da imediatidade violado: empresa teve ciência há % dias (limite recomendado: 30 dias) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `fn_validar_medida_disciplinar_clt` | Dupla punição (non bis in idem): já existe medida disciplinar aplicada para este colaborador na data % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_afastamento_encerrado` | Afastamento encerrado/aprovado é imutável (eSocial S-2230). Registre novo evento ou prorrogação oficial. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_afastamento_encerrado` | Transição de status inválida em afastamento encerrado/aprovado. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_aso_emitido` | ASO emitido é imutável (NR-7/PCMSO). Emita um novo ASO retificador. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_batida_em_periodo_fechado` | Batida de ponto em período fechado não pode ser deletada (Portaria 671 MTP). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_batida_em_periodo_fechado` | Batida de ponto em período fechado é imutável. Use ajuste oficial com aprovação e trilha de auditoria. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_cat_transmitida` | CAT transmitida ao eSocial (S-2210) é imutável. Emita CAT de reabertura/retificação via evento oficial. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_cnab_transmitida` | Remessa CNAB transmitida é imutável. Gere uma nova remessa de estorno/complementar. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_desligamento_homologado` | Desligamento homologado/pago imutavel. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_documento_assinado` | Documento assinado digitalmente é imutável (MP 2.200-2/2001 - ICP-Brasil). Cancele oficialmente e emita novo documento. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_documento_assinado` | Transição inválida em documento assinado. Permitido apenas: cancelado. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_epi_entrega_assinada` | Entrega de EPI assinada é imutável (NR-6). Registre nova entrega/devolução em vez de alterar. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_esocial_transmitido` | Evento eSocial transmitido (com recibo/protocolo) é imutável. Envie um evento de retificação/exclusão via layout oficial. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_ferias_concluidas` | Férias em status % são imutáveis. Cancele oficialmente antes de alterar. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_folha_fechada` | Folha fechada é imutável. Reabra a folha antes de alterar valores (motivo obrigatório). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_holerite_assinado` | Holerite assinado é imutável (WORM). Campos financeiros/assinatura não podem ser alterados. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_medida_aplicada` | Medida disciplinar aplicada/ciente é imutável (CLT art. 474/482). Anule oficialmente (status=anulada) com motivo para retificar. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_medida_aplicada` | Transição de status inválida em medida aplicada. Permitido apenas: anulada, cancelada, revogada. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `impedir_alteracao_periodo_ponto_fechado` | Período de ponto fechado é imutável (Portaria 671 MTP). Reabra oficialmente antes de alterar. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `listar_auditoria` | empresa fora do escopo do usuario | `supabase/rebaseline/20260831_corrected_public.sql` |
| `listar_auditoria` | permissao insuficiente para consultar auditoria | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_aprovar` | não autenticado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_aprovar` | medida não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_aprovar` | acesso negado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_aprovar` | status atual não permite aprovação (%) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_arquivar` | não autenticado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_arquivar` | medida não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_arquivar` | acesso negado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_arquivar` | só é possível arquivar medidas aplicadas ou rejeitadas | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_consultar_por_token` | rate_limit_exceeded | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_contestar` | not_authenticated | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_contestar` | contestacao_texto_minimo_10_chars | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_contestar` | medida_nao_encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_contestar` | apenas_o_colaborador_pode_contestar | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_contestar` | medida_nao_esta_aplicada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_contestar` | prazo_contestacao_expirado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_enviar_aprovacao` | não autenticado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_enviar_aprovacao` | medida não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_enviar_aprovacao` | acesso negado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_enviar_aprovacao` | só é possível enviar medidas em rascunho (atual: %) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_gerar_link_ciencia` | Sem permissão para gerar link de ciência | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_gerar_link_ciencia` | Medida não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_gerar_link_ciencia` | Acesso negado à empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_gerar_link_ciencia` | Medida deve estar aplicada/aprovada para gerar ciência | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_registrar_ciencia_publica` | Ação inválida | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_registrar_ciencia_publica` | rate_limit_exceeded | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_rejeitar` | não autenticado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_rejeitar` | motivo da rejeição obrigatório (mín. 5 caracteres) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_rejeitar` | medida não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_rejeitar` | acesso negado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_rejeitar` | só é possível rejeitar medidas em fluxo de aprovação | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_responder_contestacao` | not_authenticated | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_responder_contestacao` | resposta_minimo_10_chars | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_responder_contestacao` | medida_nao_encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_responder_contestacao` | apenas_rh_ou_admin_pode_responder | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_responder_contestacao` | medida_nao_esta_contestada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medida_verificar_ciencia_hash` | rate_limit_exceeded | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medidas_analytics_reincidencia` | not_authenticated | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medidas_analytics_reincidencia` | forbidden | `supabase/rebaseline/20260831_corrected_public.sql` |
| `medidas_analytics_reincidencia` | invalid_arguments | `supabase/rebaseline/20260831_corrected_public.sql` |
| `notificar_divergencias_afdt` | Importação AFDT não encontrada: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `notificar_divergencias_afdt` | Sem permissão para notificar divergências desta empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `pagar_desligamento` | Apenas administradores podem registrar pagamento de rescisao | `supabase/rebaseline/20260831_corrected_public.sql` |
| `pagar_desligamento` | Desligamento nao encontrado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `pagar_desligamento` | Rescisao so pode ser paga apos homologacao (status atual: %) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `pagar_desligamento` | Rescisao precisa da assinatura da empresa e do colaborador antes do pagamento | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_gestor` | Programação não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_gestor` | Sem permissão de escopo | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_gestor` | Apenas gestor/RH pode aprovar | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_gestor` | Status atual não permite aprovação do gestor: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_rh` | Programação não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_rh` | Sem permissão de escopo | `supabase/rebaseline/20260831_corrected_public.sql` |
| … +159 linhas — lista completa em `context.json` | | |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `auth.mfa_factors` | `status` | `unverified`, `verified` |  |
| `auth.oauth_authorizations` | `state` | **livre (sem enum/CHECK)** |  |
| `auth.oauth_authorizations` | `status` | `pending`, `approved`, `denied`, `expired` | `pending` |
| `auth.users` | `email_change_confirm_status` | **livre (sem enum/CHECK)** | `0` |
| `despesas` | `status` | `aprovado`, `cancelado`, `integrado_folha`, `pago`, `pendente`, `rascunho`, `rejeitado` | `pendente` |
| `medidas_disciplinares` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `medidas_disciplinares` | `status_workflow` | `aguardando_gestor`, `aguardando_juridico`, `aguardando_rh`, `aplicada`, `arquivada`, `contestada`, `rascunho`, `rejeitada` | `aplicada` |
| `desligamentos` | `status` | `aguardando_aprovacao`, `aprovado`, `calculado`, `em_andamento`, `em_homologacao`, `homologado`, `pendente`, `rascunho`, `rejeitado` | `em_andamento` |
| `desligamentos` | `etapa` | `calculo_rescisao`, `comunicacao`, `devolucao_equipamentos`, `documentacao`, `esocial`, `homologacao`, `iniciado`, `pagamento`, `revogacao_acessos` | `iniciado` |
| `ferias` | `status` | `aprovada`, `cancelada`, `concluida`, `em_analise`, `em_gozo`, `programada`, `rejeitada`, `solicitada` | `programada` |
| `ferias` | `status_aprovacao_gestor` | **livre (sem enum/CHECK)** | `pendente` |
| `ferias` | `status_aprovacao_rh` | **livre (sem enum/CHECK)** | `pendente` |
| `ferias` | `status_aprovacao_contabilidade` | **livre (sem enum/CHECK)** | `pendente` |
| `batidas_ponto` | `biometria_status` | **livre (sem enum/CHECK)** | `nao_validada` |
| `ferias_coletivas` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `adiantamentos_salariais` | `status` | `aprovado`, `pago`, `pendente`, `rejeitado` | `pendente` |
| `admissoes` | `etapa` | `solicitacao`, `documentos`, `validacao`, `pendente`, `exame`, `contrato`, `assinatura`, `esocial` | `solicitacao` |
| `admissoes` | `estado_civil` | **livre (sem enum/CHECK)** | `solteiro` |
| `admissoes` | `status_esocial` | **livre (sem enum/CHECK)** | `pendente` |
| `aej_geracoes` | `status` | `erro`, `gerado`, `gerando` | `gerado` |
| `afastamentos` | `status` | `ativo`, `encerrado`, `cancelado`, `prorrogado` | `ativo` |
| `afdt_importacoes` | `status` | `concluido`, `erro`, `parcial`, `processando` | `processando` |
| `ajustes_ponto` | `status` | `aprovado`, `pendente`, `rejeitado` | `pendente` |
| `asos` | `status` | `arquivado`, `cancelado`, `emitido_clinica`, `rascunho`, `recebido_rh`, `validado` | `rascunho` |
| `automacao_logs` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `beneficiarios_plano` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `beneficiarios_seguro` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `beneficios` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `beneficios_colaborador` | `status_vinculo` | **livre (sem enum/CHECK)** | `ativo` |
| `canal_etica` | `status` | **livre (sem enum/CHECK)** | `aberto` |
| `candidaturas` | `etapa` | **livre (sem enum/CHECK)** | `triagem` |
| `candidaturas` | `status` | **livre (sem enum/CHECK)** | `em_andamento` |
| `candidaturas` | `data_proxima_etapa` | **livre (sem enum/CHECK)** |  |
| `ciclos_avaliacao` | `status` | `arquivado`, `ativo`, `cancelado`, `concluido`, `em_andamento`, `rascunho` | `rascunho` |
| `clinicas_partners` | `status` | `ativo`, `inativo`, `suspenso` | `ativo` |
| `cnab_itens` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `cnab_remessas` | `status` | **livre (sem enum/CHECK)** | `gerado` |
| `colaboradores` | `estado_civil` | `solteiro`, `casado`, `divorciado`, `viuvo`, `separado`, `uniao_estavel` | `solteiro` |
| `colaboradores` | `status` | `ativo`, `ferias`, `afastado`, `desligado`, `pendente` | `ativo` |
| `colaboradores` | `bitrix_sync_status` | **livre (sem enum/CHECK)** |  |
| `colaboradores` | `timeman_ultimo_status` | **livre (sem enum/CHECK)** |  |
| `contabilidade_threads` | `status` | `aberto`, `arquivado`, `resolvido`, `respondido` | `aberto` |
| `contratos` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `contratos_gerados` | `status` | `assinado`, `cancelado`, `enviado`, `gerado`, `rascunho` | `gerado` |
| `dctfweb_declaracoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `despesas_aprovacoes_log` | `status_anterior` | **livre (sem enum/CHECK)** |  |
| `despesas_aprovacoes_log` | `status_novo` | **livre (sem enum/CHECK)** |  |
| `documentos_assinatura` | `status` | `assinado`, `cancelado`, `pendente` | `pendente` |
| `dp_backup_runbook` | `step_number` | **livre (sem enum/CHECK)** |  |
| `dp_backup_runbook` | `step_title` | **livre (sem enum/CHECK)** |  |
| `dp_backup_runbook` | `step_command` | **livre (sem enum/CHECK)** |  |
| `dp_backup_runbook` | `step_notes` | **livre (sem enum/CHECK)** |  |
| `emprestimos_consignados` | `status` | `ativo`, `cancelado`, `quitado`, `suspenso` | `ativo` |
| `epis_fichas` | `status` | `assinada`, `cancelada`, `pendente`, `recusada` | `pendente` |
| `epis_fichas_itens` | `status_item` | `descartado`, `devolvido`, `em_uso`, `substituido` | `em_uso` |
| `escalas_trabalho` | `status` | **livre (sem enum/CHECK)** | `agendado` |
| `esocial_eventos` | `status` | **livre (sem enum/CHECK)** | `rascunho` |
| `esocial_lotes` | `status` | **livre (sem enum/CHECK)** | `rascunho` |
| `esocial_transmissao_logs` | `status` | **livre (sem enum/CHECK)** |  |
| `exames_agendamentos` | `status` | `agendado`, `cancelado`, `confirmado`, `faltou`, `reagendado`, `realizado` | `agendado` |
| `faltas` | `status` | `abonada`, `em_analise`, `injustificada`, `justificada`, `pendente`, `rejeitada` | `registrada` |
| `feedbacks_360` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `ferias_aprovacoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `ferias_aprovacoes_log` | `status` | **livre (sem enum/CHECK)** |  |
| `ferias_solicitacoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `fila_notificacoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `fila_processamento` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `folha_assinaturas` | `status` | **livre (sem enum/CHECK)** | `valido` |
| `folha_itens` | `status_pagamento` | **livre (sem enum/CHECK)** | `pendente` |
| `folhas_pagamento` | `status` | `aberta`, `calculada`, `fechada`, `paga` | `aberta` |
| `folhas_pagamento` | `esocial_status` | **livre (sem enum/CHECK)** | `nao_enviado` |
| `formacoes_academicas` | `situacao` | **livre (sem enum/CHECK)** | `concluido` |
| `govbr_auth_state` | `state` | **livre (sem enum/CHECK)** |  |
| `guias_fgts` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `guias_fgts_digital` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `guias_inss` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `historico_ferias` | `status_anterior` | **livre (sem enum/CHECK)** |  |
| `historico_ferias` | `status_novo` | **livre (sem enum/CHECK)** |  |
| `holerite_distribuicoes` | `status` | `enfileirado`, `enviado`, `falhou` | `enfileirado` |
| `homologacoes_rescisao` | `etapa` | **livre (sem enum/CHECK)** |  |
| `homologacoes_rescisao` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `idempotency_keys` | `status` | `completed`, `failed`, `in_progress` | `in_progress` |
| `idempotency_keys` | `response_status` | **livre (sem enum/CHECK)** |  |
| `inscricoes_cursos` | `status` | **livre (sem enum/CHECK)** | `inscrito` |
| `integracoes` | `status` | **livre (sem enum/CHECK)** | `desconectada` |
| `lancamentos_contabeis` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `lgpd_solicitacoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `log_envio_relatorios` | `status` | `erro`, `pendente`, `sucesso` |  |
| `logs_integracoes` | `status` | **livre (sem enum/CHECK)** | `info` |
| `logs_sincronizacao` | `status` | **livre (sem enum/CHECK)** |  |
| `medidas_disciplinares_integracao` | `status` | `aplicado`, `cancelado`, `erro`, `pendente` | `pendente` |
| `medidas_disciplinares_workflow_log` | `de_status` | **livre (sem enum/CHECK)** |  |
| `medidas_disciplinares_workflow_log` | `para_status` | **livre (sem enum/CHECK)** |  |
| `metas_okrs` | `status` | **livre (sem enum/CHECK)** | `em_andamento` |
| `metricas_processamento` | `status` | **livre (sem enum/CHECK)** |  |
| `notificacoes_admissao` | `status` | **livre (sem enum/CHECK)** | `enviado` |
| `onboarding_colaborador` | `status` | **livre (sem enum/CHECK)** | `em_andamento` |
| `password_reset_requests` | `status` | `approved`, `completed`, `expired`, `pending`, `rejected` | `pending` |
| `pdi_plano_desenvolvimento` | `status` | `cancelado`, `concluido`, `em_andamento`, `pendente` | `em_andamento` |
| `pdis` | `status` | `ativo`, `cancelado`, `concluido`, `em_andamento`, `pausado`, `rascunho`, `vencido` | `pendente` |
| `pendencias` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `periodos_aquisitivos` | `status` | `adquirido`, `em_aquisicao`, `gozado`, `pago`, `vencido` | `em_aquisicao` |
| `periodos_experiencia` | `primeira_etapa_fim` | **livre (sem enum/CHECK)** |  |
| `periodos_experiencia` | `segunda_etapa_fim` | **livre (sem enum/CHECK)** |  |
| `periodos_experiencia` | `status` | **livre (sem enum/CHECK)** | `em_andamento` |
| `periodos_ponto` | `status` | `aberto`, `fechado`, `processado` | `aberto` |
| `pesquisas` | `status` | `arquivada`, `ativa`, `cancelada`, `encerrada`, `rascunho` | `rascunho` |
| `pix_itens` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `pix_lotes` | `status` | **livre (sem enum/CHECK)** | `aberto` |
| `ponto_ajustes` | `status` | **livre (sem enum/CHECK)** | `PENDENTE` |
| `ponto_espelhos_assinados` | `status_assinatura` | **livre (sem enum/CHECK)** | `pendente` |
| `premiacoes_campanhas` | `status` | **livre (sem enum/CHECK)** | `rascunho` |
| `premiacoes_campanhas` | `status_aprovacao` | `aprovado`, `rascunho`, `rejeitado`, `revisando` | `rascunho` |
| `premiacoes_pagamentos` | `status` | **livre (sem enum/CHECK)** | `calculado` |
| `premiacoes_pagamentos` | `status_conciliacao` | `conciliado`, `divergente`, `pendente` | `pendente` |
| `provisao_logs` | `status` | **livre (sem enum/CHECK)** |  |
| `recargas_vale` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `recrutamento_agendamentos` | `status` | **livre (sem enum/CHECK)** | `agendado` |
| `recrutamento_entrevistas` | `status` | `agendada`, `cancelada`, `reagendada`, `realizada` | `agendada` |
| `recrutamento_testes` | `status` | `avaliado`, `em_progresso`, `entregue`, `enviado` | `enviado` |
| `sefip_arquivos` | `status` | **livre (sem enum/CHECK)** | `rascunho` |
| `seguros_colaboradores` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `sinistros_seguro` | `status` | **livre (sem enum/CHECK)** | `aberto` |
| `solicitacoes_ajuste_ponto` | `status` | `aprovada`, `cancelada`, `em_analise`, `estornada`, `pendente`, `rejeitada` | `pendente` |
| `solicitacoes_hora_extra` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `sst_cat` | `status_esocial` | **livre (sem enum/CHECK)** | `pendente` |
| `sst_cat` | `situacao_geradora` | **livre (sem enum/CHECK)** |  |
| `sst_exposicao_riscos` | `status_esocial` | **livre (sem enum/CHECK)** | `pendente` |
| `sst_extintores` | `status` | `ATIVO`, `DESATIVADO`, `EXTRAVIADO`, `MANUTENCAO`, `VENCIDO` | `ATIVO` |
| `sst_incidentes` | `status` | **livre (sem enum/CHECK)** | `investigacao` |
| `sst_ltcat_laudos` | `status` | `arquivado`, `ativo`, `rascunho`, `revisao` | `ativo` |
| `sst_ordens_servico` | `status` | `arquivada`, `ativa`, `rascunho` | `ativa` |
| `sst_programas` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `sst_regimento_documentos` | `status` | `ARQUIVADO`, `PUBLICADO`, `RASCUNHO` | `RASCUNHO` |
| `treinamento_instancias` | `status` | `cancelado`, `concluido`, `em_curso`, `planejado` | `planejado` |
| `vagas` | `status` | `aberta`, `arquivada`, `cancelada`, `encerrada`, `pausada`, `preenchida`, `rascunho` | `aberta` |
| `vinculos` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `webhook_logs` | `status` | **livre (sem enum/CHECK)** |  |
| `webhooks` | `ultimo_status` | **livre (sem enum/CHECK)** |  |
| `webhooks_config` | `ultimo_status` | **livre (sem enum/CHECK)** |  |
| `whatsapp_config` | `status` | **livre (sem enum/CHECK)** | `desconectado` |
| `whatsapp_mensagens_logs` | `status` | **livre (sem enum/CHECK)** | `sent` |
| `whatsapp_templates` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `workflows_execucoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `folha_pagamento` | `status` | **livre (sem enum/CHECK)** | `aberta` |
| `backup_logs` | `status` | `error`, `partial`, `skipped`, `success` | `success` |
| `pontos` | `status` | `atraso`, `falta`, `hora_extra`, `justificado`, `normal` | `normal` |
| `folhas` | `status` | `aprovada`, `calculada`, `paga`, `rascunho` | `rascunho` |
| `recibos_rescisao` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `darfs` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `grrf` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `trct` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `homologacoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `exames_medicos` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `cas` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `avaliacoes` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `ferias_programacao` | `status` | `rascunho`, `sugerido_gestor`, `aprovado_gestor`, `aprovado_rh`, `convertido`, `rejeitado`, `cancelado` | `sugerido_gestor` |
| `lgpd_purge_log` | `status` | `error`, `partial`, `success` | `success` |
| `pcs_planos` | `status` | `arquivado`, `ativo`, `em_avaliacao`, `rascunho` | `rascunho` |
| `mv_refresh_log` | `status` | **livre (sem enum/CHECK)** | `success` |
| `report_dispatch_attempts` | `status` | `accepted`, `prepared` | `prepared` |
| `health_checks` | `status` | **livre (sem enum/CHECK)** |  |
| `training_images` | `status` | `disabled`, `failed`, `pending`, `processing`, `succeeded` | `disabled` |
| `training_image_requests` | `status` | `done`, `failed`, `processing`, `queued`, `skipped` | `queued` |
| `afd_geracoes` | `status` | **livre (sem enum/CHECK)** | `gerado` |
| `feedbacks_360_consolidacoes` | `status` | **livre (sem enum/CHECK)** |  |

### E.2 Mapas de transição declarados no código

- **transition** (`src/components/layout/PageTransition.tsx`):
  ```ts
  type: 'tween', ease: resolved.ease, duration: resolved.duration,
  ```
- **NEXT_STATUS** (`src/pages/AdminAsoWorkflowPage.tsx`):
  ```ts
  rascunho: ['emitido_clinica', 'cancelado'], emitido_clinica: ['recebido_rh', 'cancelado'], recebido_rh: ['validado', 'cancelado'], validado: ['arquivado'], arquivado: [], cancelado: [],
  ```
- **workflowService** (`src/services/workflowService.ts`):
  ```ts
  // ── CRUD (já existente) ──────────────────────────────────────────────── async listarDefinicoes(empresaId: string): Promise<Tables['workflows_definicoes']['Row'][]> { if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant'); const { data, error } = await supabase .from('workflows_definicoes') .select('*') .eq('empresa_id', empresaId) .order('created_at', { ascending: false }); if (error) throw error; return data ?? []; }, async criarDefinicao(d: Record<string, unknown>): Promise<unknown> { validateInput(workflowDefinicaoSchema, d, 'workflows.criarDefinicao'); const { data, error } = await supabase .from('workflows_definicoes') .insert( validateTablePayload( 'work …
  ```

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `type` | `ADD_TOAST` | compara, escreve | `src/hooks/useToast.ts` |
| `type` | `DISMISS_TOAST` | compara, escreve | `src/hooks/useToast.ts` |
| `type` | `REMOVE_TOAST` | compara, escreve | `src/hooks/useToast.ts` |
| `type` | `S-1200` | escreve | `src/components/folha/FolhaESocialSync.tsx` |
| `type` | `S-1210` | escreve | `src/components/folha/FolhaESocialSync.tsx` |
| `type` | `S-1299` | escreve | `src/components/folha/FolhaESocialSync.tsx` |
| `type` | `UPDATE_TOAST` | compara, escreve | `src/hooks/useToast.ts` |
| `type` | `admissao` | escreve | `src/components/dashboard/EventTimeline.tsx` |
| `type` | `afastamento` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `all` | compara | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx` |
| `type` | `anotacao` | compara, escreve | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `type` | `aprovador` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx`<br>`src/pages/WorkflowsPage.tsx` |
| `type` | `auditoria` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `avaliacao` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `cardinal` | escreve | `src/hooks/useTranslation.ts` |
| `type` | `cargo` | escreve | `src/hooks/useHistoricoColaborador.ts` |
| `type` | `chore` | escreve | `release.config.js` |
| `type` | `ci` | escreve | `release.config.js` |
| `type` | `contrato` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `cpf` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `creation` | compara, escreve | `src/components/esocial/ESocialTimeline.tsx` |
| `type` | `critical` | compara, escreve | `src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `ctps` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `day` | compara | `src/components/colaborador-detalhes/historico/HistoryEventRow.tsx` |
| `type` | `delay` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `desligamento` | escreve | `src/hooks/useHistoricoColaborador.ts` |
| `type` | `disabled` | escreve | `supabase/functions/_shared/aiProvider.ts` |
| `type` | `docs` | escreve | `release.config.js` |
| `type` | `email` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `end` | compara, escreve | `src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `entrevista` | compara, escreve | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `type` | `event` | escreve | `supabase/functions/_shared/sentry.ts` |
| `type` | `feat` | escreve | `release.config.js` |
| `type` | `ferias` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `fix` | escreve | `release.config.js` |
| `type` | `foto` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `gateway_and` | compara, escreve | `src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `gateway_xor` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `image_url` | escreve | `supabase/functions/OCR/index.ts`<br>`supabase/functions/process-document-ocr/index.ts`<br>`supabase/functions/validar-biometria/index.ts` |
| `type` | `info` | compara, escreve | `src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `json_object` | escreve | `supabase/functions/process-document-ocr/index.ts` |
| `type` | `literal` | compara | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `type` | `magiclink` | escreve | `src/pages/AuthCallbackPage.tsx`<br>`supabase/functions/auth-gov-br/index.ts` |
| `type` | `medida_disciplinar` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `module` | escreve | `vite.config.pwa.ts` |
| `type` | `month` | compara | `src/components/colaborador-detalhes/historico/HistoryEventRow.tsx` |
| `type` | `object` | compara | `src/components/animate-ui/primitives/animate/slot.tsx` |
| `type` | `onboarding` | escreve | `src/hooks/useHistoricoColaborador.ts` |
| `type` | `oxc` | escreve | `vite.config.ts` |
| `type` | `perf` | escreve | `release.config.js` |
| `type` | `promocao` | escreve | `src/hooks/useHistoricoColaborador.ts` |
| `type` | `refactor` | escreve | `release.config.js` |
| `type` | `residencia` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `rg` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `salario` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `server` | escreve | `src/hooks/useServerValidation.ts` |
| `type` | `spring` | escreve | `src/components/animate-ui/primitives/animate/tabs.tsx`<br>`src/components/animate-ui/primitives/effects/highlight.tsx`<br>`src/components/dashboard/WorkforceHealthScore.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>`src/components/layout/MobileBottomNav.tsx`<br>… +8 |
| `type` | `start` | compara, escreve | `src/components/workflows/WorkflowDesigner.tsx`<br>`src/components/workflows/ordenarEtapas.ts`<br>`src/pages/WorkflowsPage.tsx` |
| `type` | `string` | compara | `supabase/functions/tabelas-dominio/index.ts` |
| `type` | `style` | escreve | `release.config.js` |
| `type` | `success` | compara, escreve | `src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `test` | escreve | `release.config.js` |
| `type` | `teste` | compara, escreve | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `type` | `text` | escreve | `supabase/functions/OCR/index.ts`<br>`supabase/functions/process-document-ocr/index.ts`<br>`supabase/functions/validar-biometria/index.ts` |
| `type` | `transferencia` | escreve | `src/hooks/useHistoricoColaborador.ts` |
| `type` | `transmission` | escreve | `src/components/esocial/ESocialTimeline.tsx` |
| `type` | `treinamento` | escreve | `src/hooks/useHistoricoColaborador.ts`<br>`src/mocks/colaboradoresMock.ts` |
| `type` | `tween` | escreve | `src/components/layout/PageTransition.tsx` |
| `type` | `vinculo` | escreve | `src/hooks/useHistoricoColaborador.ts` |
| `type` | `warning` | compara, escreve | `src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `webhook` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `window` | escreve | `public/sw-custom.js` |
| `tipo` | `13_salario` | escreve | `supabase/functions/calcular-provisoes/index.ts` |
| `tipo` | `Admissional` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `Admissão` | escreve | `src/mocks/colaboradoresMock.ts`<br>`src/services/vinculoService.ts` |
| `tipo` | `Auditiva` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `Contrato` | compara | `src/components/portal/PortalDocumentosTab.tsx` |
| `tipo` | `Física` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `LTCAT` | compara | `src/components/sst/SSTProgramasTab.tsx` |
| `tipo` | `Manual` | escreve | `src/services/backupService.ts` |
| `tipo` | `Motivo` | escreve | `src/components/desligamentos/trilhaDerivacoes.ts` |
| `tipo` | `Outros` | escreve | `src/components/colaborador-detalhes/ColaboradorDocuments.tsx`<br>`src/components/colaborador-detalhes/documentos/DocumentosDigitaisCard.tsx`<br>`src/mocks/colaboradoresMock.ts` |
| `tipo` | `PCMSO` | compara | `src/components/sst/SSTProgramasTab.tsx` |
| `tipo` | `PGR` | compara, escreve, filtra | `src/components/sst/GerarPgrButton.tsx`<br>`src/components/sst/SSTProgramasTab.tsx`<br>`supabase/functions/gerar-pgr/index.ts` |
| `tipo` | `PO_QUIMICO_ABC` | escreve | `src/pages/AdminExtintoresPage.tsx` |
| `tipo` | `PPP` | compara | `src/components/sst/SSTProgramasTab.tsx` |
| `tipo` | `Periódico` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `Readmissão` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `S-1000` | compara | `src/utils/esocialXmlGenerator.ts`<br>`supabase/functions/enviar-esocial/index.ts` |
| `tipo` | `S-2200` | compara | `src/utils/esocialXmlGenerator.ts`<br>`supabase/functions/enviar-esocial/index.ts` |
| `tipo` | `TODAS` | compara | `supabase/functions/gerar-guias/index.ts` |
| `tipo` | `VA` | escreve | `src/pages/ValesPage.tsx` |
| `tipo` | `aberta` | compara, escreve | `src/components/recrutamento/vagasComum.ts` |
| `tipo` | `absenteismo` | escreve | `supabase/functions/alertas-preditivos/index.ts` |
| `tipo` | `acesso` | escreve | `src/pages/LGPDPage.tsx` |
| `tipo` | `acidente_grave` | compara | `src/components/sst/SSTIncidentesTab.tsx` |
| `tipo` | `acidente_leve` | compara | `src/components/sst/SSTIncidentesTab.tsx` |
| `tipo` | `acordo` | compara | `src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `acordo_mutuo` | compara | `src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `admissoes` | escreve | `src/pages/DashboardPage.tsx` |
| `tipo` | `advertencia` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `advertencia_escrita` | compara, escreve | `src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx` |
| `tipo` | `advertencia_verbal` | compara, escreve | `src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx` |
| `tipo` | `afastamentos` | escreve | `src/pages/DashboardPage.tsx` |
| `tipo` | `afastamentos_ativos` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `aleatoria` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `alerta` | escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `alimentacao` | escreve | `src/mocks/colaboradoresMock.ts`<br>`src/pages/BeneficioFormPage.tsx` |
| `tipo` | `alimenticia` | escreve | `src/pages/PensoesPage.tsx` |
| `tipo` | `alta` | compara | `src/components/dashboard/analytics/widgets.tsx` |
| `tipo` | `anual` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `aprovacao` | escreve | `src/components/premiacoes/premiacoesComum.ts` |
| `tipo` | `aso` | compara, escreve | `src/components/colaborador-detalhes/destinosDossie.ts`<br>`src/hooks/useProximosEventos.ts` |
| `tipo` | `assinaturas` | compara, escreve | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/pages/DashboardExecutivoPage.tsx`<br>`src/pages/DashboardPage.tsx` |
| `tipo` | `atestado_medico` | compara | `src/pages/FaltasPage.tsx` |
| `tipo` | `atraso` | compara, escreve | `src/components/ponto/PontoOcorrenciasCard.tsx` |
| `tipo` | `auditoria` | compara | `supabase/functions/relatorio/index.ts` |
| `tipo` | `auto` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `avancar` | compara, escreve | `src/components/premiacoes/PagamentosTabela.tsx`<br>`src/components/premiacoes/pagamentosComum.ts` |
| `tipo` | `aviso` | escreve | `src/pages/ComunicacaoInternaPage.tsx` |
| `tipo` | `cancelado` | compara | `src/components/avaliacao/historicoFeedback.ts` |
| `tipo` | `cancelar` | compara, escreve | `src/pages/AdminAgendamentoExamesPage.tsx` |
| `tipo` | `certificate` | compara | `src/services/trainingImages/briefing.ts`<br>`supabase/functions/_shared/trainingImages/briefing.ts` |
| `tipo` | `checkbox` | compara | `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx` |
| `tipo` | `clima` | escreve | `src/pages/PesquisasClimaPage.tsx` |
| `tipo` | `cnpj` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `colaboradores` | compara | `supabase/functions/relatorio/index.ts` |
| `tipo` | `com_justa_causa` | compara | `src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `conciliacao` | escreve | `src/components/premiacoes/premiacoesComum.ts` |
| `tipo` | `conciliar` | compara, escreve | `src/components/premiacoes/PagamentosTab.tsx`<br>`src/components/premiacoes/PagamentosTabela.tsx`<br>`src/components/premiacoes/pagamentosComum.ts` |
| `tipo` | `configuracao` | escreve | `src/components/premiacoes/premiacoesComum.ts` |
| `tipo` | `contrato_vencendo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `conversao` | escreve | `src/components/recrutamento/analyticsComum.ts` |
| `tipo` | `course` | compara | `src/services/trainingImages/briefing.ts`<br>`supabase/functions/_shared/trainingImages/briefing.ts` |
| `tipo` | `cpf` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `credito` | compara, escreve, filtra | `src/pages/BancoHorasPage.tsx`<br>`src/pages/DashboardPage.tsx`<br>`src/pages/PontoPage.tsx`<br>`src/services/bancoHorasService.ts`<br>`supabase/functions/processar-ponto/index.ts` |
| `tipo` | `culpa_reciproca` | compara | `src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `currency` | escreve | `src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `darf` | escreve | `src/services/edgeFunctionsService.ts` |
| `tipo` | `data` | compara | `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx` |
| `tipo` | `debito` | compara | `src/pages/BancoHorasPage.tsx` |
| `tipo` | `dependente` | escreve | `src/pages/PlanosSaudePage.tsx` |
| `tipo` | `desconto` | compara, escreve | `src/components/folha/LancamentosDialog.tsx`<br>`src/constants/rubricas.ts`<br>`src/pages/RubricasPage.tsx`<br>`src/services/folha/calculoLoteService.ts`<br>`src/services/folhaPagamentoService.ts`<br>… +2 |
| `tipo` | `desconto_excessivo` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `desistencia` | escreve | `src/components/recrutamento/analyticsComum.ts` |
| `tipo` | `detalhes` | compara, escreve | `src/components/premiacoes/PagamentosTab.tsx`<br>`src/components/premiacoes/PagamentosTabela.tsx`<br>`src/components/premiacoes/pagamentosComum.ts` |
| `tipo` | `divergencia_esocial` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `documento` | compara, escreve | `src/components/colaborador-detalhes/destinosDossie.ts`<br>`src/hooks/useProximosEventos.ts` |
| `tipo` | `documento_vencendo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `elogio` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `email` | compara, escreve | `supabase/functions/enviar-email-admissao/index.ts`<br>`supabase/functions/notificacao/index.ts`<br>`supabase/functions/pix-lote/index.ts`<br>`supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `tipo` | `empresa` | escreve | `src/mocks/desempenhoMock.ts`<br>`src/services/rescisaoService.ts` |
| `tipo` | `entrada` | compara, escreve | `src/components/ponto/PontoClockRegister.tsx`<br>`src/hooks/usePonto.ts`<br>`src/hooks/usePontoOffline.ts`<br>`src/pages/ControleAcessoPage.tsx`<br>`src/pages/PontoKioskPage.tsx`<br>… +5 |
| `tipo` | `equipe` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `evp` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `exame` | escreve | `src/components/dashboard/MorningBriefing.tsx` |
| `tipo` | `excessive_overtime` | escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `experiencia` | compara, escreve | `src/components/colaborador-detalhes/destinosDossie.ts`<br>`src/hooks/useProximosEventos.ts`<br>`src/mocks/desempenhoMock.ts` |
| `tipo` | `falecimento` | compara | `src/pages/CalculadoraRescisaoPage.tsx` |
| `tipo` | `falta` | escreve | `src/components/ponto/PontoOcorrenciasCard.tsx` |
| `tipo` | `falta_informacao` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `fatigue_risk` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `feedback` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `ferias` | compara, escreve | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/hooks/usePendencias.ts`<br>`src/pages/DashboardExecutivoPage.tsx`<br>`src/pages/DashboardPage.tsx`<br>`src/pages/ProvisoesPage.tsx`<br>… +3 |
| `tipo` | `ferias_aprovada` | escreve | `src/hooks/useFeriasAprovacao.ts` |
| `tipo` | `ferias_inicio` | compara, escreve | `src/components/colaborador-detalhes/destinosDossie.ts`<br>`src/hooks/useProximosEventos.ts` |
| `tipo` | `ferias_proximas` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `ferias_rejeitada` | escreve | `src/hooks/useFeriasAprovacao.ts` |
| `tipo` | `ferias_vencendo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `ferias_vencimento` | compara, escreve | `src/components/colaborador-detalhes/destinosDossie.ts`<br>`src/hooks/useProximosEventos.ts` |
| `tipo` | `fgts` | compara, escreve | `src/pages/ObrigacoesFiscaisPage.tsx` |
| `tipo` | `fim_contrato` | compara | `src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `fixo` | escreve | `src/components/workflows/WorkflowDesigner.tsx` |
| `tipo` | `folha` | compara | `supabase/functions/relatorio/index.ts` |
| `tipo` | `folha_resumo` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `forgotten_out` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `gargalo` | escreve | `src/components/recrutamento/analyticsComum.ts` |
| `tipo` | `geral` | escreve | `src/components/colaborador-detalhes/AnotacoesTab.tsx`<br>`src/components/colaborador-detalhes/documentos/AnotacoesInternasCard.tsx`<br>`src/mocks/colaboradoresMock.ts` |
| `tipo` | `gestor` | escreve | `src/components/avaliacao/nineBoxMock.ts`<br>`src/mocks/desempenhoMock.ts`<br>`src/pages/NineBoxPreviewPage.tsx`<br>`src/services/avaliacaoService.ts` |
| `tipo` | `historico` | escreve | `src/components/avaliacao/nineBoxComum.ts` |
| `tipo` | `holerite_disponivel` | escreve | `supabase/functions/distribuir-holerites/index.ts` |
| `tipo` | `indicadores_dp` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `individual` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `informativa` | compara, escreve | `src/components/folha/RubricasDialog.tsx`<br>`src/constants/rubricas.ts`<br>`src/schemas/esocial/rubricaValidator.ts` |
| `tipo` | `informativo` | compara | `src/pages/RubricasPage.tsx` |
| `tipo` | `injustificada` | compara, escreve | `src/pages/FaltasPage.tsx` |
| `tipo` | `integer` | escreve | `src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `justa_causa` | compara, escreve | `src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/pages/CalculadoraRescisaoPage.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>… +1 |
| `tipo` | `justificada` | compara | `src/pages/FaltasPage.tsx` |
| `tipo` | `learning_path` | compara | `src/services/trainingImages/briefing.ts`<br>`supabase/functions/_shared/trainingImages/briefing.ts` |
| `tipo` | `linha` | escreve | `src/components/desligamentos/TurnoverChart.tsx` |
| `tipo` | `liquido_negativo` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `lista_colaboradores` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `ltcat` | escreve | `src/components/sst/GerarLtcatOsButton.tsx` |
| `tipo` | `media` | compara | `src/components/dashboard/analytics/widgets.tsx` |
| `tipo` | `mensal` | escreve, filtra | `src/components/folha/FolhaDashboard.tsx`<br>`src/hooks/useCalculoFolha.ts`<br>`src/pages/FolhaPagamentoPage.tsx`<br>`src/pages/ObrigacoesFiscaisPage.tsx`<br>`src/services/folha/calculoLoteService.ts` |
| `tipo` | `meta` | compara, escreve | `src/pages/AvaliacaoPage.tsx` |
| `tipo` | `moeda` | escreve | `src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `numero` | compara, escreve | `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx`<br>`src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `onboarding` | compara, escreve | `src/components/colaborador-detalhes/destinosDossie.ts`<br>`src/hooks/useProximosEventos.ts` |
| `tipo` | `oportunidade` | escreve | `src/components/avaliacao/nineBoxComum.ts` |
| `tipo` | `os` | compara, escreve | `src/components/sst/GerarLtcatOsButton.tsx`<br>`supabase/functions/gerar-ltcat-os/index.ts` |
| `tipo` | `padrao` | escreve | `src/pages/JornadasPage.tsx` |
| `tipo` | `par` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `pdi` | escreve | `src/components/avaliacao/nineBoxComum.ts`<br>`src/pages/AvaliacaoPage.tsx` |
| `tipo` | `pedido_demissao` | compara | `src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `percentage` | escreve | `src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `percentual` | escreve | `src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `periodo_aquisitivo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `ponto` | compara, escreve | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/pages/DashboardExecutivoPage.tsx`<br>`src/pages/DashboardPage.tsx`<br>`supabase/functions/relatorio/index.ts` |
| `tipo` | `ponto_aprovado` | compara | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/NotificationsDialog.tsx` |
| `tipo` | `ponto_recusado` | compara | `src/components/dashboard/analytics/NotificationsDialog.tsx` |
| `tipo` | `potencial` | escreve | `src/components/avaliacao/nineBoxComum.ts` |
| `tipo` | `pp` | compara, escreve | `src/components/premiacoes/RewardsSimulator.tsx` |
| `tipo` | `premiacao_critica` | escreve | `src/services/premiacoesService.ts` |
| `tipo` | `provento` | compara, escreve | `src/components/folha/RelatorioContabilDialog.tsx`<br>`src/components/folha/RubricasDialog.tsx`<br>`src/constants/rubricas.ts`<br>`src/pages/RubricasPage.tsx`<br>`src/services/folha/calculoLoteService.ts`<br>… +3 |
| `tipo` | `push` | compara, escreve | `supabase/functions/notificacao/index.ts`<br>`supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `tipo` | `quase_acidente` | compara, escreve | `src/components/sst/SSTIncidentesTab.tsx`<br>`src/pages/SSTPage.tsx` |
| `tipo` | `reembolso` | escreve | `src/pages/DespesasPage.tsx` |
| `tipo` | `reiniciar` | compara, escreve | `src/components/premiacoes/PagamentosTab.tsx`<br>`src/components/premiacoes/PagamentosTabela.tsx`<br>`src/components/premiacoes/pagamentosComum.ts` |
| `tipo` | `rejeitar` | compara | `src/components/premiacoes/PagamentosTab.tsx` |
| `tipo` | `remarcar` | compara, escreve | `src/pages/AdminAgendamentoExamesPage.tsx` |
| `tipo` | `remoto` | compara | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `tipo` | `retorno_almoco` | compara, escreve | `src/components/ponto/PontoClockRegister.tsx`<br>`supabase/functions/processar-ponto-offline/index.ts` |
| `tipo` | `risco` | escreve | `src/components/avaliacao/nineBoxComum.ts` |
| `tipo` | `saida` | compara, escreve | `src/components/ponto/PontoClockRegister.tsx`<br>`src/pages/ControleAcessoPage.tsx`<br>`supabase/functions/processar-ponto/index.ts` |
| `tipo` | `saida_almoco` | escreve | `src/components/ponto/PontoClockRegister.tsx` |
| `tipo` | `saude` | escreve | `src/mocks/colaboradoresMock.ts`<br>`src/pages/PlanosSaudePage.tsx` |
| `tipo` | `seguro` | escreve | `src/mocks/colaboradoresMock.ts` |
| `tipo` | `selecao` | compara, escreve | `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx`<br>`src/components/settings/CamposCustomizadosTab.tsx`<br>`src/mocks/colaboradoresMock.ts` |
| `tipo` | `sem_batida` | compara | `src/pages/AdminPontoDivergenciasPage.tsx` |
| `tipo` | `sem_colaborador` | compara | `src/pages/AdminPontoDivergenciasPage.tsx` |
| `tipo` | `sem_justa_causa` | compara, escreve | `src/calculators/rescisao.ts`<br>`src/components/desligamentos/NovoDesligamentoDialog.tsx`<br>`src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>… +1 |
| `tipo` | `semestral` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `short_break` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `subordinado` | escreve | `src/mocks/desempenhoMock.ts` |
| `tipo` | `sucesso` | escreve | `src/services/notificacoesService.ts` |
| `tipo` | `suspensao` | compara, escreve | `src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/components/medidas-disciplinares/MedidasTable.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx`<br>`supabase/functions/gerar-medida-disciplinar-pdf/index.ts` |
| `tipo` | `telefone` | compara | `src/components/recrutamento/CandidatoTimeline.tsx`<br>`supabase/functions/pix-lote/index.ts` |
| `tipo` | `termino_contrato` | compara | `src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `textarea` | compara, escreve | `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx`<br>`src/mocks/colaboradoresMock.ts` |
| `tipo` | `texto` | escreve | `src/components/settings/CamposCustomizadosTab.tsx` |
| `tipo` | `todos` | compara, escreve | `src/components/premiacoes/auditoriaComum.ts`<br>`src/pages/ObrigacoesFiscaisPage.tsx` |
| `tipo` | `total` | compara, escreve | `src/components/desligamentos/TurnoverChart.tsx` |
| `tipo` | `training_session` | compara | `src/services/trainingImages/briefing.ts`<br>`supabase/functions/_shared/trainingImages/briefing.ts` |
| `tipo` | `transporte` | compara, escreve | `src/mocks/colaboradoresMock.ts`<br>`src/services/calculoBeneficiosService.ts` |
| `tipo` | `turnover` | compara, escreve | `supabase/functions/alertas-preditivos/index.ts` |
| `tipo` | `vaga` | escreve | `src/components/recrutamento/analyticsComum.ts` |
| `tipo` | `variacao_salarial` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `vida` | escreve, filtra | `src/mocks/colaboradoresMock.ts`<br>`src/services/calculoBeneficiosService.ts` |
| `tipo` | `whatsapp` | escreve | `src/services/contratacaoService.ts` |
| `status` | `ARQUIVADO` | compara, escreve | `src/pages/AdminRegimentoInternoPage.tsx` |
| `status` | `ATIVO` | escreve | `src/pages/AdminExtintoresPage.tsx` |
| `status` | `Ativo` | escreve | `supabase/functions/sincronizar-bitrix/index.ts` |
| `status` | `CHANNEL_ERROR` | compara | `src/hooks/useRealTimeSubscription.ts` |
| `status` | `CONCLUIDO` | compara, escreve, filtra | `src/pages/ProvisoesPage.tsx`<br>`supabase/functions/calcular-provisoes/index.ts` |
| `status` | `ERRO` | compara | `src/pages/ProvisoesPage.tsx` |
| `status` | `Estado` | escreve | `src/i18n/index.ts` |
| `status` | `PROCESSANDO` | compara, escreve | `src/pages/ProvisoesPage.tsx`<br>`supabase/functions/calcular-provisoes/index.ts` |
| `status` | `PUBLICADO` | compara, filtra | `src/components/portal/PortalRegimentoCard.tsx`<br>`src/pages/AdminRegimentoInternoPage.tsx` |
| `status` | `RASCUNHO` | compara, escreve, filtra | `src/pages/AdminRegimentoInternoPage.tsx` |
| `status` | `SUBSCRIBED` | compara | `src/hooks/useRealTimeSubscription.ts` |
| `status` | `Status` | escreve | `src/components/desligamentos/trilhaDerivacoes.ts`<br>`src/i18n/index.ts` |
| `status` | `aberta` | compara, escreve, filtra | `src/components/recrutamento/AnalyticsVagas.tsx`<br>`src/components/recrutamento/analyticsComum.ts`<br>`src/components/recrutamento/vagasComum.ts`<br>`src/hooks/useCalculoFolha.ts`<br>`src/pages/ObrigacoesFiscaisPage.tsx`<br>… +4 |
| `status` | `aberto` | compara, escreve | `src/components/ferias/GerenciamentoPeriodos.tsx`<br>`src/pages/CanalEticaPage.tsx`<br>`src/pages/ComunicacaoInternaPage.tsx`<br>`src/pages/SegurosVidaPage.tsx`<br>`src/services/cnabService.ts` |
| `status` | `accepted` | compara, escreve | `src/components/folha/FolhaESocialSync.tsx`<br>`supabase/functions/alertas-dp/deliveryStatus.ts`<br>`supabase/functions/enviar-relatorio/index.ts` |
| `status` | `active` | escreve | `supabase/functions/webhook/contract_test.ts` |
| `status` | `adquirido` | compara, filtra | `src/components/ferias/FeriasForm.tsx`<br>`src/hooks/useNotificacoes.ts` |
| `status` | `afastado` | compara, escreve, filtra | `src/mocks/colaboradoresMock.ts`<br>`supabase/functions/enviar-relatorio/index.ts`<br>`supabase/functions/metricas/index.ts` |
| `status` | `agendada` | compara | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `status` | `agendado` | compara | `src/pages/AdminAgendamentoExamesPage.tsx` |
| `status` | `aguardando_gestor` | compara | `src/components/avaliacao/aprovacaoGestor.ts` |
| `status` | `aguardando_inicio` | escreve | `src/mocks/treinamentosMock.ts` |
| `status` | `aguardando_inss` | compara, escreve | `src/pages/AfastamentosPage.tsx`<br>`src/services/afastamentoService.ts` |
| `status` | `all` | compara | `src/hooks/ferias/useProgramacaoFerias.ts`<br>`src/pages/ColaboradoresPage.tsx`<br>`src/services/colaboradorService.ts`<br>`src/services/feriasService.ts` |
| `status` | `aprovada` | compara, escreve, filtra | `src/components/colaborador-detalhes/FeriasResumoTab.tsx`<br>`src/components/dashboard/MorningBriefing.tsx`<br>`src/components/ferias/CalendarioFerias.tsx`<br>`src/components/ferias/FeriasDashboard.tsx`<br>`src/components/portal/PortalOverviewTab.tsx`<br>… +7 |
| `status` | `aprovada_gestor` | compara | `src/components/avaliacao/FeedbackAcoesRodape.tsx`<br>`src/components/avaliacao/FeedbacksTab.tsx`<br>`src/components/avaliacao/aprovacaoGestor.ts` |
| `status` | `aprovado` | compara, escreve, filtra | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/components/descontos/AdiantamentosTable.tsx`<br>`src/components/ferias/FeriasAuditTimeline.tsx`<br>`src/components/ferias/FeriasWorkflowStepper.tsx`<br>… +13 |
| `status` | `aprovado_financeiro` | compara | `src/components/premiacoes/pagamentosComum.ts`<br>`src/services/premiacoesService.ts` |
| `status` | `aprovado_gestor` | compara | `src/components/ferias/programacao/CardProgramacao.tsx`<br>`src/pages/FeriasProgramacaoPage.tsx` |
| `status` | `aprovado_parcial` | compara | `supabase/functions/pix-lote/index.ts` |
| `status` | `aprovado_rh` | compara | `src/components/ferias/programacao/CardProgramacao.tsx`<br>`src/pages/FeriasProgramacaoPage.tsx` |
| `status` | `arquivada` | escreve | `supabase/functions/gerar-ltcat-os/index.ts` |
| `status` | `arquivado` | compara, escreve | `src/pages/CanalContabilidadePage.tsx`<br>`supabase/functions/gerar-ltcat-os/index.ts`<br>`supabase/functions/gerar-pgr/index.ts` |
| `status` | `assinada` | compara, escreve | `src/pages/AdminEpisFichasPage.tsx` |
| `status` | `assinado` | compara, escreve | `src/components/contratos/ContratosVencendoPanel.tsx`<br>`src/components/portal/PortalDocumentosTab.tsx`<br>`src/hooks/useAssinaturas.ts`<br>`src/pages/ContratosGeradosPage.tsx` |
| `status` | `ativa` | compara, escreve, filtra | `src/pages/PesquisasClimaPage.tsx`<br>`supabase/functions/gerar-ltcat-os/index.ts` |
| `status` | `ativo` | compara, escreve, filtra | `src/components/dashboard/MorningBriefing.tsx`<br>`src/components/descontos/EmprestimosTable.tsx`<br>`src/components/descontos/FinancialSummaryCards.tsx`<br>`src/components/descontos/NewLoanDialog.tsx`<br>`src/components/desligamentos/NovoDesligamentoDialog.tsx`<br>… +55 |
| `status` | `ativos` | compara | `src/components/admissoes/GestaoKits.tsx` |
| `status` | `calculada` | compara, escreve | `src/services/folhaPagamentoService.ts`<br>`supabase/functions/calcular-folha/index.ts`<br>`supabase/functions/fechar-folha/index.ts` |
| `status` | `calculado` | compara, escreve | `src/components/desligamentos/trilhaDerivacoes.ts`<br>`src/components/premiacoes/PagamentosTabela.tsx`<br>`src/components/premiacoes/pagamentosComum.ts`<br>`src/services/rescisaoService.ts` |
| `status` | `cancelada` | compara, escreve | `src/components/colaborador-detalhes/FeriasResumoTab.tsx`<br>`src/components/ferias/CalendarioFerias.tsx`<br>`src/components/ferias/FeriasAuditTimeline.tsx`<br>`src/services/feriasService.ts`<br>`src/utils/regrasSolicitacaoFerias.ts` |
| `status` | `cancelado` | compara, escreve, filtra | `src/components/afastamentos/AfastamentoTable.tsx`<br>`src/components/contratos/ContratosVencendoPanel.tsx`<br>`src/components/descontos/EmprestimosTable.tsx`<br>`src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/components/desligamentos/trilhaDerivacoes.ts`<br>… +4 |
| `status` | `completed` | compara, filtra | `supabase/functions/_shared/idempotency.ts` |
| `status` | `completo` | escreve | `src/services/backupService.ts` |
| `status` | `comunicado` | compara | `src/components/desligamentos/desligamentosDerivacoes.ts`<br>`src/components/desligamentos/trilhaDerivacoes.ts` |
| `status` | `concluida` | compara, escreve | `src/components/colaborador-detalhes/FeriasResumoTab.tsx`<br>`src/components/ferias/CalendarioFerias.tsx`<br>`src/mocks/colaboradoresMock.ts`<br>`src/pages/LGPDPage.tsx`<br>`src/pages/PassivoTrabalhistaPage.tsx`<br>… +1 |
| `status` | `concluida_validada` | compara | `src/components/avaliacao/FeedbackAcoesRodape.tsx`<br>`src/components/avaliacao/aprovacaoGestor.ts`<br>`src/components/avaliacao/feedbackCanonico.ts` |
| `status` | `concluido` | compara, escreve | `src/components/avaliacao/nineBoxMock.ts`<br>`src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>`src/components/desligamentos/desligamentosDerivacoes.ts`<br>… +9 |
| `status` | `configurando` | escreve | `src/pages/IntegracoesPage.tsx` |
| … +202 linhas — lista completa em `context.json` | | | |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| aal_level | `aal1`, `aal2`, `aal3` | banco |
| code_challenge_method | `s256`, `plain` | banco |
| factor_status | `unverified`, `verified` | banco |
| factor_type | `totp`, `webauthn`, `phone` | banco |
| oauth_authorization_status | `pending`, `approved`, `denied`, `expired` | banco |
| oauth_client_type | `public`, `confidential` | banco |
| oauth_registration_type | `dynamic`, `manual` | banco |
| oauth_response_type | `code` | banco |
| one_time_token_type | `confirmation_token`, `reauthentication_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `phone_change_token` | banco |
| app_role | `admin`, `gestor`, `rh`, `user` | banco |
| dp_pii_sensitivity | `publico`, `interno`, `confidencial`, `sensivel`, `critico` | banco |
| dp_user_role | `colaborador`, `gestor`, `rh`, `auditoria`, `admin`, `dpo` | banco |
| escolaridade | `fundamental_incompleto`, `fundamental_completo`, `medio_incompleto`, `medio_completo`, `superior_incompleto`, `superior_completo`, `pos_graduacao`, `mestrado`, `doutorado` | banco |
| estado_civil | `solteiro`, `casado`, `divorciado`, `viuvo`, `separado`, `uniao_estavel` | banco |
| etapa_admissao | `solicitacao`, `documentos`, `validacao`, `pendente`, `exame`, `contrato`, `assinatura`, `esocial` | banco |
| programacao_ferias_status | `rascunho`, `sugerido_gestor`, `aprovado_gestor`, `aprovado_rh`, `convertido`, `rejeitado`, `cancelado` | banco |
| regime_tributario | `simples_nacional`, `lucro_presumido`, `lucro_real`, `mei` | banco |
| sexo | `masculino`, `feminino` | banco |
| status_afastamento | `ativo`, `encerrado`, `cancelado`, `prorrogado` | banco |
| status_colaborador | `ativo`, `ferias`, `afastado`, `desligado`, `pendente` | banco |
| status_folha | `aberta`, `calculada`, `fechada`, `paga` | banco |
| tipo_afastamento | `doenca`, `acidente_trabalho`, `acidente_trajeto`, `licenca_maternidade`, `licenca_paternidade`, `licenca_casamento`, `licenca_obito`, `licenca_nao_remunerada`, `servico_militar`, `mandato_sindical`, `suspensao_disciplinar`, `outros` | banco |
| tipo_conta | `corrente`, `poupanca`, `salario` | banco |
| tipo_contrato | `clt`, `pj`, `estagiario`, `temporario`, `intermitente`, `aprendiz` | banco |
| tipo_desligamento | `sem_justa_causa`, `justa_causa`, `pedido_demissao`, `acordo`, `fim_contrato`, `falecimento` | banco |
| tipo_evento_folha | `provento`, `desconto`, `informativo` | banco |
| buckettype | `STANDARD`, `ANALYTICS`, `VECTOR` | banco |
| GrauInsalubridade | minimo \| medio \| maximo | `src/calculators/beneficios.ts` |
| TipoRescisao | sem_justa_causa \| com_justa_causa \| justa_causa \| pedido_demissao \| acordo_mutuo \| culpa_reciproca \| termino_contrato \| falecimento | `src/calculators/rescisao.ts` |
| AbaAdmissoes | gestao \| kanban | `src/components/admissoes/AdmissoesDashboard.tsx` |
| GestaoVisualizacao | tabela \| cards | `src/components/admissoes/GestaoCandidatos.tsx` |
| Tone | primary \| info \| success \| warning \| destructive | `src/components/admissoes/admissoesComum.ts` |
| ToneSelo | success \| warning \| destructive | `src/components/admissoes/admissoesComum.ts` |
| CampoChecklist | checklist_documentos_pessoais \| checklist_comprovante_endereco \| checklist_foto \| checklist_ctps \| checklist_exame_admissional \| checklist_contrato_assinado \| checklist_esocial_enviado | `src/components/admissoes/admissoesComum.ts` |
| ETAPA_FLUXO | 'solicitacao', 'documentos', 'validacao', 'pendente', 'exame', 'contrato', 'assinatura', 'esocial', | `src/components/admissoes/admissoesComum.ts` |
| SlaSegmento | dentro \| risco \| atrasada | `src/components/admissoes/admissoesDashboardModais.tsx` |
| TomEtapa | info \| warning \| teal \| violet \| success \| primary \| destructive \| aqua | `src/components/admissoes/kanbanComum.ts` |
| TomLinha | neutro \| acento \| alerta \| ok | `src/components/admissoes/kanbanComum.ts` |
| DOCS_CHECKLIST | 'checklist_documentos_pessoais', 'checklist_comprovante_endereco', 'checklist_foto', 'checklist_ctps', 'checklist_exame_admissional', 'checklist_contrato_assinado', | `src/components/admissoes/kanbanComum.ts` |
| MARCOS_ONBOARDING | 'Início', 'Parcial', 'Avançado', 'Completo' | `src/components/admissoes/onboardingComum.ts` |
| EstadoMarco | concluido \| atual \| pendente | `src/components/admissoes/onboardingDerivacoes.ts` |
| TomPrazo | atraso \| hoje \| proximo \| neutro | `src/components/admissoes/onboardingDerivacoes.ts` |
| SituacaoOnboarding | concluido \| em_dia \| em_risco \| atrasado \| sem_proxima_acao \| cancelado | `src/components/admissoes/onboardingDerivacoes.ts` |
| OrdemOnboarding | criticos \| atrasados \| inicio_recente \| inicio_antigo \| maior_progresso \| menor_progresso \| nome | `src/components/admissoes/onboardingDerivacoes.ts` |
| EstadoAnimacaoLegenda | aguardando \| animar \| final | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| ContextoAcoes | avaliacoes \| aguardando_gestor \| rh | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| SituacaoPotencial | sem_validacao \| validada \| desatualizada | `src/components/avaliacao/acoesFeedback.ts` |
| OperacaoDemo | aprovar \| devolver \| reenviar \| validar_potencial \| enviar | `src/components/avaliacao/aprovacaoLocal.ts` |
| PeriodoAuditoria | todos \| hoje \| ontem \| 7d \| 30d | `src/components/avaliacao/auditoriaComum.ts` |
| OrigemAuditoria | todos \| usuario \| sistema | `src/components/avaliacao/auditoriaComum.ts` |
| AcaoAuditoria | INSERT \| UPDATE \| DELETE | `src/components/avaliacao/auditoriaFeedback.ts` |
| ImpedimentoAuditoria | registro_ausente \| tabela_ausente \| sem_campos_alterados \| campos_divergentes | `src/components/avaliacao/auditoriaFeedback.ts` |
| PaletaChip | lime \| blue \| emerald \| amber \| red \| violet | `src/components/avaliacao/chipFiltroComum.ts` |
| TIPOS_FEEDBACK | 'gestor', 'par', 'auto', 'subordinado' | `src/components/avaliacao/criacaoFeedback.ts` |
| EntidadeDemo | ciclos \| metas \| feedbacks \| pdis | `src/components/avaliacao/desempenhoDemoStore.ts` |
| MotivoBloqueioEscrita | dado_ficticio \| demonstracao | `src/components/avaliacao/escritaOperacional.ts` |
| OrigemExecucao | real \| demo \| previa \| indisponivel | `src/components/avaliacao/execucaoFeedback.ts` |
| AcaoFinalizacao | concluir \| cancelar \| reabrir | `src/components/avaliacao/execucaoFeedback.ts` |
| EstadoCampo | informado \| nao_informado \| nao_aplicavel | `src/components/avaliacao/feedbackCanonico.ts` |
| StatusCanonicoChave | pendente \| em_revisao \| concluido \| cancelado \| desconhecido | `src/components/avaliacao/feedbackCanonico.ts` |
| AcaoFeedbackId | ver \| editar \| verColaborador \| enviar \| concluir \| cancelar \| reabrir \| devolver \| aprovar \| validarPotencial | `src/components/avaliacao/feedbackCanonico.ts` |
| VarianteAcao | outline \| sucesso \| destrutiva \| primaria | `src/components/avaliacao/feedbackCanonico.ts` |
| TipoFeedback | gestor \| par \| auto \| subordinado | `src/components/avaliacao/feedbacksComum.ts` |
| SegmentoFeedback | todos \| gestor \| par \| auto | `src/components/avaliacao/feedbacksComum.ts` |
| CriterioOrdemFeedback | recentes \| antigos \| maior_nota \| menor_nota | `src/components/avaliacao/feedbacksComum.ts` |
| TipoEventoHistorico | criado \| editado \| concluido \| encaminhado \| devolvido \| aprovado \| cancelado \| reaberto | `src/components/avaliacao/historicoFeedback.ts` |
| SituacaoMeta | emdia \| risco \| atrasada \| concluida | `src/components/avaliacao/metasComum.ts` |
| CriterioOrdem | criticos \| prazo \| maior_progresso \| menor_progresso | `src/components/avaliacao/metasComum.ts` |
| MotivoNaoClassificado360 | sem_colaborador \| sem_ciclo \| sem_gestor \| gestor_pendente \| gestor_sem_desempenho \| gestor_sem_potencial \| aprovacao_sem_valores \| potencial_sem_validacao \| aprovacao_pendente \| aprovacao_devolvida \| sem_notas_disponiveis | `src/components/avaliacao/motorAvaliacao360.ts` |
| CATEGORIAS_360 | 'gestor', 'par', 'auto', 'subordinado' | `src/components/avaliacao/motorAvaliacao360.ts` |
| SentidoMovimento | evoluiu \| permaneceu \| regrediu | `src/components/avaliacao/nineBoxComum.ts` |
| TipoInsight | risco \| pdi \| potencial \| oportunidade \| historico | `src/components/avaliacao/nineBoxComum.ts` |
| StatusConsolidacao | consolidado \| incompleto \| sem_base | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| EstrategiaConsolidacao | mais_recente \| media_simples \| media_por_tipo | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| MotivoPeso | ok \| sem_pesos_aprovados \| sem_tipos_com_peso \| sem_avaliacoes | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| QuadranteKey | 1-1 \| 1-2 \| 1-3 \| 2-1 \| 2-2 \| 2-3 \| 3-1 \| 3-2 \| 3-3 | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| SentidoEixo | subiu \| desceu \| estavel | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| SentidoMovimento | evoluiu \| regrediu \| estavel \| mista | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| ModoNineBox | demonstracao \| real | `src/components/avaliacao/nineBoxModo.ts` |
| CategoriaPdi | todos \| em_andamento \| pendente \| concluido | `src/components/avaliacao/pdiComum.ts` |
| SituacaoPrazo | concluido \| vencido \| em_dia | `src/components/avaliacao/pdiComum.ts` |
| FiltroPrazo | todos \| vencidos \| no_prazo | `src/components/avaliacao/pdiComum.ts` |
| CriterioOrdemPdi | prazo \| prazo_desc \| recentes \| antigos | `src/components/avaliacao/pdiComum.ts` |
| AcaoStatus | concluir \| cancelar \| reabrir | `src/components/avaliacao/statusFeedback.ts` |
| PerfilOperador | admin_rh \| gestor \| avaliador \| desconhecido | `src/components/avaliacao/statusFeedback.ts` |
| ImpedimentoConclusao | avaliado_ausente \| avaliador_ausente \| ciclo_ausente \| desempenho_ausente \| desempenho_fora_da_escala | `src/components/avaliacao/statusFeedback.ts` |
| AvisoConclusao | potencial_ausente \| potencial_fora_da_escala \| sem_texto_de_apoio | `src/components/avaliacao/statusFeedback.ts` |
| ImpedimentoCancelamento | motivo_ausente \| motivo_curto | `src/components/avaliacao/statusFeedback.ts` |
| ImpedimentoReabertura | justificativa_ausente \| justificativa_curta | `src/components/avaliacao/statusFeedback.ts` |
| MotivoChaveInvalida | operacao_ausente \| operacao_sem_idempotencia \| feedback_ausente \| id_operacao_ausente | `src/components/avaliacao/statusFeedback.ts` |
| AbaPrincipal | geral \| pessoal \| profissional \| jornada \| financeiro \| documentos \| beneficios \| historico \| timeline | `src/components/colaborador-detalhes/destinosDossie.ts` |
| ColaboradorViewMode | tabela \| diretorio | `src/components/colaboradores/ColaboradorViewSwitcher.tsx` |
| MetricTone | primary \| warning \| destructive \| muted \| info \| accent \| success | `src/components/dashboard/MetricCard.tsx` |
| Tone | primary \| info \| success \| warning \| destructive | `src/components/desligamentos/desligamentosComum.ts` |
| EtapaDesligamento | comunicacao \| documentacao \| calculo \| homologacao \| pagamento \| finalizado | `src/components/desligamentos/desligamentosComum.ts` |
| TomPrazo | destructive \| warning \| muted | `src/components/desligamentos/desligamentosDerivacoes.ts` |
| STATUS_TERMINAIS | 'finalizado', 'concluido', 'cancelado', 'pago' | `src/components/desligamentos/desligamentosDerivacoes.ts` |
| CategoriaTrilha | alteracoes \| calculos \| documentos \| status \| sistema | `src/components/desligamentos/trilhaComum.ts` |
| NivelTrilha | critico \| atencao \| informativo | `src/components/desligamentos/trilhaComum.ts` |
| OrdemTrilha | recentes \| antigos | `src/components/desligamentos/trilhaDerivacoes.ts` |
| TransitionEffect | fade \| slide \| zoom \| flip \| parallax \| none | `src/components/layout/PageTransition.tsx` |
| TransitionDirection | left \| right \| up \| down | `src/components/layout/PageTransition.tsx` |
| DarfIrrfSituacao | sem_folha \| nao_calculada \| sem_itens | `src/components/obrigacoes/DarfTab.tsx` |
| GuiaTabela | guias_fgts \| guias_inss | `src/components/obrigacoes/GuiasTable.tsx` |
| ScenarioParameterUnit | integer \| currency \| percentage | `src/components/premiacoes/ScenarioParameterCard.tsx` |
| CategoriaAuditoriaId | todas \| campanhas \| pagamentos \| regras \| conciliacao \| integracoes \| aprovacoes | `src/components/premiacoes/auditoriaComum.ts` |
| TomAuditoria | success \| warning \| destructive \| info \| primary \| muted | `src/components/premiacoes/auditoriaComum.ts` |
| PeriodoAuditoria | todos \| hoje \| 7d \| 30d \| 90d \| ano | `src/components/premiacoes/auditoriaComum.ts` |
| OrdemAuditoria | recentes \| antigos | `src/components/premiacoes/auditoriaComum.ts` |
| EtapaFluxoPagamento | calculado \| em_aprovacao \| aprovado \| enviado_folha \| conciliado | `src/components/premiacoes/pagamentosComum.ts` |
| OrdenacaoPagamento | recentes \| antigos \| valor_desc \| valor_asc \| colaborador \| campanha | `src/components/premiacoes/pagamentosComum.ts` |
| TipoAcaoPagamento | avancar \| conciliar \| detalhes \| reiniciar | `src/components/premiacoes/pagamentosComum.ts` |
| STATUS_FORA_DO_FLUXO | 'rejeitado', 'divergente_em_revisao' | `src/components/premiacoes/pagamentosComum.ts` |
| FiltroStatusCampanha | todos \| ativo \| finalizado \| rascunho \| suspenso | `src/components/premiacoes/premiacoesComum.ts` |
| FiltroPeriodoCampanha | todos \| mes_atual \| ultimos_90 \| ano_atual | `src/components/premiacoes/premiacoesComum.ts` |
| OrdenacaoCampanha | inicio_recente \| inicio_antigo \| nome \| nome_desc \| atualizadas \| orcamento \| participantes \| aprovacao | `src/components/premiacoes/premiacoesComum.ts` |
| SituacaoTemporal | futura \| vigente \| encerrada | `src/components/premiacoes/premiacoesComum.ts` |
| TipoAcaoPendente | configuracao \| aprovacao \| conciliacao | `src/components/premiacoes/premiacoesComum.ts` |
| DestinoAcao | campanhas \| pagamentos | `src/components/premiacoes/premiacoesComum.ts` |
| STATUS_PAGAMENTO_PENDENTE | 'calculado', 'revisando', 'aprovado_gestor', 'aprovado_rh' | `src/components/premiacoes/premiacoesComum.ts` |
| STATUS_PAGAMENTO_LIQUIDADO | 'aprovado_financeiro', 'pago' | `src/components/premiacoes/premiacoesComum.ts` |
| TomAnalytics | primary \| info \| chart4 \| success \| warning | `src/components/recrutamento/AnalyticsPainel.tsx` |
| SeveridadeAtencao | alta \| media \| baixa | `src/components/recrutamento/analyticsComum.ts` |
| SituacaoCandidato | todas \| em_processo \| contratados \| reprovados \| arquivados | `src/components/recrutamento/candidatosComum.ts` |
| OrdenacaoCandidato | recentes \| antigos \| avaliacao \| pretensao \| nome \| experiencia | `src/components/recrutamento/candidatosComum.ts` |
| EtapaPipelineId | triagem \| entrevista \| teste \| proposta \| contratado | `src/components/recrutamento/pipelineEtapas.ts` |
| TomStatusCard | success \| info \| warning \| chart-4 \| chart-5 | `src/components/recrutamento/pipelineEtapas.ts` |
| FiltroStatusVaga | todas \| aberta \| fechada | `src/components/recrutamento/vagasComum.ts` |
| OrdenacaoVaga | recentes \| antigas \| candidatos \| titulo | `src/components/recrutamento/vagasComum.ts` |
| ReportScheduleFrequency | diario \| semanal \| mensal | `src/components/relatorios/reportScheduleContract.ts` |
| REPORT_SCHEDULE_TYPES | 'lista_colaboradores', 'folha_resumo', 'ferias_proximas', 'afastamentos_ativos', 'indicadores_dp', | `src/components/relatorios/reportScheduleContract.ts` |
| SituacaoCertificado | todos \| valido \| a_vencer \| vencido \| vitalicio | `src/components/treinamentos/certificadosDerivacoes.ts` |
| SituacaoRealCertificado | valido \| a_vencer \| vencido \| vitalicio \| sem_validade | `src/components/treinamentos/certificadosDerivacoes.ts` |
| OrdenacaoCertificado | recentes \| antigos \| validade \| curso \| colaborador | `src/components/treinamentos/certificadosDerivacoes.ts` |
| TomInscricao | sucesso \| andamento \| inscrito \| alerta \| perigo \| neutro | `src/components/treinamentos/inscricoesDerivacoes.ts` |
| INSCRICOES_OPCOES_POR_PAGINA | 10, 25, 50 | `src/components/treinamentos/inscricoesDerivacoes.ts` |
| TomStatusTreinamento | success \| info \| warning \| teal \| neutral \| danger | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| PeriodoTreinamento | todos \| mes \| 30d \| 90d \| ano | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| OrdenacaoCatalogo | nome \| recentes \| carga \| obrigatorios | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| ObrigatoriedadeFiltro | todas \| obrigatorio \| opcional | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| TREINAMENTOS_OPCOES_POR_PAGINA | 5, 10, 20, 50 | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| CATALOGO_OPCOES_POR_PAGINA | 6, 12, 24, 48 | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| StatusTrilha | ativa \| inativa \| indefinido | `src/components/treinamentos/trilhasDerivacoes.ts` |
| TRILHAS_OPCOES_POR_PAGINA | 6, 9, 12, 24 | `src/components/treinamentos/trilhasDerivacoes.ts` |
| NIVEIS_TRILHA | { value: 'basico', label: 'Básico' }, { value: 'intermediario', label: 'Intermediário' }, { value: 'avancado', label: 'Avançado' }, | `src/components/treinamentos/trilhasDerivacoes.ts` |
| OPCOES_STATUS_TRILHA | { value: 'ativa', label: 'Ativa' }, { value: 'inativa', label: 'Inativa' }, | `src/components/treinamentos/trilhasDerivacoes.ts` |
| GrupoTurma | proximas \| andamento \| concluidas | `src/components/treinamentos/turmasDerivacoes.ts` |
| PeriodoTurma | todas \| proximas30 \| proximas90 \| mes \| ano | `src/components/treinamentos/turmasDerivacoes.ts` |
| OrdenacaoTurma | data_asc \| data_desc \| curso \| capacidade | `src/components/treinamentos/turmasDerivacoes.ts` |
| VarianteFilterChip | padrao \| compacto | `src/components/ui/filter-chip.tsx` |
| WfNodeType | start \| end \| aprovador \| gateway_xor \| gateway_and \| email \| delay \| webhook | `src/components/workflows/WorkflowDesigner.tsx` |
| RegimeTributario | simples_nacional \| lucro_presumido \| lucro_real \| mei | `src/constants/regimes.ts` |
| TipoRubrica | provento \| desconto \| informativa | `src/constants/rubricas.ts` |
| FERIAS_STATUS | 'solicitada', 'em_analise', 'aprovada', 'rejeitada', 'cancelada', 'agendada', 'em_gozo', 'concluida', 'pendente_aprovacao', 'vencida', | `src/constants/workflow-status.ts` |
| CICLO_AVALIACAO_STATUS | 'rascunho', 'ativo', 'em_andamento', 'concluido', 'cancelado', 'arquivado', | `src/constants/workflow-status.ts` |
| CICLO_AVALIACAO_TIPO | 'desempenho', '360', 'competencias', 'okr', 'pdi', 'experiencia', 'anual', 'semestral', 'trimestral', | `src/constants/workflow-status.ts` |
| DESLIGAMENTO_STATUS | 'rascunho', 'em_andamento', 'aprovado', 'rejeitado', 'concluido', 'cancelado', 'homologado', | `src/constants/workflow-status.ts` |
| DESLIGAMENTO_ETAPA | 'iniciado', 'comunicacao', 'documentacao', 'calculo_rescisao', 'pagamento', 'homologacao', 'esocial', 'devolucao_equipamentos', 'revogacao_acessos', 'concluido', | `src/constants/workflow-status.ts` |
| FALTA_STATUS | 'pendente', 'justificada', 'abonada', 'injustificada', 'em_analise', 'rejeitada', | `src/constants/workflow-status.ts` |
| FALTA_TIPO | 'atestado_medico', 'falta_injustificada', 'falta_justificada', 'licenca', 'ausencia_parcial', 'atraso', 'saida_antecipada', 'luto', 'casamento', 'doacao_sangue', 'servico_militar', 'doenca_familiar', 'maternidade', 'paternidade', 'outros', | `src/constants/workflow-status.ts` |
| FOLHA_TIPO | 'mensal', '13_primeira', '13_segunda', 'ferias', 'rescisao', 'adiantamento', 'complementar', 'pro_labore', | `src/constants/workflow-status.ts` |
| NOTIFICACAO_TIPO | 'info', 'sucesso', 'aviso', 'erro', 'sistema', 'ponto', 'ferias', 'folha', 'beneficio', 'documento', 'avaliacao', 'treinamento', 'admissao', 'desligamento', | `src/constants/workflow-status.ts` |
| PDI_STATUS | 'rascunho', 'ativo', 'em_andamento', 'pausado', 'concluido', 'cancelado', 'vencido', | `src/constants/workflow-status.ts` |
| PESQUISA_STATUS | 'rascunho', 'ativa', 'encerrada', 'arquivada', 'cancelada', | `src/constants/workflow-status.ts` |
| PESQUISA_TIPO | 'clima', 'engajamento', 'enps', 'pulse', 'saida', 'onboarding', '360', 'ad_hoc', | `src/constants/workflow-status.ts` |
| AJUSTE_PONTO_STATUS | 'pendente', 'em_analise', 'aprovada', 'rejeitada', 'cancelada', 'estornada', | `src/constants/workflow-status.ts` |
| VAGA_STATUS | 'rascunho', 'aberta', 'pausada', 'encerrada', 'preenchida', 'cancelada', 'arquivada', | `src/constants/workflow-status.ts` |
| AppRole | admin \| gestor \| rh \| user \| supervisor \| coordenador | `src/contexts/AuthContext.tsx` |
| ErrorType | VALIDATION_ERROR \| AUTH_ERROR \| NETWORK_ERROR \| NOT_FOUND \| PERMISSION_DENIED \| SERVER_ERROR \| UNKNOWN_ERROR | `src/errors/types.ts` |
| ErrorSeverity | info \| warning \| error \| critical | `src/errors/types.ts` |
| SeveridadeContrato | vencido \| critico \| atencao \| ok | `src/hooks/useContratosVencendo.ts` |
| EmpresaModo | consolidado \| empresa_unica | `src/hooks/useEmpresas.ts` |
| AuditoriaEvento | CALCULO \| CONFERENCIA \| ESOCIAL \| AJUSTE | `src/hooks/useFolhaAuditoria.ts` |
| AuditoriaSeveridade | INFO \| AVISO \| ERRO \| CRITICO | `src/hooks/useFolhaAuditoria.ts` |
| CHAVE_JORNADAS | 'onboarding-list' | `src/hooks/useJornadaOnboarding.ts` |
| CHAVE_KITS | 'onboarding-kits' | `src/hooks/useJornadaOnboarding.ts` |
| PendenciaChave | ponto \| onboarding \| aso \| documentos | `src/hooks/usePendenciasColaborador.ts` |
| ProximoEventoBadgeTone | info \| success \| warning | `src/hooks/useProximosEventos.ts` |
| Locale | pt-BR \| en-US \| es-ES | `src/hooks/useTranslation.ts` |
| SeveridadePagamento | ok \| atencao \| critico \| violacao_grave | `src/hooks/ferias/useAlertasPagamentoD2.ts` |
| ProgramacaoStatus | rascunho \| sugerido_gestor \| aprovado_gestor \| aprovado_rh \| convertido \| rejeitado \| cancelado | `src/hooks/ferias/useProgramacaoFerias.ts` |
| SituacaoReconciliacao | ok \| divergente \| pendente_envio | `src/hooks/ferias/useReconciliacaoFolha.ts` |
| Locale | pt-BR \| en-US \| es-ES | `src/i18n/index.ts` |
| TONS_AVATAR | 'bg-primary/20 text-primary', 'bg-info/20 text-info', 'bg-success/20 text-success', 'bg-xp/20 text-xp', 'bg-warning/20 text-warning', | `src/lib/avatarTons.ts` |
| CircuitState | CLOSED \| OPEN \| HALF_OPEN | `src/lib/circuitBreaker.ts` |
| MotionReducedMode | user \| never | `src/lib/motionMode.ts` |
| ThreadStatus | aberto \| respondido \| resolvido \| arquivado | `src/services/canalContabilidadeService.ts` |
| ThreadCategoria | folha \| esocial \| admissao \| rescisao \| tributos \| ferias \| outro | `src/services/canalContabilidadeService.ts` |
| ThreadPrioridade | baixa \| normal \| alta \| urgente | `src/services/canalContabilidadeService.ts` |
| AutorTipo | rh \| contabilidade \| sistema | `src/services/canalContabilidadeService.ts` |
| TipoContrato | clt_indeterminado \| clt_experiencia \| clt_determinado \| estagio \| pj \| temporario \| intermitente \| jovem_aprendiz | `src/services/contratoTemplateService.ts` |
| DespesaStatus | rascunho \| pendente \| aprovado \| rejeitado \| integrado_folha \| pago \| cancelado | `src/services/despesaService.ts` |
| DespesaTipo | reembolso \| adiantamento \| despesa_viagem \| material \| alimentacao \| transporte \| outro | `src/services/despesaService.ts` |
| LogLevel | info \| warn \| error \| fatal | `src/services/loggerService.ts` |
| PiiAcao | select \| export \| print \| download | `src/services/piiAccessLogService.ts` |
| TRAINING_IMAGES_MIME_TYPES | 'image/webp', 'image/png', 'image/jpeg' | `src/services/trainingImages/config.ts` |
| TrainingContentType | course \| learning_path \| training_session \| certificate | `src/services/trainingImages/types.ts` |
| TrainingCoverFormat | quadrada \| faixa \| miniatura | `src/services/trainingImages/types.ts` |
| TrainingImageStatus | pending \| processing \| succeeded \| failed \| disabled | `src/services/trainingImages/types.ts` |
| PcsAderencia | abaixo_mercado \| alinhado \| acima_mercado \| sem_referencia | `src/types/pcs.ts` |
| PcsSituacao | abaixo_faixa \| dentro_faixa \| acima_faixa | `src/types/pcs.ts` |
| PCS_STATUS | 'rascunho', 'em_avaliacao', 'ativo', 'arquivado' | `src/types/pcs.ts` |
| TimelineEventType | vinculo \| salario \| contrato \| cargo \| promocao \| transferencia \| ferias \| afastamento \| treinamento \| avaliacao \| onboarding \| medida_disciplinar \| desligamento \| auditoria | `src/types/timelineEvent.ts` |
| DocFileKind | pdf \| image \| word \| excel \| archive \| unknown | `src/utils/documentFileType.ts` |
| SignedFileType | application/pdf \| image/jpeg \| image/png \| application/x-pkcs12 | `src/utils/fileSignature.ts` |
| TEMPLATE_HEADERS | 'Nome Completo', 'CPF', 'Email', 'Telefone', 'Cargo', 'Departamento', 'Salário', 'Data Admissão', 'Data Nascimento', 'PIS', 'RG', | `src/utils/importacao/columnMap.ts` |
| TEMPLATE_SAMPLE_ROW | 'João Silva', '123.456.789-00', 'joao@email.com', '(11)99999-9999', 'Analista', 'TI', '5000', '01/03/2024', '15/06/1990', '123.45678.90-1', '12.345.678-9', | `src/utils/importacao/columnMap.ts` |
| IdempotencyReason | NEW \| REPLAY \| KEY_INVALID \| KEY_REUSE \| IN_PROGRESS \| INDETERMINATE \| PREVIOUS_FAILURE \| STORE_ERROR | `supabase/functions/_shared/idempotency.ts` |
| LogLevel | debug \| info \| warn \| error \| fatal | `supabase/functions/_shared/logger.ts` |
| StatusCapa | pending \| processing \| succeeded \| failed \| disabled | `supabase/functions/_shared/trainingImages/estadoCapa.ts` |
| MimeImagem | image/webp \| image/png \| image/jpeg | `supabase/functions/_shared/trainingImages/imageValidation.ts` |
| FalhaSimulada | timeout \| rate_limit \| http_permanente \| imagem_invalida \| sem_imagem | `supabase/functions/_shared/trainingImages/simulatedProvider.ts` |
| TrainingContentType | course \| learning_path \| training_session \| certificate | `supabase/functions/_shared/trainingImages/types.ts` |
| AlertEmailDeliveryStatus | accepted \| not_configured \| no_recipients \| rejected \| not_needed | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| BACKUP_AUDIT_READ_ACTIONS | 'BACKUP_CREATED', 'BACKUP_RUN' | `supabase/functions/backup-automatico/backupAudit.ts` |
| BackupSnapshotErrorCode | BACKUP_TABLE_QUERY_FAILED \| BACKUP_INCOMPLETE | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| ReportDeliveryStatus | sucesso \| erro \| indisponivel | `supabase/functions/enviar-relatorio/deliveryStatus.ts` |
| PAYROLL_AUDIT_READ_ACTIONS | 'PAYROLL_CALC', 'PAYROLL_CLOSE', 'PAYROLL_REOPEN', // Read-only compatibility for rows created before the physical CHECK was // aligned with the Edge Function writers. 'CLOSE', 'REOPEN', | `supabase/functions/folha-metrics/auditActions.ts` |

## F. Validações de entrada

### F.1 Schemas Zod

- **schema** (`src/components/afastamentos/AfastamentoForm.tsx`, z.object):
  ```ts
  { colaborador_id: z.string().min(1, 'Colaborador é obrigatório'), tipo: z.string().min(1, 'Tipo é obrigatório'), data_inicio: z.string().min(1, 'Data de início é obrigatória'), data_fim_prevista: z.string().min(1, 'Data de fim é obrigatória'), cid_id: z.string().optional(), nome_medico: z.string().optional(), crm_medico: z.string().optional(), observacoes: z.string().optional(), status: z.string().default('ativo'), data_pericia: z.string().optional().nullable(), local_pericia: z.string().optional().nullable(), numero_beneficio: z.string().optional().nullable(), }
  ```
- **catSchema** (`src/pages/AdminCatPage.tsx`, z.object):
  ```ts
  { colaborador_id: z.string().uuid('Colaborador obrigatório'), data_acidente: z.string().min(1, 'Data obrigatória'), hora_acidente: z.string().optional(), tipo_acidente: z.enum(['tipico', 'trajeto', 'doenca_ocupacional'], { error: 'Tipo de acidente obrigatório' }), tipo_cat: z.enum(['inicial', 'reabertura', 'comunicacao_obito']), cid_principal: z.string().min(3, 'CID obrigatório').max(10), parte_corpo_atingida: z.string().optional(), agente_causador: z.string().optional(), local_acidente: z.string().optional(), tipo_local: z.enum(['estabelecimento_empregador', 'via_publica', 'area_rural', 'outros']).optional(), situacao_geradora: z.string().optional(), minutos_trabalhados_antes: numeroOpcional, houve_afastamento: z.boolean().default(false), dias_afastamento_estimado: numeroOpcional, houve_o …
  ```
- **extintorSchema** (`src/pages/AdminExtintoresPage.tsx`, z.object):
  ```ts
  { codigo_patrimonio: z.string().trim().min(1).max(50), tipo: z.enum(['AGUA', 'PO_QUIMICO_ABC', 'PO_QUIMICO_BC', 'CO2', 'ESPUMA', 'CLASSE_K']), capacidade_kg: z.number().positive().max(999), localizacao: z.string().trim().min(1).max(255), data_proxima_recarga: z.string().min(1), data_proximo_teste_hidrostatico: z.string().min(1), }
  ```
- **schema** (`src/pages/ColaboradorFormPage.tsx`, z.object):
  ```ts
  { // Geral nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'), nome_social: z.string().optional(), cpf: z.string().length(11, 'CPF inválido'), email: z.string().email('Email inválido').optional().or(z.literal('')), telefone: z.string().optional(), celular: z.string().optional(), data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'), sexo: z.enum(['masculino', 'feminino']).default('masculino'), estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'separado', 'uniao_estavel']).default('solteiro'), nome_mae: z.string().min(1, 'Nome da mãe obrigatório'), nome_pai: z.string().optional(), // Endereço cep: z.string().optional(), logradouro: z.string().optional(), numero: z.string().optional(), complemento: z.string().optional(), bairro: z.string( …
  ```
- **admissaoSchema** (`src/schemas/admissao.ts`, z.object):
  ```ts
  { nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'), cpf: z.string().nullish(), email: z.string().email('Email inválido').nullish().or(z.literal('')), telefone: z.string().nullish(), cargo: z.string().min(1, 'Cargo obrigatório'), departamento: z.string().min(1, 'Departamento obrigatório'), data_prevista: z.string().min(1, 'Data prevista obrigatória'), salario_proposto: z.number().min(0, 'Salário deve ser positivo'), empresa_id: uuidPg().optional(), observacoes: z.string().nullish(), }
  ```
- **afastamentoSchema** (`src/schemas/afastamento.ts`, z.object):
  ```ts
  { colaborador_id: uuidPg('Colaborador obrigatório'), tipo: z.string().min(1, 'Tipo de afastamento obrigatório'), data_inicio: z.string().min(1, 'Data de início obrigatória'), data_fim_prevista: z.string().min(1, 'Data de fim prevista obrigatória'), cid_id: uuidPg('CID inválido').optional(), cid_descricao: z.string().optional(), medico_nome: z.string().optional(), nome_medico: z.string().optional(), medico_crm: z.string().optional(), crm_medico: z.string().optional(), observacoes: z.string().optional(), empresa_id: uuidPg().optional(), }
  ```
- **beneficioSchema** (`src/schemas/beneficio.ts`, z.object):
  ```ts
  { nome: z.string().min(2, 'Nome do benefício obrigatório'), tipo: z.string().optional(), valor: z.number().min(0).optional(), descricao: z.string().optional(), ativo: z.boolean().default(true), empresa_id: uuidPg().optional(), }
  ```
- **cargoSchema** (`src/schemas/cargo.ts`, z.object):
  ```ts
  { nome: z.string().min(2, 'Nome do cargo obrigatório'), cbo: z.string().optional(), departamento_id: uuidPg().optional(), salario_base: z.number().min(0).optional(), ativo: z.boolean().default(true), empresa_id: uuidPg().optional(), }
  ```
- **colaboradorSchema** (`src/schemas/colaborador.ts`, z.object):
  ```ts
  { nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'), cpf: z.string().min(11, 'CPF inválido'), data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'), sexo: z.enum(['masculino', 'feminino']), estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'separado', 'uniao_estavel']), nome_mae: z.string().min(3, 'Nome da mãe obrigatório'), nome_pai: z.string().optional(), rg: z.string().optional(), pis_pasep: z.string().optional(), email: z.string().email('Email inválido').optional().or(z.literal('')), telefone: z.string().optional(), celular: z.string().optional(), cep: z.string().optional(), logradouro: z.string().optional(), numero: z.string().optional(), complemento: z.string().optional(), bairro: z.string().optional(), cidade: z.string().optiona …
  ```
- **dataISO** (`src/schemas/colaboradorDetalhes.ts`, z.string):
  ```ts
  
  ```
- **dependenteSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, nome: z.string().min(1).max(200), cpf: z .string() .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos') .nullable() .optional(), data_nascimento: dataISO.nullable().optional(), data_inicio_vigencia: dataISO.nullable().optional(), grau_parentesco: z.string().max(50).nullable().optional(), parentesco: z.string().max(50), relacionamento_id: z.number().int().nullable().optional(), genero_documento_id: z.number().int().nullable().optional(), }
  ```
- **contatoEmergenciaSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, nome: z.string().min(1).max(200), parentesco: z.string().max(50).nullable().optional(), relacionamento_id: z.number().int().nullable().optional(), telefone: z.string().max(20).nullable().optional(), telefone_trabalho: z.string().max(20).nullable().optional(), celular: z.string().max(20).nullable().optional(), email: z.string().email('E-mail inválido').max(320).nullable().optional(), }
  ```
- **historicoSalarialSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, empresa_id: uuid.nullable().optional(), data_vigencia: dataISO, motivo: z.string().min(1).max(300), salario_anterior: z.number().min(0).nullable().optional(), salario_novo: z.number().positive('Salário deve ser positivo'), cargo_anterior: z.string().max(150).nullable().optional(), cargo_novo: z.string().max(150).nullable().optional(), departamento_anterior: z.string().max(150).nullable().optional(), departamento_novo: z.string().max(150).nullable().optional(), }
  ```
- **asoSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, empresa_id: uuid.nullable().optional(), tipo: z.string().min(1).max(50), data_exame: dataISO, data_validade: dataISO.nullable().optional(), resultado: z.string().max(100).nullable().optional(), status: z.string().max(50).optional(), clinica: z.string().max(200).nullable().optional(), medico_nome: z.string().max(200).nullable().optional(), medico_crm: z.string().max(20).nullable().optional(), }
  ```
- **formacaoSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, curso: z.string().max(200).nullable().optional(), instituicao: z.string().max(200).nullable().optional(), situacao: z.string().max(50).nullable().optional(), tipo_escolaridade: z.string().max(50).nullable().optional(), ano_conclusao: z.number().int().min(1900).max(2100).nullable().optional(), }
  ```
- **dadosEstrangeiroSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, pais_origem: z.string().max(100).nullable().optional(), tipo_visto: z.string().max(50).nullable().optional(), tempo_residencia: z.string().max(50).nullable().optional(), condicao_ingresso: z.string().max(100).nullable().optional(), data_chegada: dataISO.nullable().optional(), data_naturalizacao: dataISO.nullable().optional(), }
  ```
- **deficienciaSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, tipo: z.string().min(1).max(100), cid: z.string().max(10).nullable().optional(), laudo_url: z.string().url('URL de laudo inválida').nullable().optional(), descricao: z.string().max(1000).nullable().optional(), observacoes: z.string().max(1000).nullable().optional(), }
  ```
- **periodoExperienciaSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, data_inicio: dataISO, primeira_etapa_fim: dataISO.nullable().optional(), segunda_etapa_fim: dataISO.nullable().optional(), dias_total: z.number().int().min(1).max(365).nullable().optional(), tipo: z.string().max(50).nullable().optional(), status: z.string().max(50).nullable().optional(), }
  ```
- **anotacaoSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { colaborador_id: uuid, titulo: z.string().min(1).max(300), conteudo: z.string().max(5000).nullable().optional(), data: dataISO.nullable().optional(), tipo: z.string().max(50).nullable().optional(), }
  ```
- **timeSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { empresa_id: uuid, nome: z.string().min(1).max(200), descricao: z.string().max(1000).nullable().optional(), departamento_id: uuid.nullable().optional(), lider_id: uuid.nullable().optional(), }
  ```
- **webhookConfigSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), url: z .string() .url('URL de webhook inválida') .max(2048) .refine((u) => u.startsWith('https://'), 'Webhook exige HTTPS (SSRF/javascript: bloqueados)'), eventos: z.array(z.string().max(100)).max(50).optional(), secret: z.string().max(200).nullable().optional(), }
  ```
  - Regras cruzadas (refine): “Webhook exige HTTPS (SSRF/javascript: bloqueados)”
- **feriasColetivaSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { empresa_id: uuid, data_inicio: dataISO, data_fim: dataISO, dias: z.number().int().min(1).max(30, 'Férias coletivas máx. 30 dias por período'), justificativa: z.string().max(1000).nullable().optional(), departamentos: z.array(z.string().max(150)).max(100).nullable().optional(), status: z.string().max(50).nullable().optional(), }
  ```
- **campoCustomizadoSchema** (`src/schemas/colaboradorDetalhes.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), nome: z.string().min(1).max(200), tipo: z.string().max(50).optional(), secao: z.string().max(100).nullable().optional(), ordem: z.number().int().min(0).nullable().optional(), }
  ```
- **metricasSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { empresaId: uuidPg('ID da empresa deve ser um UUID válido'), }
  ```
- **webhookSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { event_id: z.string().min(1, 'event_id é obrigatório para idempotência').max(128), event: z.string().min(1, 'Evento é obrigatório').max(128), data: z.record(z.string(), z.unknown()), timestamp: z.string().datetime().optional(), version: z.string().optional().default('v1'), }
  ```
- **healthcheckSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  {}
  ```
- **cepSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter 8 dígitos (pode conter hífen)'), }
  ```
- **cnpjSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido'), }
  ```
- **holeriteSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { colaboradorId: uuidPg('ID do colaborador deve ser um UUID válido'), competencia: z .string() .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Competência deve estar no formato AAAA-MM') .refine((value) => value.startsWith('2025-') || value.startsWith('2026-'), { message: 'Tabela INSS homologada somente para competências de 2025 e 2026', }), }
  ```
  - Regras cruzadas (refine): “Tabela INSS homologada somente para competências de 2025 e 2026”
- **calcularFolhaSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { empresa_id: uuidPg('ID da empresa inválido'), competencia: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Formato de competência inválido (AAAA-MM)'), }
  ```
- **notificacaoSchema** (`src/schemas/common.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z .object({ action: z.literal('enviar'), empresaId: uuidPg(), tipo: z.enum(['info', 'aviso', 'erro', 'sucesso']).default('info'), destinatarios: z .array(z.object({ user_id: uuidPg() }).strict()) .min(1) .max(500), assunto: z.string().trim().min(1).max(200), conteudo: z.string().trim().min(1).max(5000), }) .strict(), z .object({ action: z.literal('listar'), empresaId: uuidPg().optional(), }) .strict(), ]
  ```
- **auditoriaSchema** (`src/schemas/common.ts`, z.object):
  ```ts
  { action: z.enum(['registrar', 'listar', 'resumo']), empresaId: uuidPg().optional(), data: z .object({ acao: z.string(), entidade: z.string(), entidade_id: z.string().optional(), usuario_id: z.string().optional(), usuario_nome: z.string().optional(), descricao: z.string().optional(), dados_anteriores: z.unknown().optional(), dados_novos: z.unknown().optional(), ip_address: z.union([z.ipv4(), z.ipv6()]).optional(), data_inicio: z.string().datetime().optional(), data_fim: z.string().datetime().optional(), }) .optional(), }
  ```
- **dataISO** (`src/schemas/cursos.ts`, z.string):
  ```ts
  
  ```
- **cursoSchema** (`src/schemas/cursos.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), nome: z.string().min(1).max(300), descricao: z.string().max(5000).nullable().optional(), categoria: z.string().max(100).nullable().optional(), modalidade: z.string().max(50).nullable().optional(), carga_horaria: z.number().min(0).max(2000).nullable().optional(), nr_relacionada: z.string().max(50).nullable().optional(), obrigatorio: z.boolean().nullable().optional(), ativo: z.boolean().nullable().optional(), }
  ```
- **trilhaSchema** (`src/schemas/cursos.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), nome: z.string().min(1).max(300), descricao: z.string().max(5000).nullable().optional(), nivel: z.string().max(50).nullable().optional(), ativo: z.boolean().nullable().optional(), }
  ```
- **inscricaoCursoSchema** (`src/schemas/cursos.ts`, z.object):
  ```ts
  { colaborador_id: uuid, curso_id: uuid, empresa_id: uuid.nullable().optional(), status: z.string().max(50).nullable().optional(), data_inicio: dataISO.nullable().optional(), data_conclusao: dataISO.nullable().optional(), nota: z.number().min(0).max(10).nullable().optional(), certificado_url: z.string().max(2048).nullable().optional(), }
  ```
- **trilhaCursoSchema** (`src/schemas/cursos.ts`, z.object):
  ```ts
  { trilha_id: uuid, curso_id: uuid, ordem: z.number().int().min(0).nullable().optional(), obrigatorio: z.boolean().nullable().optional(), }
  ```
- **departamentoSchema** (`src/schemas/departamento.ts`, z.object):
  ```ts
  { nome: z.string().min(2, 'Nome do departamento obrigatório'), // departamentos não tem coluna descricao — era campo fantasma no schema. responsavel_id: uuidPg().optional(), gestor_id: uuidPg().optional(), departamento_pai_id: uuidPg().optional(), codigo_centro_custo: z.string().optional(), empresa_id: uuidPg().optional(), ativo: z.boolean().default(true), }
  ```
- **documentoSchema** (`src/schemas/documento.ts`, z.object):
  ```ts
  { nome: z.string().min(1, 'Nome do documento obrigatório'), tipo: z.string().min(1, 'Tipo do documento obrigatório'), colaborador_id: uuidPg().optional(), url: z.string().optional(), observacoes: z.string().optional(), }
  ```
- **empresaSchema** (`src/schemas/empresa.ts`, z.object):
  ```ts
  { razao_social: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres'), nome_fantasia: z.string().optional(), cnpj: z.string().min(14, 'CNPJ inválido'), inscricao_estadual: z.string().optional(), email: z.string().email('Email inválido').optional().or(z.literal('')), telefone: z.string().optional(), cep: z.string().optional(), logradouro: z.string().optional(), numero: z.string().optional(), bairro: z.string().optional(), cidade: z.string().optional(), uf: z.string().max(2).optional(), ativa: z.boolean().default(true), }
  ```
- **feriasSchemaBase** (`src/schemas/ferias.ts`, z.object):
  ```ts
  { colaborador_id: uuidPg('Colaborador obrigatório'), periodo_aquisitivo_id: uuidPg('Período aquisitivo obrigatório').optional(), data_inicio: z.string().min(1, 'Data de início obrigatória'), data_fim: z.string().min(1, 'Data de fim obrigatória'), dias_gozo: z.number().min(5, 'Mínimo de 5 dias por período (Art. 134 §1º CLT)').max(30, 'Máximo de 30 dias'), dias_abono: z.number().min(0).max(10, 'Abono pecuniário máximo: 10 dias (Art. 143 CLT)').default(0), observacoes: z.string().optional(), empresa_id: uuidPg().optional(), }
  ```
- **folhaSchema** (`src/schemas/folha.ts`, z.object):
  ```ts
  { competencia: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Competência deve estar no formato AAAA-MM'), empresa_id: uuidPg().optional(), status: z.enum(['aberta', 'calculada', 'fechada', 'paga']).default('aberta'), }
  ```
- **dataISO** (`src/schemas/recrutamento.ts`, z.string):
  ```ts
  
  ```
- **vagaSchema** (`src/schemas/recrutamento.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), titulo: z.string().min(1).max(200), cargo: z.string().max(200).nullable().optional(), departamento: z.string().max(200).nullable().optional(), descricao: z.string().max(10000).nullable().optional(), requisitos: z.string().max(10000).nullable().optional(), beneficios_oferecidos: z.string().max(5000).nullable().optional(), modalidade: z.string().max(50).nullable().optional(), tipo_contrato: z.enum(['clt', 'pj', 'estagiario', 'temporario', 'intermitente', 'aprendiz']).nullable().optional(), quantidade: z.number().int().min(1).nullable().optional(), faixa_salarial_min: z.number().min(0).nullable().optional(), faixa_salarial_max: z.number().min(0).nullable().optional(), responsavel_id: uuid.nullable().optional(), data_abertura: dataISO.nullable().option …
  ```
- **candidatoSchema** (`src/schemas/recrutamento.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), nome: z.string().min(1).max(200), email: z.string().email('E-mail inválido').max(320).nullable().optional(), telefone: z.string().max(20).nullable().optional(), cpf: z .string() .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos') .nullable() .optional(), linkedin: z.string().max(300).nullable().optional(), curriculo_url: z.string().max(2048).nullable().optional(), formacao: z.string().max(200).nullable().optional(), experiencia_anos: z.number().int().min(0).max(70).nullable().optional(), pretensao_salarial: z.number().min(0).nullable().optional(), origem: z.string().max(100).nullable().optional(), observacoes: z.string().max(5000).nullable().optional(), }
  ```
- **candidaturaSchema** (`src/schemas/recrutamento.ts`, z.object):
  ```ts
  { candidato_id: uuid, vaga_id: uuid, empresa_id: uuid, etapa: z.string().max(50).nullable().optional(), status: z.string().max(50).nullable().optional(), nota_geral: z.number().min(0).max(10).nullable().optional(), entrevistador: z.string().max(200).nullable().optional(), data_entrevista: z.string().nullable().optional(), data_proxima_etapa: dataISO.nullable().optional(), motivo_rejeicao: z.string().max(1000).nullable().optional(), feedback: z.string().max(5000).nullable().optional(), }
  ```
- **dataISO** (`src/schemas/referencias.ts`, z.string):
  ```ts
  
  ```
- **centroCustoSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), codigo: z.string().max(50).nullable().optional(), nome: z.string().min(1).max(200), descricao: z.string().max(1000).nullable().optional(), ativo: z.boolean().nullable().optional(), }
  ```
- **contaBancariaSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { colaborador_id: uuid, empresa_id: uuid.nullable().optional(), banco_codigo: z.string().max(10).nullable().optional(), banco_nome: z.string().max(100).nullable().optional(), agencia: z.string().max(10).nullable().optional(), agencia_digito: z.string().max(2).nullable().optional(), conta: z.string().max(20).nullable().optional(), digito: z.string().max(2).nullable().optional(), modalidade: z.string().max(50).nullable().optional(), tipo_conta: z.enum(['corrente', 'poupanca', 'salario']).nullable().optional(), pix_tipo: z.string().max(20).nullable().optional(), pix_chave: z.string().max(200).nullable().optional(), }
  ```
- **dadosEstagiarioSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { colaborador_id: uuid, empresa_id: uuid.nullable().optional(), curso: z.string().max(200).nullable().optional(), nivel: z.string().max(50).nullable().optional(), categoria_estagio: z.string().max(50).nullable().optional(), area_atuacao: z.string().max(200).nullable().optional(), carga_horaria_semanal: z.number().min(0).max(44).nullable().optional(), data_inicio: dataISO.nullable().optional(), data_fim: dataISO.nullable().optional(), instituicao_nome: z.string().max(300).nullable().optional(), instituicao_cnpj: z.string().max(18).nullable().optional(), instituicao_cep: z.string().max(9).nullable().optional(), instituicao_cidade: z.string().max(100).nullable().optional(), instituicao_uf: z.string().max(2).nullable().optional(), }
  ```
- **documentoPessoalSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { colaborador_id: uuid, tipo_documento: z.string().min(1).max(50), numero: z.string().max(50).nullable().optional(), orgao_emissor: z.string().max(100).nullable().optional(), data_emissao: dataISO.nullable().optional(), data_validade: dataISO.nullable().optional(), arquivo_nome: z.string().max(300).nullable().optional(), arquivo_tamanho: z .number() .int() .min(0) .max(50 * 1024 * 1024) .nullable() .optional(), arquivo_url: z.string().max(2048).nullable().optional(), }
  ```
- **feriasAprovacaoSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { ferias_id: uuid, aprovador_id: uuid.nullable().optional(), tipo: z.string().min(1).max(50), status: z.string().max(50).nullable().optional(), observacoes: z.string().max(2000).nullable().optional(), }
  ```
- **configAfastamentoSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { tipo: z.enum([ 'doenca', 'acidente_trabalho', 'acidente_trajeto', 'licenca_maternidade', 'licenca_paternidade', 'licenca_casamento', 'licenca_obito', 'licenca_nao_remunerada', 'servico_militar', 'mandato_sindical', 'suspensao_disciplinar', 'outros', ]), descricao: z.string().max(500).nullable().optional(), dias_minimos: z.number().int().min(0).nullable().optional(), dias_maximos: z.number().int().min(1).nullable().optional(), dias_empresa_maximo: z.number().int().min(0).max(15, 'CLT: até 15 dias pagos pela empresa').nullable().optional(), exige_cid: z.boolean().nullable().optional(), pago_empresa: z.boolean().nullable().optional(), pago_inss: z.boolean().nullable().optional(), }
  ```
- **feriasSolicitacaoSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { colaborador_id: uuid.nullable().optional(), empresa_id: uuid.nullable().optional(), data_inicio: dataISO, data_fim: dataISO, dias: z.number().int().min(1).max(30).nullable().optional(), abono_pecuniario: z.boolean().nullable().optional(), status: z.string().max(50).nullable().optional(), observacoes: z.string().max(2000).nullable().optional(), }
  ```
- **linhaTransporteSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { nome: z.string().min(1).max(200), tipo: z.string().max(50).nullable().optional(), valor: z.number().min(0).nullable().optional(), ida_volta: z.boolean().nullable().optional(), vale_transporte_id: uuid.nullable().optional(), }
  ```
- **onboardingTemplateTarefaSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { template_id: uuid, titulo: z.string().min(1).max(300), descricao: z.string().max(2000).nullable().optional(), categoria: z.string().max(100).optional(), responsavel_tipo: z.string().max(50).nullable().optional(), dias_prazo: z.number().int().min(0).nullable().optional(), obrigatoria: z.boolean().nullable().optional(), ordem: z.number().int().min(0).optional(), }
  ```
- **feriasArquivoSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { ferias_id: uuid, nome: z.string().min(1).max(300), arquivo_url: z.string().max(2048).nullable().optional(), assinavel: z.boolean().nullable().optional(), }
  ```
- **onboardingTemplateSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), nome: z.string().min(1).max(300), descricao: z.string().max(2000).nullable().optional(), ativo: z.boolean().nullable().optional(), }
  ```
- **onboardingColaboradorSchema** (`src/schemas/referencias.ts`, z.object):
  ```ts
  { colaborador_id: uuid, empresa_id: uuid.nullable().optional(), template_id: uuid.nullable().optional(), data_inicio: dataISO.optional(), status: z.string().max(50).optional(), progresso: z.number().min(0).max(100).nullable().optional(), }
  ```
- **base** (`src/schemas/validate.ts`, z.object):
  ```ts
  raw
  ```
- **workflowDefinicaoSchema** (`src/schemas/workflowsPremiacoesCnab.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), nome: z.string().min(1).max(200), tipo: z.string().min(1).max(50), descricao: z.string().max(2000).nullable().optional(), ativo: z.boolean().nullable().optional(), }
  ```
- **workflowEtapaSchema** (`src/schemas/workflowsPremiacoesCnab.ts`, z.object):
  ```ts
  { workflow_id: uuid, nome: z.string().min(1).max(200), ordem: z.number().int().min(1), tipo: z.string().max(50).nullable().optional(), aprovador_tipo: z.string().max(50).nullable().optional(), aprovador_id: uuid.nullable().optional(), config: z.record(z.string(), z.unknown()).nullable().optional(), }
  ```
- **premiacaoRegraSchema** (`src/schemas/workflowsPremiacoesCnab.ts`, z.object):
  ```ts
  { campanha_id: uuid, meta_id: uuid.nullable().optional(), titulo: z.string().min(1).max(300), tipo_calculo: z.string().min(1).max(50), valor_base: z.number().min(0).nullable().optional(), }
  ```
- **premiacaoRoiCenarioSchema** (`src/schemas/workflowsPremiacoesCnab.ts`, z.object):
  ```ts
  { nome: z.string().min(1).max(300), user_id: uuid.nullable().optional(), }
  ```
- **cnabConfiguracaoSchema** (`src/schemas/workflowsPremiacoesCnab.ts`, z.object):
  ```ts
  { empresa_id: uuid.nullable().optional(), banco_codigo: z.string().min(1).max(10), codigo_empresa: z.string().max(30).nullable().optional(), agencia: z.string().min(1).max(10), agencia_digito: z.string().max(2).nullable().optional(), conta: z.string().min(1).max(20), conta_digito: z.string().min(1).max(2), convenio: z.string().min(1).max(30), nome_empresa: z.string().max(200).nullable().optional(), }
  ```
- **cenarioRoiInputSchema** (`src/schemas/workflowsPremiacoesCnab.ts`, z.object):
  ```ts
  { name: z.string().min(1).max(300), employees: z.number().int().min(0).optional(), avgSalary: z.number().min(0).optional(), bonusPercent: z.number().min(0).max(100).optional(), performanceLevel: z.number().optional(), retentionImpact: z.number().optional(), }
  ```
- **resolutionNoteSchema** (`src/services/securityService.ts`, z.string):
  ```ts
  
  ```
- **BodySchema** (`supabase/functions/OCR/index.ts`, z.object, encadeia refine):
  ```ts
  { fileUrl: z.string().url().max(2048).optional(), bucket: z.string().min(1).max(100).optional(), filePath: z.string().min(1).max(500).optional(), documentType: z.enum(['cpf', 'rg', 'ctps', 'comprovante_endereco', 'generic']).optional().default('generic'), }
  ```
  - Regras cruzadas (refine): “Forneça fileUrl ou bucket+filePath” · “Bucket não permitido” · “URL de arquivo não permitida”
- **colaboradorSchema** (`supabase/functions/_shared/schemas/colaborador.ts`, z.object):
  ```ts
  { nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'), cpf: z.string().min(11, 'CPF inválido'), data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'), sexo: z.enum(['masculino', 'feminino', 'outro']), estado_civil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel']), nome_mae: z.string().min(3, 'Nome da mãe obrigatório'), nome_pai: z.string().optional(), rg: z.string().optional(), pis_pasep: z.string().optional(), email: z.string().email('Email inválido').optional().or(z.literal('')), telefone: z.string().optional(), celular: z.string().optional(), cep: z.string().optional(), logradouro: z.string().optional(), numero: z.string().optional(), complemento: z.string().optional(), bairro: z.string().optional(), cidade: z.string().optional() …
  ```
- **metricasSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { empresaId: uuidPg('ID da empresa deve ser um UUID válido'), }
  ```
- **webhookSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { event_id: z.string().min(1, 'event_id é obrigatório para idempotência').max(128), event: z.string().min(1, 'Evento é obrigatório').max(128), data: z.record(z.any()), timestamp: z.string().datetime().optional(), version: z.string().optional().default('v1'), }
  ```
- **healthcheckSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  {}
  ```
- **cepSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter 8 dígitos (pode conter hífen)'), }
  ```
- **cnpjSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido'), }
  ```
- **holeriteSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { colaboradorId: uuidPg('ID do colaborador deve ser um UUID válido'), competencia: z.string() .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Competência deve estar no formato AAAA-MM') .refine((value) => value.startsWith('2025-') || value.startsWith('2026-'), { message: 'Tabela INSS homologada somente para competências de 2025 e 2026', }), }
  ```
  - Regras cruzadas (refine): “Tabela INSS homologada somente para competências de 2025 e 2026”
- **calcularFolhaSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { empresa_id: uuidPg('ID da empresa inválido'), competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de competência inválido (AAAA-MM)'), }
  ```
- **notificacaoSchema** (`supabase/functions/_shared/schemas/common.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('enviar'), empresaId: uuidPg(), tipo: z.enum(['info', 'aviso', 'erro', 'sucesso']).default('info'), destinatarios: z.array( z.object({ user_id: uuidPg() }).strict() ).min(1).max(500), assunto: z.string().trim().min(1).max(200), conteudo: z.string().trim().min(1).max(5000), }).strict(), z.object({ action: z.literal('listar'), empresaId: uuidPg().optional(), }).strict(), ]
  ```
- **auditoriaSchema** (`supabase/functions/_shared/schemas/common.ts`, z.object):
  ```ts
  { action: z.enum(['registrar', 'listar', 'resumo']), empresaId: uuidPg().optional(), data: z.object({ acao: z.string(), entidade: z.string(), entidade_id: z.string().optional(), usuario_id: z.string().optional(), usuario_nome: z.string().optional(), descricao: z.string().optional(), dados_anteriores: z.any().optional(), dados_novos: z.any().optional(), ip_address: z.string().ip().optional(), data_inicio: z.string().datetime().optional(), data_fim: z.string().datetime().optional(), }).optional(), }
  ```
- **bodySchema** (`supabase/functions/adiantamento-salarial/index.ts`, z.object):
  ```ts
  { empresa_id: z.string().uuid(), colaborador_id: z.string().uuid(), valor_centavos: z.number().int().positive().max(100_000_000), // R$ 1M cap absoluto competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve ser AAAA-MM'), motivo: z.string().max(500).optional(), }
  ```
- **BodySchema** (`supabase/functions/alertas-preditivos/index.ts`, z.object):
  ```ts
  { empresaId: z.string().uuid(), mode: z.enum(['turnover', 'absenteismo', 'both']).default('both'), }
  ```
- **BodySchema** (`supabase/functions/assinaturaDigital/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('verificar'), tokenId: z.string().uuid() }), z.object({ action: z.literal('assinar'), tokenId: z.string().uuid(), assinaturaBase64: z.string().min(50).max(5_000_000), ipAddress: z.string().max(64).optional(), }), z.object({ action: z.literal('listar') }), ]
  ```
- **DadosSchema** (`supabase/functions/auditoria/index.ts`, z.object, encadeia refine):
  ```ts
  { acao: z.string().min(1).max(64).regex(/^[A-Z0-9_]+$/, 'ACAO deve ser UPPER_SNAKE'), entidade: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'entidade deve ser snake_case'), entidade_id: z.string().min(1).max(64).optional(), descricao: z.string().max(1000).optional(), dados_anteriores: z.unknown().optional(), dados_novos: z.unknown().optional(), }
  ```
  - Regras cruzadas (refine): “Campos JSON excedem ${MAX_JSON_BYTES} bytes”
- **ListarSchema** (`supabase/functions/auditoria/index.ts`, z.object, encadeia optional):
  ```ts
  { entidade: z.string().max(64).regex(/^[a-z0-9_]+$/).optional(), data_inicio: z.string().datetime().optional(), data_fim: z.string().datetime().optional(), limit: z.number().int().min(1).max(500).optional().default(100), }
  ```
- **BodySchema** (`supabase/functions/auditoria/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('registrar'), empresaId: z.string().uuid(), data: DadosSchema }), z.object({ action: z.literal('listar'), empresaId: z.string().uuid(), data: ListarSchema }), z.object({ action: z.literal('resumo'), empresaId: z.string().uuid() }), ]
  ```
- **BodySchema** (`supabase/functions/auth-gov-br/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('get_auth_url'), redirectUri: z.string().url().max(512), }), z.object({ action: z.literal('callback'), code: z.string().min(1).max(2048), state: z.string().uuid(), redirectUri: z.string().url().max(512).optional(), }), ]
  ```
- **BodySchema** (`supabase/functions/auth-login/index.ts`, z.object):
  ```ts
  { email: z.string().email().max(254).toLowerCase(), password: z.string().min(1).max(128), // Cloudflare Turnstile — opcional, ativado quando TURNSTILE_SECRET_KEY // está configurada. Sem a env, o campo é ignorado (comportamento atual). turnstileToken: z.string().max(4096).optional(), }
  ```
- **BodySchema** (`supabase/functions/backup-automatico/index.ts`, z.object):
  ```ts
  { action: z.enum(['run', 'status', 'list']), empresaId: z.string().uuid().optional(), tables: z.array(z.string().min(1).max(64)).max(50).optional(), destino: z.enum(['storage', 'inline']).optional().default('storage'), }
  ```
- **BodySchema** (`supabase/functions/cache/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('get'), key: z.string().min(1).max(256) }), z.object({ action: z.literal('set'), key: z.string().min(1).max(256), ttlSeconds: z.number().int().min(5).max(900).optional(), value: z.any(), }), z.object({ action: z.literal('invalidate'), key: z.string().min(1).max(256) }), z.object({ action: z.literal('query_cached'), table: z.string().min(1).max(64), empresaId: z.string().uuid(), ttlSeconds: z.number().int().min(5).max(900).optional(), query: z.object({ select: z.string().max(256).optional(), limit: z.number().int().min(1).max(1000).optional(), orderBy: z.string().max(64).optional(), ascending: z.boolean().optional(), }).optional(), }), z.object({ action: z.literal('stats') }), // P4-067: invalidar cache de bridge por tabela z.object({ action: z.liter …
  ```
- **BodySchema** (`supabase/functions/calcular-13-salario/index.ts`, z.object):
  ```ts
  { colaborador_id: z.string().uuid(), empresa_id: z.string().uuid(), competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM'), parcela: z.enum(['1', '2', 'integral']), salario_base: z.number().positive().max(1_000_000), media_variaveis: z.number().min(0).max(1_000_000).optional().default(0), data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dias_afastamento_ano: z.number().int().min(0).max(365).optional().default(0), dependentes_irrf: z.number().int().min(0).max(30).optional().default(0), pensao_alimenticia: z.number().min(0).max(1_000_000).optional().default(0), }
  ```
- **BodySchema** (`supabase/functions/calcular-ferias/index.ts`, z.object, encadeia refine):
  ```ts
  { salario_base: z.number().positive().max(1_000_000), dias_ferias: z.number().int().min(1).max(30).default(30), dias_abono: z.number().int().min(0).max(10).default(0), // Art. 143 CLT dependentes_irrf: z.number().int().min(0).max(30).optional().default(0), // Competência 'YYYY-MM' das férias — seleciona a tabela INSS do ano. // Opcional: simulações sem competência usam o mês corrente. competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), colaborador_id: z.string().uuid().optional(), empresa_id: z.string().uuid().optional(), // Quando informado, o resultado é persistido na solicitação de férias // (antes o cálculo ia só para audit_log e a tela guardava nada — §6.2). ferias_id: z.string().uuid().optional(), }
  ```
  - Regras cruzadas (refine): “Soma de férias + abono não pode exceder 30 dias”
- **BodySchema** (`supabase/functions/calcular-provisoes/index.ts`, z.object, encadeia refine):
  ```ts
  { empresa_id: z.string().uuid(), competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM'), }
  ```
  - Regras cruzadas (refine): “Competência fora do intervalo permitido (últimos 60 meses)”
- **BodySchema** (`supabase/functions/calcular-rescisao/index.ts`, z.object, encadeia refine):
  ```ts
  { salario_base: z.number().positive().max(1_000_000), data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), data_desligamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // 'com_justa_causa' aceito por compat retroativa e normalizado para // 'justa_causa'; 'acordo'/'fim_contrato' são os valores do enum // tipo_desligamento do banco, normalizados pelo motor (motor.ts). tipo_rescisao: z.enum(['sem_justa_causa', 'com_justa_causa', 'justa_causa', 'culpa_reciproca', 'pedido_demissao', 'acordo_mutuo', 'acordo', 'termino_contrato', 'fim_contrato', 'falecimento']).default('sem_justa_causa'), aviso_previo: z.enum(['trabalhado', 'indenizado']).default('indenizado'), saldo_fgts: z.number().nonnegative().max(10_000_000).default(0), // A UI envia 0/1 (não um boolean literal) — z.coerce tolera ambos. fe …
  ```
  - Regras cruzadas (refine): “data_fim_contrato é obrigatória para antecipação de contrato a prazo (arts. 479/480)”
- **itemSchema** (`supabase/functions/cnab-remessa/index.ts`, z.object):
  ```ts
  { colaborador_id: z.string().uuid().optional().nullable(), folha_item_id: z.string().uuid().optional().nullable(), nome_favorecido: z.string().min(1).max(140), cpf_cnpj_favorecido: z.string().regex(/^\d{11}(\d{3})?$/, 'CPF/CNPJ apenas dígitos'), banco_favorecido: z.string().max(10).optional().nullable(), agencia_favorecido: z.string().max(10).optional().nullable(), conta_favorecido: z.string().max(20).optional().nullable(), valor_centavos: z.number().int().positive().max(1_000_000_000), data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), tipo_pagamento: z.string().max(30).optional().nullable(), seu_numero: z.string().max(30).optional().nullable(), }
  ```
- **bodySchema** (`supabase/functions/cnab-remessa/index.ts`, z.object):
  ```ts
  { empresa_id: z.string().uuid(), banco_codigo: z.string().regex(/^\d{3}$/, 'Código do banco em 3 dígitos'), itens: z.array(itemSchema).min(1).max(MAX_ITENS), idempotency_key: z.string().optional(), idempotencyKey: z.string().optional(), }
  ```
- **BodySchema** (`supabase/functions/criptografia/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('encrypt'), data: z.union([z.string(), z.record(z.any()), z.array(z.any())]) }), z.object({ action: z.literal('decrypt'), data: z.object({ encrypted: z.string().min(1), salt: z.string().min(1), iv: z.string().min(1), }), }), z.object({ action: z.literal('hash'), data: z.union([z.string(), z.record(z.any()), z.array(z.any())]) }), z.object({ action: z.literal('generate_token'), length: z.number().int().min(16).max(128).optional() }), ]
  ```
- **debitoSchema** (`supabase/functions/dctfweb/index.ts`, z.object):
  ```ts
  { codigo_receita: z.string().min(3).max(10), descricao: z.string().min(1).max(200), valor_centavos: z.number().int().positive().max(100_000_000_000), }
  ```
- **bodySchema** (`supabase/functions/dctfweb/index.ts`, z.object):
  ```ts
  { empresa_id: z.string().uuid(), competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência AAAA-MM'), total_remuneracao_centavos: z.number().int().nonnegative().max(1_000_000_000_000), total_fgts_centavos: z.number().int().nonnegative().max(1_000_000_000_000), debitos: z.array(debitoSchema).min(1).max(500), }
  ```
- **bodySchema** (`supabase/functions/emprestimo-consignado/index.ts`, z.object):
  ```ts
  { empresa_id: z.string().uuid(), colaborador_id: z.string().uuid(), convenio_id: z.string().uuid().optional().nullable(), instituicao_financeira: z.string().min(1).max(140), valor_principal_centavos: z.number().int().positive().max(1_000_000_000), // R$ 10M cap taxa_juros_mensal: z.number().min(0).max(15), // % prazo_meses: z.number().int().min(1).max(84), observacoes: z.string().max(500).optional(), }
  ```
- **bodySchema** (`supabase/functions/enviar-email-admissao/index.ts`, z.object):
  ```ts
  { empresa_id: uuidPg(), admissao_id: uuidPg(), // id do admissao_tokens recém-criado; o link é montado no servidor. token_id: uuidPg(), // Opcional: se vier, precisa bater com admissoes.email (o destinatário // é SEMPRE o e-mail cadastrado na admissão). email: z.string().email().max(320).optional(), }
  ```
- **BodySchema** (`supabase/functions/enviar-esocial/index.ts`, z.object):
  ```ts
  { empresaId: z.string().uuid(), eventoId: z.string().uuid(), claimToken: z.string().uuid().optional(), idempotency_key: z.string().optional(), idempotencyKey: z.string().optional(), }
  ```
- **BodySchema** (`supabase/functions/enviar-relatorio/index.ts`, z.object):
  ```ts
  { agendamentoId: z.string().uuid().optional(), claimToken: z.string().uuid().optional(), dispatchKey: z.string().min(1).max(200).regex(/^[A-Za-z0-9:._-]+$/).optional(), tipoRelatorio: z.enum(RELATORIOS_PERMITIDOS), formato: z.enum(FORMATOS_PERMITIDOS), // Canonicalize before hashing and provider submission. This keeps the // complete Resend payload byte-identical when a retry changes only casing // or surrounding whitespace in the address. emailDestinatario: z.string().trim().toLowerCase().email().max(254), parametros: z .object({ empresaId: z.string().uuid(), competencia: z .string() .regex(/^\d{4}-\d{2}$/) .optional(), }) .passthrough(), }
  ```
- **BodySchema** (`supabase/functions/exportacao/index.ts`, z.object):
  ```ts
  { action: z.enum(['colaboradores', 'folha']), format: z.enum(['csv', 'json']).default('json'), empresaId: z.string().uuid().optional(), filters: z.object({ // Regex restritivo evita valores exóticos passados adiante status: z.string().regex(/^[a-z_]{1,32}$/i).optional(), competencia: z.string().regex(/^\d{4}-\d{2}$/).optional(), }).optional(), }
  ```
- **FilterSchema** (`supabase/functions/external-db-bridge/request-schema.ts`, z.object):
  ```ts
  { column: z.string().max(120), op: z.string().max(20), value: boundedFilterValue, extraOp: z.string().max(20).optional(), }
  ```
- **OnConflictSchema** (`supabase/functions/external-db-bridge/request-schema.ts`, z.string):
  ```ts
  
  ```
- **BodySchema** (`supabase/functions/external-db-bridge/request-schema.ts`, z.object):
  ```ts
  { action: z.enum(["select", "insert", "update", "delete", "upsert", "rpc"]), table: z.string().max(63).optional(), rpcName: z.string().max(63).optional(), fn: z.string().max(63).optional(), columns: z.string().max(2000).optional(), filters: z.array(FilterSchema).max(50).optional(), order: z.object({ column: z.string().max(120), ascending: z.boolean().optional() }).optional(), limit: z.number().int().optional(), offset: z.number().int().min(0).optional(), countMode: z.enum(["none", "exact", "planned", "estimated"]).optional(), single: z.boolean().optional(), onConflict: OnConflictSchema.optional(), data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(), params: z.record(z.unknown()).optional(), userId: z.string().max(64).optional(), // Correlação distribuída — era …
  ```
- **BodySchema** (`supabase/functions/fechar-folha/index.ts`, z.object):
  ```ts
  { empresaId: z.string().uuid(), folhaId: z.string().uuid(), version: z.number().int().nonnegative(), observacoes: z.string().max(500).optional(), }
  ```
- **bodySchema** (`supabase/functions/fgts-digital/index.ts`, z.object):
  ```ts
  { empresa_id: z.string().uuid(), competencia: z.string().regex(/^\d{4}-\d{2}$/), tipo: z.enum(['mensal', 'rescisorio', 'complementar']), valor_total_centavos: z.number().int().positive().max(100_000_000_000), vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), }
  ```
- **BodySchema** (`supabase/functions/gerar-contrato-pdf/index.ts`, z.object):
  ```ts
  { admissao_id: z.string().uuid(), template_id: z.string().uuid().optional(), }
  ```
- **BodySchema** (`supabase/functions/gerar-guias/index.ts`, z.object):
  ```ts
  { empresa_id: z.string().uuid(), competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM'), tipo: z.enum(['GPS', 'DARF', 'FGTS', 'FGTS_DIGITAL', 'GFD', 'TODAS']), codigo_receita: z.string().max(20).optional(), }
  ```
- **OSSchema** (`supabase/functions/gerar-ltcat-os/index.ts`, z.object):
  ```ts
  { tipo: z.literal("os"), empresa_id: z.string().uuid(), escopo: z.enum(["cargo", "colaborador"]), cargo_id: z.string().uuid().optional(), colaborador_id: z.string().uuid().optional(), titulo: z.string().min(3).max(200), descricao_atividades: z.string().max(4000).optional().default(""), riscos: z.array(z.object({ tipo: z.string(), descricao: z.string(), nivel: z.string().optional(), })).default([]), medidas_controle: z.array(z.string()).default([]), epis_obrigatorios: z.array(z.string()).default([]), procedimentos_emergencia: z.string().max(2000).optional().default(""), responsavel_nome: z.string().min(3).max(120), responsavel_cargo: z.string().max(120).optional().default(""), responsavel_registro: z.string().max(60).optional().default(""), }
  ```
- **LTCATSchema** (`supabase/functions/gerar-ltcat-os/index.ts`, z.object):
  ```ts
  { tipo: z.literal("ltcat"), empresa_id: z.string().uuid(), titulo: z.string().min(3).max(200), data_validade: z.string().optional(), ghes_avaliados: z.array(z.object({ nome: z.string(), setor: z.string().optional(), funcoes: z.array(z.string()).default([]), })).default([]), agentes_nocivos: z.array(z.object({ agente: z.string(), tipo: z.enum(["fisico", "quimico", "biologico", "ergonomico"]).optional(), limite_tolerancia: z.string().optional(), medicao: z.string().optional(), tecnica_medicao: z.string().optional(), })).default([]), conclusao: z.string().max(4000), aposentadoria_especial: z.object({ aplicavel: z.boolean().default(false), tempo_anos: z.number().nullable().optional(), justificativa: z.string().optional(), }).default({ aplicavel: false }), responsavel_tecnico_nome: z.string().m …
  ```
- **Schema** (`supabase/functions/gerar-ltcat-os/index.ts`, z.discriminatedUnion):
  ```ts
  "tipo", [OSSchema, LTCATSchema]
  ```
- **BodySchema** (`supabase/functions/gerar-medida-disciplinar-pdf/index.ts`, z.object):
  ```ts
  { medida_id: z.string().uuid(), }
  ```
- **BodySchema** (`supabase/functions/importacao/index.ts`, z.object):
  ```ts
  { action: z.enum(['validar', 'importar', 'template']), tabela: z.enum(ALLOWED_TABLES), formato: z.enum(['csv', 'json']).optional(), csvContent: z.string().max(5 * 1024 * 1024).optional(), // 5MB total dados: z.union([z.array(z.record(z.unknown())), z.record(z.unknown())]).optional(), empresaId: z.string().uuid().optional(), }
  ```
- **BodySchema** (`supabase/functions/integracao/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('ping'), empresaId: z.string().uuid(), }), z.object({ action: z.literal('sync'), empresaId: z.string().uuid(), provider: z.enum(['bitrix24', 'esocial', 'resend', 'webhook_generic']), payload: z.record(z.unknown()).optional(), }), z.object({ action: z.literal('status'), empresaId: z.string().uuid(), provider: z.enum(['bitrix24', 'esocial', 'resend', 'webhook_generic']).optional(), }), ]
  ```
- **BodySchema** (`supabase/functions/pagar-desligamento/index.ts`, z.object):
  ```ts
  { empresaId: z.string().uuid(), desligamentoId: z.string().uuid(), comprovanteUrl: z.string().url().max(2048).nullish(), }
  ```
- **itemSchema** (`supabase/functions/pix-lote/index.ts`, z.object, encadeia refine):
  ```ts
  { colaborador_id: z.string().uuid().optional().nullable(), tipo_chave: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'evp', 'aleatoria']), chave_pix: z.string().min(1).max(140), valor_centavos: z.number().int().positive().max(50_000_000), // R$ 500k por item descricao: z.string().max(140).optional(), }
  ```
  - Regras cruzadas (refine): “Chave PIX inválida para o tipo informado”
- **bodySchema** (`supabase/functions/pix-lote/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('criar'), empresa_id: z.string().uuid(), itens: z.array(itemSchema).min(1).max(MAX_ITENS), valor_total_centavos: z.number().int().positive(), idempotency_key: z.string().optional(), idempotencyKey: z.string().optional(), }), z.object({ action: z.literal('aprovar'), lote_id: z.string().uuid(), }), ]
  ```
- **BodySchema** (`supabase/functions/process-document-ocr/index.ts`, z.object):
  ```ts
  { fileUrl: z.string().url().max(2048).refine(isAllowedFileUrl, { message: 'URL de arquivo não permitida' }), docType: z.enum(['cpf', 'rg', 'cnh', 'comprovante_residencia', 'generic']).optional().default('generic'), }
  ```
  - Regras cruzadas (refine): “URL de arquivo não permitida”
- **BodySchema** (`supabase/functions/rateLimit/index.ts`, z.object):
  ```ts
  { key: z.string().min(1).max(128).regex(/^[a-zA-Z0-9:_.-]+$/, 'chave inválida'), limit: z.number().int().min(1).max(1000).optional(), window_seconds: z.number().int().min(1).max(3600).optional(), }
  ```
- **BodySchema** (`supabase/functions/reabrir-folha/index.ts`, z.object):
  ```ts
  { empresaId: z.string().uuid(), folhaId: z.string().uuid(), version: z.number().int().nonnegative(), motivo: z.string().trim().min(10, 'Motivo deve ter ao menos 10 caracteres').max(500), override_esocial: z.boolean().optional().default(false), }
  ```
- **DateStr** (`supabase/functions/relatorio/index.ts`, z.string):
  ```ts
  
  ```
- **Competencia** (`supabase/functions/relatorio/index.ts`, z.string):
  ```ts
  
  ```
- **BodySchema** (`supabase/functions/relatorio/index.ts`, z.discriminatedUnion):
  ```ts
  'tipo', [ z.object({ tipo: z.literal('folha'), ...CommonFilter, competencia: Competencia, }).strict(), z.object({ tipo: z.literal('ponto'), ...CommonFilter, dataInicio: DateStr, dataFim: DateStr, colaboradorId: z.string().uuid().optional(), }).strict(), z.object({ tipo: z.literal('ferias'), ...CommonFilter, dataInicio: DateStr, dataFim: DateStr, }).strict(), z.object({ tipo: z.literal('colaboradores'), ...CommonFilter, status: z.enum(['ativo', 'inativo', 'ferias', 'afastado', 'todos']).default('ativo'), }).strict(), z.object({ tipo: z.literal('auditoria'), ...CommonFilter, dataInicio: DateStr, dataFim: DateStr, entidade: z.string().regex(/^[a-z_][a-z0-9_]{1,60}$/i).optional(), }).strict(), ]
  ```
- **BodySchema** (`supabase/functions/sincronizar-bitrix/index.ts`, z.object):
  ```ts
  { action: z.enum(['sync_departamentos', 'sync_colaboradores', 'sync_cargos', 'sync_all', 'status']), empresaId: z.string().uuid().optional(), }
  ```
- **BodySchema** (`supabase/functions/upload-certificado/index.ts`, z.object):
  ```ts
  { empresaId: z.string().uuid(), nome: z.string().min(1).max(200), cnpj: z.string().max(18).optional(), issuer: z.string().min(1).max(200), validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), arquivoBase64: z.string().min(64).max(8_000_000), senha: z.string().min(1).max(200), }
  ```
- **bodySchema** (`supabase/functions/whatsapp-send/index.ts`, z.object, encadeia refine):
  ```ts
  { empresa_id: uuidPg(), telefone: z.string().min(8).max(20), mensagem: z.string().min(1).max(4096).optional(), colaborador_id: uuidPg().optional(), template_id: uuidPg().optional(), }
  ```
  - Regras cruzadas (refine): “mensagem ou template_id obrigatório”

### F.2 react-hook-form (register/rules)

| Campo | Regras | Arquivo |
|---|---|---|
| `tipo_beneficio_id` | `required: true` | `src/components/colaborador-detalhes/BeneficiosTab.tsx` |
| `nome` | `required: 'Nome é obrigatório'` | `src/pages/BeneficioFormPage.tsx` |
| `valor` | `required: 'Valor é obrigatório'` | `src/pages/BeneficioFormPage.tsx` |
| `tipo` | `required: true` | `src/pages/BeneficioFormPage.tsx` |

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `totp-code` | pattern=[0-9 ]{6,7, max | `src/components/AdminRoute.tsx` |
| `pr-totp-code` | pattern=[0-9 ]{6,7, max | `src/components/ProtectedRoute.tsx` |
| `gestao-salario-min` | min, type=number, min=0 | `src/components/admissoes/GestaoCandidatos.tsx` |
| `data_prevista` | type=date | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `salario_proposto` | type=number, step=0.01, min=0 | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `email` | type=email | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `data_nascimento` | type=date | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `file-upload` | accept=.pdf,.jpg,.jpeg,.png | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| `prorr-data-fim` | type=date, min=fimAnterior \|\| undefined | `src/components/afastamentos/ProrrogacaoDialog.tsx` |
| `prorr-pericia` | type=date | `src/components/afastamentos/ProrrogacaoDialog.tsx` |
| `email` | type=email | `src/components/auth/LoginForm.tsx` |
| `password` | type=password | `src/components/auth/LoginForm.tsx` |
| `justificativa-devolucao` | disabled=salvando | `src/components/avaliacao/DialogoDevolucao.tsx` |
| `nova-meta-prazo` | type=date | `src/components/avaliacao/NovaMetaDialog.tsx` |
| `novo-ciclo-inicio` | type=date | `src/components/avaliacao/NovoCicloDialog.tsx` |
| `novo-ciclo-fim` | type=date | `src/components/avaliacao/NovoCicloDialog.tsx` |
| `novo-pdi-prazo` | type=date | `src/components/avaliacao/NovoPdiDialog.tsx` |
| `saldo-fgts` | type=number, min=0, step=0.01 | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `dias-aviso` | type=number, min=0, max=30 | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `data-fim-contrato` | type=date | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `prejuizo-480` | type=number, min=0, step=0.01 | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `desl-data` | type=date | `src/components/desligamentos/NovoDesligamentoDialog.tsx` |
| `desl-saldo-fgts` | type=number | `src/components/desligamentos/NovoDesligamentoDialog.tsx` |
| `desl-aviso-previo` | type=date | `src/components/desligamentos/NovoDesligamentoDialog.tsx` |
| `file` | accept=.pfx,.p12, required | `src/components/esocial/tabs.tsx` |
| `password` | type=password, required | `src/components/esocial/tabs.tsx` |
| `issuer` | required | `src/components/esocial/tabs.tsx` |
| `valid_from` | type=date, required | `src/components/esocial/tabs.tsx` |
| `valid_to` | type=date, required | `src/components/esocial/tabs.tsx` |
| `subject` | required | `src/components/esocial/tabs.tsx` |
| `valor` | type=number, step=0.01, min=0.01 | `src/components/ferias/FeriasAlertasPagamentoCard.tsx` |
| `ferias-data-inicio` | type=date | `src/components/ferias/FeriasForm.tsx` |
| `ferias-data-fim` | type=date, readOnly, disabled | `src/components/ferias/FeriasForm.tsx` |
| `ferias-dias-gozo` | type=number, min=5, max=30 | `src/components/ferias/FeriasForm.tsx` |
| `ferias-dias-abono` | type=number, min=0, max=10 | `src/components/ferias/FeriasForm.tsx` |
| `pcs-encargos` | type=number, min=0, max=200 | `src/components/pcs/PcsEquidadeTab.tsx` |
| `pcs-grades-n` | type=number, min=2, max=30 | `src/components/pcs/PcsGradesTab.tsx` |
| `pcs-grades-base` | type=number, min=0 | `src/components/pcs/PcsGradesTab.tsx` |
| `pcs-amp` | type=number, min=1 | `src/components/pcs/PcsPlanoHeader.tsx` |
| `pcs-ovl` | type=number, min=0 | `src/components/pcs/PcsPlanoHeader.tsx` |
| `pcs-stp` | type=number, min=1, step | `src/components/pcs/PcsPlanoHeader.tsx` |
| `aej-inicio` | type=date | `src/components/ponto/GerarAEJDialog.tsx` |
| `aej-fim` | type=date | `src/components/ponto/GerarAEJDialog.tsx` |
| `afd-inicio` | type=date | `src/components/ponto/GerarAFDDialog.tsx` |
| `afd-fim` | type=date | `src/components/ponto/GerarAFDDialog.tsx` |
| `valor-folha` | type=number, step=0.01 | `src/components/premiacoes/PagamentosDialogs.tsx` |
| `nova-turma-capacidade` | type=number, min=1 | `src/components/treinamentos/NovaTurmaDialog.tsx` |
| `nova-data-agendada` | type=datetime-local | `src/pages/AdminAgendamentoExamesPage.tsx` |
| `cargo-nivel` | type=number, min=1, step=1 | `src/pages/CargosPage.tsx` |
| `banco_codigo` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `convenio` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `agencia` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `conta` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `conta_digito` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `nome_empresa` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `totp` | pattern=[0-9 ]*, max | `src/pages/LoginPage.tsx` |
| `forgot-email` | type=email | `src/pages/LoginPage.tsx` |
| `email` | type=email | `src/pages/LoginPage.tsx` |
| `nova-senha` | type=password | `src/pages/PerfilPage.tsx` |
| `confirmar-senha` | type=password | `src/pages/PerfilPage.tsx` |
| `estoque` | type=number | `src/pages/PromoBrindesPage.tsx` |
| `preco` | type=number, step=0.01 | `src/pages/PromoBrindesPage.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

| Tabela | Coluna | Expressão |
|---|---|---|
| `auth.users` | `confirmed_at` | `LEAST("email_confirmed_at", "phone_confirmed_at")` |

### G.2 Views (consultas derivadas)

| View | SELECT |
|---|---|
| `dp_audit_log_colaborador` | `SELECT "id", "event", "event_type", "actor_user_id", CASE WHEN ("ip_address" IS NULL) THEN NULL::"inet" ELSE (((((("split_part"(("ip_address")::"text", '.'::"text", 1) \|\| '.'::"text") \|\| "split_part"(("ip_address")::"text", '.'::"text", 2)) \|\| '.'::"text") \|\| "split_part"(("ip_address")::"text", '.' …` |
| `dp_audit_log_rh` | `SELECT "id", "event", "event_type", "actor_user_id", "actor_role", CASE WHEN ("ip_address" IS NULL) THEN NULL::"text" ELSE ((("split_part"(("ip_address")::"text", '.'::"text", 1) \|\| '.'::"text") \|\| "split_part"(("ip_address")::"text", '.'::"text", 2)) \|\| '.X.X'::"text") END AS "ip_address_masked", " …` |
| `dp_data_catalog_public` | `SELECT "table_name", "column_name", ("sensitivity")::"text" AS "sensitivity", "lgpd_category", "legal_basis", "retention_days", "encrypted", "masking_rule" FROM "public"."dp_data_catalog" WHERE (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['rh'::"text", 'auditoria'::"text", 'admin'::"text", 'dpo …` |
| `dp_security_advisors` | `SELECT 'RLS_DISABLED'::"text" AS "category", "pg_tables"."tablename" AS "object_name", 'HIGH'::"text" AS "severity", (('ALTER TABLE public.'::"text" \|\| ("pg_tables"."tablename")::"text") \|\| ' ENABLE ROW LEVEL SECURITY'::"text") AS "fix_sql" FROM "pg_tables" WHERE (("pg_tables"."schemaname" = 'public …` |
| `dp_slow_queries` | `SELECT "left"("query", 200) AS "query_snippet", "calls", "round"(("mean_exec_time")::numeric, 2) AS "avg_ms", "round"(("total_exec_time")::numeric, 2) AS "total_ms", "round"(("stddev_exec_time")::numeric, 2) AS "stddev_ms", "rows", "round"(((100.0 * ("shared_blks_hit")::numeric) / (NULLIF(("shared_b …` |
| `excecoes_ponto` | `SELECT "b"."colaborador_id", "c"."nome_completo" AS "colaborador_nome", "b"."data", "count"(*) AS "total_batidas", CASE WHEN (("count"(*) % (2)::bigint) <> 0) THEN 'Batida Ímpar (Possível esquecimento)'::"text" WHEN (("count"(*) < 4) AND ("count"(*) > 0)) THEN 'Batidas Insuficientes'::"text" ELSE 'O …` |
| `pontos_abertos` | `SELECT "rp"."id", "rp"."colaborador_id", "c"."nome_completo", "rp"."data", "rp"."entrada_1", "rp"."saida_1", "rp"."entrada_2", "rp"."saida_2", "rp"."empresa_id" FROM ("public"."registros_ponto" "rp" JOIN "public"."colaboradores" "c" ON (("c"."id" = "rp"."colaborador_id"))) WHERE (("rp"."saida_1" IS …` |
| `v_alertas_timeout` | `SELECT "funcao_nome", "count"(*) AS "ocorrencias", "avg"("tempo_execucao_ms") AS "media_ms", "max"("timestamp") AS "ultima_ocorrencia" FROM "public"."metricas_processamento" WHERE (("tempo_execucao_ms" > 55000) OR ("status" = 'timeout'::"text")) GROUP BY "funcao_nome"` |
| `v_audit_events_unified` | `SELECT 'audit_log'::"text" AS "source_table", "audit_log"."tabela" AS "entidade", ("audit_log"."registro_id")::"text" AS "entidade_id", "audit_log"."acao", "audit_log"."user_id", "audit_log"."dados_anteriores", "audit_log"."dados_novos", "audit_log"."created_at" FROM "public"."audit_log" UNION ALL S …` |
| `v_audit_legacy` | `SELECT "id", "source_table", "source_id", "empresa_id", "user_id", "action", "entity", "entity_id", "payload", "ip_address", "user_agent", "occurred_at", "ingested_at" FROM "public"."audit_log_unified"` |
| `v_audit_trail` | `SELECT "a"."id", "a"."created_at", "a"."tabela", "a"."registro_id", "a"."acao", "a"."user_id", "u"."email" AS "user_email", "p"."nome" AS "user_nome", ("a"."dados_anteriores" ->> 'status'::"text") AS "status_anterior", ("a"."dados_novos" ->> 'status'::"text") AS "status_novo", (NULLIF(("a"."dados_no …` |
| `v_contrato_token_timeline` | `SELECT "e"."id", "e"."empresa_id", "e"."contrato_id", "e"."token_id", "e"."evento", "e"."detalhes", "e"."ator_id", "p"."nome" AS "ator_nome", "e"."ip", "e"."user_agent", "e"."created_at" FROM ("public"."contrato_token_eventos" "e" LEFT JOIN "public"."profiles" "p" ON (("p"."user_id" = "e"."ator_id") …` |
| `v_contratos_assinatura_kpi` | `SELECT "empresa_id", "count"(*) AS "tokens_gerados", "count"(*) FILTER (WHERE ("usado_em" IS NOT NULL)) AS "tokens_assinados", "count"(*) FILTER (WHERE (("usado_em" IS NULL) AND ("revogado_em" IS NULL) AND ("expira_em" > "now"()))) AS "tokens_pendentes", "count"(*) FILTER (WHERE (("usado_em" IS NULL …` |
| `v_contratos_tokens_pendentes` | `SELECT "t"."id", "t"."empresa_id", "t"."contrato_id", "t"."email_destinatario", "t"."expira_em", "t"."created_at", "t"."reminders_enviados", "t"."ultimo_reminder_at", (EXTRACT(day FROM ("now"() - "t"."created_at")))::integer AS "dias_desde_geracao", (EXTRACT(day FROM ("t"."expira_em" - "now"())))::i …` |
| `v_contratos_vencendo` | `SELECT "cg"."id", "cg"."empresa_id", "cg"."admissao_id", "cg"."colaborador_id", "cg"."data_inicio", "cg"."data_fim", "cg"."status", "cg"."prorrogado", "ct"."tipo_contrato", "ct"."nome" AS "template_nome", ("cg"."data_fim" - CURRENT_DATE) AS "dias_para_vencer", CASE WHEN ("cg"."data_fim" < CURRENT_DA …` |
| `v_ferias_adiant13_elegibilidade` | `SELECT "id" AS "ferias_id", "empresa_id", "colaborador_id", "data_inicio", (EXTRACT(year FROM "data_inicio"))::integer AS "ano_exercicio", "adiantamento_13o" AS "ja_solicitado", (CURRENT_DATE <= "make_date"((EXTRACT(year FROM "data_inicio"))::integer, 1, 31)) AS "dentro_do_prazo", (NOT (EXISTS ( SEL …` |
| `v_ferias_alerta_pagamento_d2` | `SELECT "id", "empresa_id", "colaborador_id", "data_inicio", "data_pagamento", "pagamento_confirmado_em", "status", ("data_inicio" - CURRENT_DATE) AS "dias_ate_inicio", CASE WHEN ("pagamento_confirmado_em" IS NOT NULL) THEN 'ok'::"text" WHEN ("data_inicio" < CURRENT_DATE) THEN 'violacao_grave'::"text …` |
| `v_ferias_alertas_criticos` | `SELECT "pa"."id" AS "periodo_aquisitivo_id", "pa"."colaborador_id", "c"."empresa_id", "c"."nome_completo" AS "colaborador", "pa"."data_inicio" AS "aquisitivo_inicio", "pa"."data_fim" AS "aquisitivo_fim", "pa"."data_limite_concessao", "pa"."dias_direito", "pa"."em_dobra", "pa"."perdeu_direito", ("pa" …` |
| `v_ferias_folha_reconciliacao` | `SELECT "f"."id" AS "ferias_id", "f"."empresa_id", "f"."colaborador_id", "c"."nome_completo" AS "colaborador_nome", "f"."data_inicio", "f"."data_fim", "f"."status", "f"."enviado_contabilidade", ("date_trunc"('month'::"text", ("f"."data_inicio")::timestamp with time zone))::"date" AS "competencia", (( …` |
| `v_idempotency_metrics` | `SELECT "endpoint", "count"(*) FILTER (WHERE ("created_at" > ("now"() - '24:00:00'::interval))) AS "total_24h", "count"(*) FILTER (WHERE ("created_at" > ("now"() - '7 days'::interval))) AS "total_7d", "count"(*) FILTER (WHERE (("status" = 'completed'::"text") AND ("created_at" > ("now"() - '24:00:00' …` |
| `v_pii_access_suspeitos` | `SELECT "user_id", "empresa_id", "tabela", "acao", "date_trunc"('hour'::"text", "created_at") AS "janela", "sum"("registro_count") AS "total_registros", "count"(*) AS "total_eventos", "max"("created_at") AS "ultimo_evento" FROM "public"."pii_access_logs" WHERE ("created_at" > ("now"() - '24:00:00'::i …` |
| `v_slow_queries_top50` | `SELECT "substring"("query", 1, 500) AS "query_sample", "calls", "round"(("mean_exec_time")::numeric, 2) AS "mean_ms", "round"(("max_exec_time")::numeric, 2) AS "max_ms", "round"(("total_exec_time")::numeric, 2) AS "total_ms", "round"(("stddev_exec_time")::numeric, 2) AS "stddev_ms", "rows", "round"( …` |
| `v_system_health` | `SELECT ( SELECT "count"(*) AS "count" FROM "pg_tables" "t" WHERE (("t"."schemaname" = 'public'::"name") AND (EXISTS ( SELECT 1 FROM ("pg_class" "c" JOIN "pg_namespace" "n" ON (("n"."oid" = "c"."relnamespace"))) WHERE (("n"."nspname" = 'public'::"name") AND ("c"."relname" = "t"."tablename") AND "c"." …` |
| `vw_alertas_compensacao` | `SELECT "bh"."colaborador_id", "c"."nome_completo", "bh"."empresa_id", "sum"( CASE WHEN (("bh"."tipo")::"text" = 'credito'::"text") THEN ((("split_part"(("bh"."horas")::"text", ':'::"text", 1))::integer * 60) + COALESCE(("split_part"(("bh"."horas")::"text", ':'::"text", 2))::integer, 0)) ELSE (- (((" …` |
| `vw_alertas_rh` | `SELECT "id", "user_id", "tipo", "titulo", "mensagem", "entidade_tipo", "entidade_id", "lida", "data_referencia", "created_at", "empresa_id" FROM "public"."notificacoes" WHERE ("lida" = false)` |
| `vw_banco_horas_saldo` | `SELECT "bh"."colaborador_id", "c"."nome_completo", "c"."empresa_id", "sum"(((( CASE WHEN (("bh"."tipo")::"text" = 'credito'::"text") THEN 1 ELSE '-1'::integer END)::numeric * EXTRACT(epoch FROM "bh"."horas")) / (3600)::numeric)) AS "saldo_horas", "max"("bh"."data") AS "ultima_movimentacao" FROM ("pu …` |
| `vw_batidas_dia` | `SELECT "bp"."id", "bp"."colaborador_id", "bp"."data", "bp"."hora", "bp"."ordem", "bp"."tipo", "bp"."origem", "bp"."ajustado", "bp"."latitude", "bp"."longitude", "bp"."dentro_raio", "bp"."empresa_id", "c"."nome_completo", "c"."foto_url", "c"."departamento" FROM ("public"."batidas_ponto" "bp" JOIN "pu …` |
| `vw_batidas_resumo` | `SELECT "bp"."colaborador_id", "c"."nome_completo", "bp"."data", "bp"."empresa_id", "jsonb_agg"("jsonb_build_object"('ordem', "bp"."ordem", 'hora', ("bp"."hora")::"text", 'tipo', "bp"."tipo") ORDER BY "bp"."ordem") AS "batidas", "count"(*) AS "total_batidas", ("min"( CASE WHEN ("bp"."tipo" = 'entrada …` |
| `vw_cadastro_incompleto` | `SELECT "id", "nome_completo", "empresa_id", "status", "array_remove"(ARRAY[ CASE WHEN (("cpf" IS NULL) OR ("cpf" = ''::"text")) THEN 'CPF'::"text" ELSE NULL::"text" END, CASE WHEN (("rg" IS NULL) OR ("rg" = ''::"text")) THEN 'RG'::"text" ELSE NULL::"text" END, CASE WHEN (("email" IS NULL) OR ("email …` |
| `vw_colaboradores_completo` | `SELECT "c"."id", "c"."nome_completo", "c"."cpf", "c"."email_corporativo", "c"."data_admissao", "c"."status", "e"."nome_fantasia" AS "empresa_nome", "c"."departamento" AS "departamento_nome", "c"."cargo" AS "cargo_nome", "c"."empresa_id" FROM ("public"."colaboradores" "c" LEFT JOIN "public"."empresas …` |
| `vw_dashboard_time` | `SELECT "empresa_id", "count"(*) AS "total_colaboradores", "count"(*) FILTER (WHERE ("status" = 'ativo'::"public"."status_colaborador")) AS "ativos", "count"(*) FILTER (WHERE ("status" = 'afastado'::"public"."status_colaborador")) AS "afastados" FROM "public"."colaboradores" GROUP BY "empresa_id"` |
| `vw_espelho_ponto_mensal` | `SELECT "bp"."colaborador_id", "bp"."data", "min"("bp"."hora") FILTER (WHERE ("bp"."tipo" = 'entrada'::"text")) AS "entrada_1", "max"("bp"."hora") FILTER (WHERE ("bp"."tipo" = 'saida'::"text")) AS "saida_1", "count"("bp"."id") AS "total_batidas", "c"."empresa_id" FROM ("public"."batidas_ponto" "bp" J …` |
| `vw_faltas_mensal` | `SELECT "to_char"(("data")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes", "empresa_id", "tipo", "count"(*) AS "total", "sum"("dias_total") AS "dias_total", "count"(*) FILTER (WHERE ("justificada" = true)) AS "justificadas", "count"(*) FILTER (WHERE (("justificada" = false) OR ("justificada" …` |
| `vw_ferias_resumo` | `SELECT "f"."id", "f"."colaborador_id", "f"."data_inicio", "f"."data_fim", "f"."status", "f"."dias_gozo", "f"."dias_abono", "f"."empresa_id", "c"."nome_completo", "c"."departamento", "c"."cargo", "c"."data_admissao" FROM ("public"."ferias" "f" JOIN "public"."colaboradores" "c" ON (("c"."id" = "f"."co …` |
| `vw_folha_compliance` | `SELECT "id" AS "audit_id", "created_at" AS "event_at", "acao", "registro_id" AS "folha_id", COALESCE((("dados_novos" ->> 'empresaId'::"text"))::"uuid", (("dados_novos" ->> 'empresa_id'::"text"))::"uuid") AS "empresa_id", COALESCE(("dados_novos" ->> 'competencia'::"text"), (("dados_novos" -> 'integri …` |
| `vw_folha_ponto_mensal` | `SELECT "rp"."colaborador_id", "c"."nome_completo", "c"."empresa_id", "c"."departamento", "to_char"(("rp"."data")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes_referencia", "count"(*) AS "dias_trabalhados", "count"(*) FILTER (WHERE (("rp"."entrada_1" IS NOT NULL) AND ("rp"."saida_1" IS NOT NU …` |
| `vw_kpi_absenteismo` | `SELECT "to_char"(("data")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes", "count"(*) AS "total_faltas", "sum"("dias_total") AS "dias_faltados", "empresa_id" FROM "public"."faltas" "f" WHERE ("data" >= (CURRENT_DATE - '1 year'::interval)) GROUP BY ("to_char"(("data")::timestamp with time zone …` |
| `vw_kpi_beneficios_custo` | `SELECT "tipo", "empresa_id", "count"(*) AS "total_beneficios", "sum"(COALESCE("valor", (0)::numeric)) AS "valor_total", "sum"(COALESCE("valor_empresa", (0)::numeric)) AS "custo_empresa", "sum"(COALESCE("valor_colaborador", (0)::numeric)) AS "custo_colaborador", "count"(DISTINCT "colaborador_id") AS …` |
| `vw_kpi_ponto_resumo` | `SELECT "rp"."colaborador_id", "c"."nome_completo", "c"."empresa_id", "to_char"(("rp"."data")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes", "count"(*) AS "dias_registrados", "count"(*) FILTER (WHERE ("rp"."entrada_1" IS NOT NULL)) AS "dias_com_entrada", "count"(*) FILTER (WHERE ("rp"."saida …` |
| `vw_kpi_turnover` | `SELECT "to_char"(("data_desligamento")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes", "count"(*) AS "desligamentos_mes", ( SELECT "count"(*) AS "count" FROM "public"."colaboradores" WHERE ("colaboradores"."status" = 'ativo'::"public"."status_colaborador")) AS "ativos_atual", "round"(((("cou …` |
| `vw_matriz_nine_box` | `SELECT "f"."avaliado_id", "c"."nome_completo", "f"."empresa_id", ("avg"("f"."performance"))::numeric(3,2) AS "media_performance", ("avg"("f"."potencial"))::numeric(3,2) AS "media_potencial", "count"("f"."id") AS "total_avaliacoes" FROM ("public"."feedbacks_360" "f" JOIN "public"."colaboradores" "c" …` |
| `vw_metricas_fila` | `SELECT "tipo_tarefa", "count"(*) FILTER (WHERE ("status" = 'completed'::"text")) AS "sucessos", "count"(*) FILTER (WHERE ("status" = 'failed'::"text")) AS "falhas", "avg"(EXTRACT(epoch FROM ("updated_at" - "created_at"))) AS "tempo_medio_segundos" FROM "public"."fila_processamento" GROUP BY "tipo_ta …` |
| `vw_passivo_trabalhista_consolidado` | `SELECT "c"."id" AS "colaborador_id", "c"."nome_completo", "c"."salario_base", "c"."data_admissao", "pa"."data_inicio" AS "periodo_aquisitivo_inicio", "pa"."data_fim" AS "periodo_aquisitivo_fim", LEAST((30)::numeric, ("floor"((EXTRACT(day FROM ("now"() - ("pa"."data_inicio")::timestamp with time zone …` |
| `vw_saldo_compensacao_mensal` | `SELECT "rp"."colaborador_id", "c"."nome_completo", "rp"."empresa_id", "to_char"(("rp"."data")::timestamp with time zone, 'YYYY-MM'::"text") AS "competencia", "count"(*) AS "dias_trabalhados", "sum"(((EXTRACT(epoch FROM COALESCE("rp"."horas_extras", '00:00:00'::interval)))::integer / 60)) AS "minutos …` |
| `v_filter_stats` | `SELECT user_id, entity_type, COUNT(*) AS filter_count FROM public.saved_filters GROUP BY user_id, entity_type` |
| `mv_status_change_daily` | `SELECT date_trunc('day', created_at)::date AS dia, tabela, acao, count(*)::bigint AS total, count(DISTINCT user_id)::bigint AS usuarios_distintos, count(DISTINCT registro_id)::bigint AS registros_distintos, min(created_at) AS primeiro_evento, max(created_at) AS ultimo_evento FROM public.audit_log WH …` |
| `mv_anomalies_hourly` | `SELECT date_trunc('hour', created_at) AS hora, type AS tipo, severity AS severidade, count(*)::bigint AS total, count(*) FILTER (WHERE resolved = false)::bigint AS abertos, count(*) FILTER (WHERE resolved = true )::bigint AS resolvidos FROM public.security_alerts WHERE created_at >= now() - interval …` |
| `mv_telemetry_dashboard` | `SELECT empresa_id, date_trunc('hour', created_at) AS hour, table_name, operation, severity, count(*) AS query_count, avg(duration_ms) AS avg_ms, min(duration_ms) AS min_ms, max(duration_ms) AS max_ms, percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms, percentile_cont(0.75) WITHIN G …` |
| `v_telemetry_last_hour` | `SELECT empresa_id, table_name, operation, severity, count(*) AS query_count, avg(duration_ms)::integer AS avg_ms, max(duration_ms)::integer AS max_ms, count(*) FILTER (WHERE severity IN ('error','fatal')) AS error_count FROM public.query_telemetry WHERE empresa_id IS NOT NULL AND created_at >= now() …` |
| `v_telemetry_slow_queries` | `SELECT id, empresa_id, created_at, user_id, table_name, operation, duration_ms, severity FROM public.query_telemetry WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '1 hour' AND duration_ms > 5000 ORDER BY created_at DESC` |
| `v_login_anomalies_ip` | `SELECT ip_address, COUNT(*) AS total_attempts, COUNT(*) FILTER (WHERE success = false) AS failed_attempts, COUNT(*) FILTER (WHERE success = true) AS successful_attempts, ROUND( COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*), 0) * 100, 2 ) AS failure_rate_pct, MIN(created_at) AS f …` |
| `v_login_anomalies_email` | `SELECT email, COUNT(*) AS total_attempts, COUNT(*) FILTER (WHERE success = false) AS failed_attempts, COUNT(*) FILTER (WHERE success = true) AS successful_attempts, ROUND( COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*), 0) * 100, 2 ) AS failure_rate_pct, MIN(created_at) AS first_ …` |
| `v_login_anomalies` | `SELECT 'ip' AS anomaly_type, ip_address AS identifier, failed_attempts, successful_attempts, failure_rate_pct, first_attempt, last_attempt, NULLIF(failures_per_minute_proj, 'NaN') AS failures_per_minute, last_failure_reason, NULL::text AS last_ip, NULL::text AS ip_type FROM v_login_anomalies_ip UNIO …` |
| `mv_headcount_daily` | `SELECT empresa_id, DATE_TRUNC('day', created_at)::DATE AS snapshot_date, status, departamento, COUNT(*) AS headcount, COUNT(*) FILTER (WHERE status = 'ativo') AS ativos, COUNT(*) FILTER (WHERE status = 'desligado') AS desligados, COUNT(*) FILTER (WHERE status = 'ferias') AS em_ferias, COUNT(*) FILTE …` |
| `mv_folha_summary` | `SELECT f.empresa_id, to_date(f.competencia \|\| '-01', 'YYYY-MM-DD') AS competencia_month, SUM(f.total_colaboradores) AS headcount_folha, SUM(f.total_proventos) AS total_bruto, SUM(f.total_descontos) AS total_descontos, SUM(f.total_liquido) AS total_liquido, SUM(f.total_fgts) AS total_fgts, SUM(f.tota …` |
| `mv_turnover_rate` | `WITH meses AS ( SELECT generate_series( DATE_TRUNC('month', NOW() - INTERVAL '3 years')::date, DATE_TRUNC('month', NOW())::date, '1 month'::interval )::date AS mes ), mensal AS ( SELECT e.empresa_id, m.mes, (SELECT COUNT(*) FROM public.colaboradores c WHERE c.empresa_id = e.empresa_id AND DATE_TRUNC …` |
| `mv_ferias_balance` | `SELECT c.empresa_id, c.departamento, c.id AS colaborador_id, c.nome_completo AS colaborador_nome, c.data_admissao, GREATEST(0, (EXTRACT(YEAR FROM AGE(NOW(), c.data_admissao)) * 30 - COALESCE( (SELECT SUM(f.dias_gozo) FROM public.ferias f WHERE f.colaborador_id = c.id AND f.status IN ('aprovada','age …` |
| `mv_afastamento_summary` | `SELECT a.empresa_id, DATE_TRUNC('month', a.data_inicio)::DATE AS mes, a.tipo AS tipo_afastamento, COUNT(*) AS total_afastamentos, SUM(a.dias_total) FILTER (WHERE a.dias_total IS NOT NULL) AS dias_totais, AVG(a.dias_total) FILTER (WHERE a.dias_total IS NOT NULL) AS media_dias, COUNT(*) FILTER (WHERE …` |
| `v_dashboard_refresh_status` | `SELECT 'mv_headcount_daily' AS view_name, pg_class.relname AS table_name, n_live_tup::BIGINT AS row_count, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze, GREATEST(COALESCE(last_autovacuum, last_vacuum), COALESCE(last_autoanalyze, last_analyze)) AS last_refresh_hint FROM pg_stat_user_t …` |
| `mv_saldo_ferias` | `SELECT f.id AS ferias_id, f.colaborador_id, c.empresa_id, c.nome_completo AS colaborador_nome, c.data_admissao, f.periodo_aquisitivo_inicio, f.periodo_aquisitivo_fim, f.dias_gozo AS dias_totais, GREATEST(0, 30 - COALESCE(f.dias_gozo, 0))::INTEGER AS dias_saldo, ROUND( (c.salario_base / 12) * (1 + 1. …` |
| `mv_provisao_13` | `SELECT c.id AS colaborador_id, c.empresa_id, c.nome_completo AS colaborador_nome, c.salario_base, ROUND(c.salario_base / 12, 2) AS provisao_mensal_13, GREATEST(0, EXTRACT(MONTH FROM CURRENT_DATE) - 1) AS meses_devidos, ROUND( c.salario_base / 12 * GREATEST(0, EXTRACT(MONTH FROM CURRENT_DATE) - 1) , …` |
| `mv_fgts_passivo` | `SELECT c.id AS colaborador_id, c.empresa_id, c.nome_completo AS colaborador_nome, c.salario_base, ROUND(c.salario_base * 0.08, 2) AS fgts_mensal, ROUND(c.salario_base * 0.08 / 12, 2) AS provisao_mensal_fgts, ROUND(c.salario_base * 3.2, 2) AS provisao_multa_estimada, ROUND(c.salario_base * 0.31 / 12, …` |
| `mv_passivo_trabalhista` | `WITH ultima_folha AS ( SELECT DISTINCT ON (empresa_id) empresa_id, competencia, total_liquido FROM folhas_pagamento WHERE status IN ('calculada', 'paga', 'fechada') ORDER BY empresa_id, competencia DESC ), ferias_vencidas AS ( SELECT c.empresa_id, COUNT(DISTINCT pa.colaborador_id) AS qtde_colabs_ven …` |
| `v_passivo_summary` | `SELECT empresa_id, COUNT(*) AS total_colaboradores, SUM(total_passivo)::DECIMAL(15,2) AS total_passivo_empresa, SUM(provisao_ferias)::DECIMAL(15,2) AS total_ferias, SUM(provisao_13)::DECIMAL(15,2) AS total_13, SUM(provisao_mensal_fgts)::DECIMAL(15,2) AS total_fgts_mensal, SUM(provisao_multa_fgts)::D …` |
| `v_documentos_unificado` | `SELECT 'admissao'::TEXT as contexto, d.id, a.empresa_id, d.admissao_id as referencia_id, d.tipo, NULL::TEXT as titulo, d.url as arquivo_url, NULL::TEXT as conteudo_html, NULL::TEXT as status, d.created_at, NULL::TIMESTAMPTZ as updated_at FROM public.documentos_admissao d JOIN public.admissoes a ON a …` |
| `admin.v_pgbouncer_stats` | `SELECT datname as database, count(*) as total_connections, count(*) FILTER (WHERE state = 'active') as active_connections, count(*) FILTER (WHERE state = 'idle') as idle_connections, count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_tx_connections, count(*) FILTER (WHERE wait_event IS …` |
| `admin.v_slow_queries` | `SELECT now() - query_start as duration, usename as username, datname as database, state, left(query, 200) as query_preview, wait_event, pid FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > INTERVAL '5 seconds' ORDER BY duration DESC LIMIT 20` |
| `admin.v_long_running_queries` | `SELECT pid, usename, application_name, state, query, now() - query_start as duration, wait_event_type, wait_event FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > INTERVAL '1 minute' ORDER BY duration DESC` |
| `admin.v_open_transactions` | `SELECT pid, usename, now() - xact_start as transaction_duration, state, left(query, 100) as query_preview FROM pg_stat_activity WHERE xact_start IS NOT NULL AND state = 'idle in transaction' ORDER BY transaction_duration DESC` |
| `mv_kpi_turnover_absenteismo` | `WITH admissoes AS ( SELECT empresa_id, DATE_TRUNC('month', data_admissao) AS mes, COUNT(*) AS total_admissoes FROM colaboradores WHERE data_admissao >= CURRENT_DATE - INTERVAL '12 months' AND data_admissao < CURRENT_DATE + INTERVAL '1 day' GROUP BY 1, 2 ), desligamentos AS ( SELECT empresa_id, DATE_ …` |
| `mv_dashboard_headcount` | `SELECT empresa_id, DATE_TRUNC('month', CURRENT_DATE)::DATE AS mes, COUNT(*) AS total_colaboradores, COUNT(*) FILTER (WHERE status = 'ativo') AS ativos, COUNT(*) FILTER (WHERE status = 'ferias') AS em_ferias, COUNT(*) FILTER (WHERE status = 'afastado') AS afastados, COUNT(*) FILTER (WHERE status = 'd …` |
| `mv_esocial_status` | `SELECT empresa_id, competencia, tipo_evento, status, COUNT(*) AS quantidade, MIN(created_at) AS primeira_criacao, MAX(created_at) AS ultima_criacao, COUNT(*) FILTER (WHERE status = 'rejeitado') AS total_rejeitados, COUNT(*) FILTER (WHERE status = 'pendente' AND created_at < CURRENT_DATE - INTERVAL ' …` |
| `mv_absenteismo_mensal` | `WITH dias_uteis AS ( SELECT e.id AS empresa_id, DATE_TRUNC('month', CURRENT_DATE)::DATE AS mes, COUNT(*) AS dias_uteis_mes FROM empresas e CROSS JOIN generate_series( DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', '1 day' ) AS d(data) WH …` |
| `contas_bancarias_decrypted` | `SELECT id, colaborador_id, empresa_id, banco_nome, banco_codigo, public.decrypt_dados_bancarios_tenant(agencia_encrypted, empresa_id) AS agencia, public.decrypt_dados_bancarios_tenant(conta_encrypted, empresa_id) AS conta, public.decrypt_dados_bancarios_tenant(digito_encrypted, empresa_id) AS digito …` |
| `vw_feedbacks_360_versao` | `select f.id as feedback_id, f.empresa_id, f.ciclo_id, f.avaliado_id, f.avaliador_id, f.tipo, f.status, f.potencial, f.updated_at, public.versao_avaliacao_feedback(f.id) as versao_avaliacao from public.feedbacks_360 f` |

### G.3 Funções de cálculo/decisão no código

- **signCalculation(data: unknown)** — `src/calculators/auditHelper.ts`
  ```
  const encoder = new TextEncoder(); const rawData = JSON.stringify(data); const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawData)); const hashArray = Array.from(new Uint8Array(hashBuffer)); return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  ```
- **auditCalculation(colaboradorId: string, competencia: string, resultado: FolhaResultado)** — `src/calculators/auditHelper.ts`
  ```
  // Gera assinatura digital única do resultado const signature = await signCalculation(resultado); await auditLogger.log({ tabela: 'folhas_pagamento', registro_id: colaboradorId, acao: 'EXECUTE_CALC', dados_novos: { competencia, signature, // Metadados essenciais para conferência rápida total_proventos: (resultado.proventos as { totalProventos?: number } | undefined)?.totalProventos ?? (resultado.proventos as number | undefined), total_descontos: (resultado.descontos as { totalDescontos?: number …
  ```
- **verifyCalculationIntegrity(data: unknown, originalSignature: string)** — `src/calculators/auditHelper.ts`
  ```
  const currentSignature = await signCalculation(data); return currentSignature === originalSignature;
  ```
- **calcularDecimo13(params: ParamsDecimo13)** — `src/calculators/beneficios.ts`
  ```
  bruto: number; inss: number; irrf: number; fgts: number; liquido: number; mensagem?: string;
  ```
- **calcularFerias(salarioBase: number, diasFerias = 30, diasAbono = 0, dependentes = 0)** — `src/calculators/beneficios.ts`
  ```
  const valorDiario = salarioBase / 30; const valorFerias = valorDiario * diasFerias; const tercoConstitucional = valorFerias / 3; const valorAbono = valorDiario * diasAbono; const tercoAbono = valorAbono / 3; const bruto = valorFerias + tercoConstitucional + valorAbono + tercoAbono; // Férias têm tributação separada (exclusiva na fonte) const inss = calcularINSS(valorFerias + tercoConstitucional); const irrf = calcularIRRF(valorFerias + tercoConstitucional, dependentes); const liquido = Math.trun …
  ```
- **calcularHorasExtras(salarioBase: number, horasExtras50 = 0, horasExtras100 = 0, jornadaMensal = 220, diasUteis = 26, domingosEFeriados = 4)** — `src/calculators/beneficios.ts`
  ```
  const valorHora = jornadaMensal > 0 ? salarioBase / jornadaMensal : 0; const valor50 = Math.trunc(valorHora * 1.5 * horasExtras50 * 100) / 100; const valor100 = Math.trunc(valorHora * 2.0 * horasExtras100 * 100) / 100; const totalExtras = Math.trunc((valor50 + valor100) * 100) / 100; const dsr = calcularDSR(totalExtras, diasUteis, domingosEFeriados); return { valor50, valor100, total: totalExtras, dsr, totalComDsr: Math.trunc((totalExtras + dsr) * 100) / 100 };
  ```
- **calcularDSR(totalVariaveis: number, diasUteis: number, domingosEFeriados: number)** — `src/calculators/beneficios.ts`
  ```
  if (diasUteis <= 0) return 0; const valorDsr = (totalVariaveis / diasUteis) * domingosEFeriados; return Math.trunc(valorDsr * 100) / 100;
  ```
- **calcularAdicionalNoturno(salarioBase: number, horasNoturnas: number, jornadaMensal = 220, percentual = 20)** — `src/calculators/beneficios.ts`
  ```
  const valorHora = jornadaMensal > 0 ? salarioBase / jornadaMensal : 0; return Math.trunc(valorHora * (percentual / 100) * horasNoturnas * 100) / 100;
  ```
- **calcularPericulosidade(salarioBase: number)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(salarioBase * 0.3 * 100) / 100;
  ```
- **calcularInsalubridade(grau: GrauInsalubridade)** — `src/calculators/beneficios.ts`
  ```
  const percentuais = { minimo: 0.1, medio: 0.2, maximo: 0.4 }; return Math.trunc(SALARIO_MINIMO_2026 * percentuais[grau] * 100) / 100;
  ```
- **calcularDescontoVT(salarioBase: number, valorVTMensal: number)** — `src/calculators/beneficios.ts`
  ```
  const limiteDesconto = salarioBase * 0.06; return Math.trunc(Math.min(valorVTMensal, limiteDesconto) * 100) / 100;
  ```
- **calcularValeAlimentacao(valorMensal: number, salarioBase: number, usaPAT = true)** — `src/calculators/beneficios.ts`
  ```
  valor: number; desconto: number
  ```
- **calcularPlanoSaude(custoTotal: number, coparticipacao = 0, mensalidadeFixa = 0)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc((mensalidadeFixa + coparticipacao) * 100) / 100;
  ```
- **calcularPensaoAlimenticia(baseCalculo: number, percentual: number)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(baseCalculo * (percentual / 100) * 100) / 100;
  ```
- **calcularSalarioFamilia(salarioBruto: number, numeroDependentes: number)** — `src/calculators/beneficios.ts`
  ```
  if (salarioBruto > SALARIO_FAMILIA_TETO) return 0; return Math.trunc(SALARIO_FAMILIA_VALOR * numeroDependentes * 100) / 100;
  ```
- **calcularSalarioMaternidade(salarioBase: number, diasLicenca = 120)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc((salarioBase / 30) * diasLicenca * 100) / 100;
  ```
- **calcularAuxilioDoenca(mediaSalarial: number)** — `src/calculators/beneficios.ts`
  ```
  const beneficio = mediaSalarial * 0.91; return Math.trunc(Math.max(SALARIO_MINIMO_2026, beneficio) * 100) / 100;
  ```
- **calcularSobreaviso(salarioBase: number, horas: number, jornadaMensal = 220)** — `src/calculators/beneficios.ts`
  ```
  if (jornadaMensal <= 0 || horas <= 0) return 0; const valorHora = salarioBase / jornadaMensal; return Math.trunc(valorHora * (1 / 3) * horas * 100) / 100;
  ```
- **calcularProntidao(salarioBase: number, horas: number, jornadaMensal = 220)** — `src/calculators/beneficios.ts`
  ```
  if (jornadaMensal <= 0 || horas <= 0) return 0; const valorHora = salarioBase / jornadaMensal; return Math.trunc(valorHora * (2 / 3) * horas * 100) / 100;
  ```
- **calcularGratificacao(salarioBase: number, percentual: number)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(salarioBase * (percentual / 100) * 100) / 100;
  ```
- **calcularComissao(valorVendas: number, percentualComissao: number)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(valorVendas * (percentualComissao / 100) * 100) / 100;
  ```
- **calcularDiarias(valorDiaria: number, dias: number, percentualDesconto = 0)** — `src/calculators/beneficios.ts`
  ```
  const total = Math.trunc(valorDiaria * dias * 100) / 100; const desconto = Math.trunc(total * (percentualDesconto / 100) * 100) / 100; return { total, desconto, liquido: Math.trunc((total - desconto) * 100) / 100 };
  ```
- **calcularQuilometragem(km: number, valorPorKm = 1.2)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(km * valorPorKm * 100) / 100;
  ```
- **calcularBancoHoras(creditos: string[], debitos: string[])** — `src/calculators/beneficios.ts`
  ```
  const parseMinutos = (h: string) => { const [hh, mm] = h.split(':').map(Number); return (hh || 0) * 60 + (mm || 0); }; const totalCreditos = creditos.reduce((a, c) => a + parseMinutos(c), 0); const totalDebitos = debitos.reduce((a, d) => a + parseMinutos(d), 0); const saldo = totalCreditos - totalDebitos; const horas = Math.floor(Math.abs(saldo) / 60); const minutos = Math.abs(saldo) % 60; const saldoFormatado = `${saldo < 0 ? '-' : ''}${horas}:${minutos.toString().padStart(2, '0')}`; return { t …
  ```
- **calcularMedias(valores: number[])** — `src/calculators/beneficios.ts`
  ```
  if (valores.length === 0) return 0; const soma = valores.reduce((acc, val) => acc + val, 0); return Math.trunc((soma / valores.length) * 100) / 100;
  ```
- **calcularLiquido(bruto: number, descontos: number)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc((bruto - descontos) * 100) / 100;
  ```
- **calcularAdicionalTransferencia(salarioBase: number, percentual = 25)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(salarioBase * (percentual / 100) * 100) / 100;
  ```
- **calcularEmprestimoConsignado(salarioLiquido: number, parcela: number)** — `src/calculators/beneficios.ts`
  ```
  parcela: number; margemDisponivel: number
  ```
- **calcularINSS(salarioBruto: number, ano = 2026)** — `src/calculators/impostos.ts`
  ```
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos const anos = Object.keys(INSS_POR_ANO) .map(Number) .sort((a, b) => a - b); const anoTabela = anos.filter((a) => a <= ano).pop() ?? anos[0]; const { faixas, teto } = INSS_POR_ANO[anoTabela]; const baseCents = BigInt(Math.round(salarioBruto * 100)); const tetoCents = BigInt(Math.round(teto * 100)); const b = baseCents < tetoCents ? baseCents : tetoCents; let inssMilesimos = 0n; let anterior = 0n; for (const faixa of faixas) { if ( …
  ```
- **calcularFGTS(salarioBruto: number)** — `src/calculators/impostos.ts`
  ```
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal return Math.trunc(salarioBruto * ALIQUOTA_FGTS * 100) / 100;
  ```
- **calcularRescisao(params: { salarioBase: number; dataAdmissao: string; dataDesligamento: string; tipoRescisao: TipoRescisao; saldoFGTS?: n)** — `src/calculators/rescisao.ts`
  ```
  const r = calcularRescisaoCore({ salario: params.salarioBase, dataAdmissao: params.dataAdmissao, dataDesligamento: params.dataDesligamento, tipo: params.tipoRescisao, avisoTrabalhado: params.avisoTrabalhado ?? false, feriasVencidas: params.feriasVencidas ?? false, saldoFGTS: params.saldoFGTS ?? 0, dependentes: params.dependentes ?? 0, diasAvisoNaoCumpridos: params.diasAvisoNaoCumpridos, dataFimContrato: params.dataFimContrato, terminoIniciativa: params.terminoIniciativa, dataPagamento: params.da …
  ```
- **calcularAvisoPrevioIndenizado(salarioBase: number, anosServico: number)** — `src/calculators/rescisao.ts`
  ```
  const dias = Math.min(90, 30 + anosServico * 3); const valor = Math.trunc((salarioBase / 30) * dias * 100) / 100; return { dias, valor };
  ```
- **calcularSeguroDesemprego(ultimosSalarios: number[], mesesVinculo = 0)** — `src/calculators/rescisao.ts`
  ```
  if (!ultimosSalarios.length) return { valorParcela: SALARIO_MINIMO_2026, parcelas: 3 }; const media = ultimosSalarios.reduce((a, b) => a + b, 0) / ultimosSalarios.length; const sd = FAIXAS_SEGURO_DESEMPREGO_2026; let valorParcela: number; if (media <= sd.faixa1Limite) valorParcela = media * sd.faixa1Mult; else if (media <= sd.faixa2Limite) valorParcela = sd.faixa2Base + (media - sd.faixa1Limite) * sd.faixa2Mult; else valorParcela = sd.teto; valorParcela = Math.max(SALARIO_MINIMO_2026, Math.trunc …
  ```
- **calcularMultaFGTS(saldoFGTS: number, tipo: 'sem_justa_causa' | 'acordo_mutuo', fgtsRescisao = 0)** — `src/calculators/rescisao.ts`
  ```
  const percentual = tipo === 'sem_justa_causa' ? 0.4 : 0.2; return Math.trunc((saldoFGTS + fgtsRescisao) * percentual * 100) / 100;
  ```
- **calcularMulta477(salarioBase: number, empregadorCulpado = false)** — `src/calculators/rescisao.ts`
  ```
  if (!empregadorCulpado) return 0; return Math.trunc(salarioBase * 100) / 100;
  ```
- **calcularProvisaoFerias(salarioBase: number, mesesAquisitivo: number)** — `src/calculators/rescisao.ts`
  ```
  const proporcional = (salarioBase / 12) * mesesAquisitivo; const provisaoFerias = Math.trunc(proporcional * 100) / 100; const provisaoTerco = Math.trunc((provisaoFerias / 3) * 100) / 100; const provisaoEncargos = Math.trunc((provisaoFerias + provisaoTerco) * 0.3637 * 100) / 100; const total = Math.trunc((provisaoFerias + provisaoTerco + provisaoEncargos) * 100) / 100; return { provisaoFerias, provisaoTerco, provisaoEncargos, total };
  ```
- **calcularProvisao13(salarioBase: number, mesesTrabalhados: number)** — `src/calculators/rescisao.ts`
  ```
  const provisao13 = Math.trunc((salarioBase / 12) * mesesTrabalhados * 100) / 100; const provisaoEncargos = Math.trunc(provisao13 * 0.3637 * 100) / 100; const total = Math.trunc((provisao13 + provisaoEncargos) * 100) / 100; return { provisao13, provisaoEncargos, total };
  ```
- **calcularEncargos(salarioBase: number, percentualRAT = 0.03, percentualTerceiros = 0.058)** — `src/calculators/rescisao.ts`
  ```
  const inssEmpregado = calcularINSS(salarioBase); const irrfEmpregado = calcularIRRF(salarioBase); const fgts = calcularFGTS(salarioBase); const inssPatronal = Math.trunc(salarioBase * 0.2 * 100) / 100; const rat = Math.trunc(salarioBase * percentualRAT * 100) / 100; const terceiros = Math.trunc(salarioBase * percentualTerceiros * 100) / 100; const totalEncargosPatronais = Math.trunc((inssPatronal + rat + terceiros + fgts) * 100) / 100; const custoMensalTotal = Math.trunc((salarioBase + totalEnca …
  ```
- **calcularProRata(salarioBase: number, diasTrabalhados: number)** — `src/calculators/rescisao.ts`
  ```
  return Math.trunc((salarioBase / 30) * diasTrabalhados * 100) / 100;
  ```
- **calcularMargemConsignado(salarioLiquido: number)** — `src/calculators/rescisao.ts`
  ```
  return { margemTotal: Math.trunc(salarioLiquido * 0.35 * 100) / 100, margemCartao: Math.trunc(salarioLiquido * 0.05 * 100) / 100, };
  ```
- **calcularPLR(valor: number)** — `src/calculators/rescisao.ts`
  ```
  let irrf = 0; for (const faixa of FAIXAS_PLR_2026) { if (valor <= faixa.limite) { irrf = Math.max(0, Math.trunc((valor * faixa.aliquota - faixa.deducao) * 100) / 100); break; } } return { bruto: valor, irrf, liquido: Math.trunc((valor - irrf) * 100) / 100 };
  ```
- **calcularHorasExtras(salarioBase: number, jornadaMensal = 220, horasExtras: number, percentual = 0.5)** — `src/calculators/trabalhista-base.ts`
  ```
  if (horasExtras <= 0 || jornadaMensal <= 0) return 0; const valorHora = salarioBase / jornadaMensal; const valorComAdicional = valorHora * (1 + percentual); return Math.trunc(valorComAdicional * horasExtras * 100) / 100;
  ```
- **calcularDSR(totalVariavel: number, diasUteis = 26, domingosFeriados = 4)** — `src/calculators/trabalhista-base.ts`
  ```
  if (totalVariavel <= 0 || diasUteis <= 0) return 0; return Math.trunc((totalVariavel / diasUteis) * domingosFeriados * 100) / 100;
  ```
- **calcular13Salario(salarioBase: number, mesesTrabalhados = 12, parcela: 1 | 2 = 2)** — `src/calculators/trabalhista-base.ts`
  ```
  const valorIntegral = (salarioBase / 12) * mesesTrabalhados; if (parcela === 1) { // 1ª Parcela é sempre 50% do valor de direito, sem descontos de INSS/IRRF return Math.trunc((valorIntegral / 2) * 100) / 100; } // 2ª Parcela é o valor integral (sobre o qual incidirão descontos no cálculo principal) return Math.trunc(valorIntegral * 100) / 100;
  ```
- **dataValida(valor?: string | null)** — `src/components/admissoes/AdmissoesDashboard.tsx`
  ```
  if (!valor) return null; const data = new Date(valor); return Number.isNaN(data.getTime()) ? null : data;
  ```
- **kpisBas(e)** — `src/components/admissoes/AdmissoesDashboard.tsx`
  ```
  label: string; valor: number; icon: LucideIcon; tone: Tone; descricao: string; amostra: AdmissaoLike[]; comTendencia: boolean;
  ```
- **responsaveisDaFila(candidatos: AdmissaoDetalhe[])** — `src/components/admissoes/admissoesDashboardModais.tsx`
  ```
  const nomes = [...new Set(candidatos.map((c) => c.responsavel).filter((nome) => nome && nome !== 'Não atribuído'))]; return nomes.length > 0 ? nomes.join(', ') : 'Não atribuído — nenhuma admissão desta fila tem responsável preenchido.';
  ```
- **dataValida(valor?: string | null)** — `src/components/admissoes/admissoesDerivacoes.ts`
  ```
  if (!valor) return null; const data = new Date(valor); return Number.isNaN(data.getTime()) ? null : data;
  ```
- **progressoValor(a: AdmissaoLike)** — `src/components/admissoes/admissoesDerivacoes.ts`
  ```
  return progressoDaAdmissao(a).valor;
  ```
- **validateFile(file: File)** — `src/components/afastamentos/AfastamentoDocumentManager.tsx`
  ```
  // 1. Validação de Tamanho if (file.size > MAX_FILE_SIZE) { toast.error('O arquivo é muito grande. O limite é de 10MB.'); return false; } // 2. Validação de Tipo MIME if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Tipo de arquivo não suportado. Use PDF, JPG ou PNG.'); return false; } // 3. Verificação de integridade básica if (file.size === 0) { toast.error('O arquivo está vazio ou corrompido.'); return false; } // 4. Verificação Avançada de Metadados (Excellence 10/10) try { const isVal …
  ```
- **podeProrrogar(af: AfastamentoItem)** — `src/components/afastamentos/AfastamentoTable.tsx`
  ```
  
  ```
- **iniciaisDe(email: string)** — `src/components/avaliacao/AuditoriaEvento.tsx`
  ```
  const local = email.split('@')[0] ?? email; const partes = local.split(/[._-]+/).filter(Boolean); const duas = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? ''); return duas.join('') || local.slice(0, 2).toUpperCase();
  ```
- **FeedbackAcoesRodape({ item, previa, estadoAprovacao, servicoDemo, contexto = 'avaliacoes', }: { item: FeedbackDerivado; previa?: PreviewAcoe)** — `src/components/avaliacao/FeedbackAcoesRodape.tsx`
  ```
  const qc = useQueryClient(); const { user, isAdmin, hasRole } = useAuth(); const f = (item?.feedback ?? {}) as Record<string, unknown>; const feedbackId = String(f?.id ?? '').trim(); const empresaId = String(f?.empresa_id ?? '').trim(); const cicloId = String(f?.ciclo_id ?? '').trim(); const statusAtual = normalizarStatus(f?.status); /** Status canônico do registro — badge de fallback quando não há aprovação. */ const statusRegistro = statusCanonico(f?.status); /* ─── Prévia local (DEV) × operaç …
  ```
- **FeedbackCard({ item, onVer, onEditar, onFiltrarAvaliador, onFiltrarAvaliado }: FeedbackCardProps)** — `src/components/avaliacao/FeedbackCard.tsx`
  ```
  return ( <CartaoFeedbackCanonico item={item} contexto="lista" acoes={onVer ? ['ver', 'editar'] : ['editar']} onVer={() => onVer?.(item)} onEditar={() => onEditar?.(item)} onFiltrarAvaliador={onFiltrarAvaliador} onFiltrarAvaliado={onFiltrarAvaliado} /> );
  ```
- **FeedbackDetalheDialog({ item: entrada, aberto, onOpenChange, onFiltrarAvaliado, previa, estadoAprovacao, servicoDemo, contexto = 'avaliacoes',)** — `src/components/avaliacao/FeedbackDetalheDialog.tsx`
  ```
  if (!entrada) return null; /** * ACEITA OS DOIS FORMATOS: o modelo canônico (caminho normal da aba) ou um * registro apenas derivado (chamadores antigos/testes). O diálogo normaliza * sozinho para nunca depender de campos que o chamador "deveria" ter montado. */ const item: FeedbackCanonico = Array.isArray((entrada as FeedbackCanonico).acoes) ? (entrada as FeedbackCanonico) : normalizarFeedback(entrada as FeedbackDerivado); const local = [item.cargo, item.departamento].filter(Boolean).join(' · ' …
  ```
- **FeedbacksFiltros({ indice = 1, busca, onBusca, tipo, onTipo, avaliador, onAvaliador, avaliadores, somentePendentes, onSomentePendentes, o)** — `src/components/avaliacao/FeedbacksFiltros.tsx`
  ```
  /** * Existe filtro fora do padrão? Derivado SOMENTE dos props — a ORDENAÇÃO e o * chip de segmentação não entram (ordenar não recorta a lista e a segmentação * tem a própria linha de chips). */ const temFiltroAtivo = busca.trim() !== '' || tipo !== '' || avaliador !== '' || somentePendentes; return ( <motion.div {...entradaCard(indice)} className="space-y-2"> {/* ── Linha 1: busca + filtros + ordenação ─────────────────────────── */} <div className="flex flex-wrap items-center gap-2"> <SearchIn …
  ```
- **FeedbacksFocoBanner({ pendentes, prazo, indice = 0, onVerPendentes }: FeedbacksFocoBannerProps)** — `src/components/avaliacao/FeedbacksFocoBanner.tsx`
  ```
  if (pendentes <= 0) return null; return ( <motion.div {...entradaCard(indice)} className="flex flex-col gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-3 lg:flex-row lg:items-center lg:gap-4" > <div className="flex min-w-0 flex-1 items-center gap-3"> <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive-vivid/15 text-destructive-vivid"> <AlertTriangle className="h-4.5 w-4.5" /> </span> <div className="min-w-0"> <p class …
  ```
- **FeedbacksResumo({ distribuicao, media, delta, tipos, total, indiceBase = 2, reduzirMovimento = false, onNovoFeedback, }: FeedbacksResumo)** — `src/components/avaliacao/FeedbacksResumo.tsx`
  ```
  const tomDelta = delta === null ? 'neutra' : delta > 0 ? 'alta' : delta < 0 ? 'baixa' : 'neutra'; const APARENCIA_DELTA = { alta: { Icone: TrendingUp, tinta: 'text-success' }, baixa: { Icone: TrendingDown, tinta: 'text-destructive-vivid' }, neutra: { Icone: Minus, tinta: 'text-muted-foreground' }, } as const; const { Icone: IconeDelta, tinta: tintaDelta } = APARENCIA_DELTA[tomDelta]; return ( <div className="space-y-4"> {/* ── 1. Distribuição de notas ─────────────────────────────────────── */} …
  ```
- **FeedbacksTimeline({ grupos, apresentacao, reduzirMovimento = false, onVer, onEditar, onFiltrarAvaliador, onFiltrarAvaliado, onLimpar, }: F)** — `src/components/avaliacao/FeedbacksTimeline.tsx`
  ```
  const alvo = useRef<HTMLDivElement>(null); /** Gatilho ÚNICO da sequência: dispara quando a lista aparece e só uma vez. */ const emVista = useInView(alvo, { once: true, amount: FRACAO_PARA_INICIAR }); // O índice da cascata é RELATIVO à lista (0 = primeiro card exibido, o que // recebe a expansão) e continua de um mês para o seguinte sem reiniciar. let contador = 0; const comIndice = grupos.map((grupo) => ({ ...grupo, itens: grupo.itens.map((item) => ({ item, indice: contador++ })), })); /** * I …
  ```
- **classifyScore(score: number)** — `src/components/avaliacao/NineBoxMatrix.tsx`
  ```
  if (score <= 1.5 || !score) return 1; if (score <= 3.5) return 2; return 3;
  ```
- **podeValidarPotencial(papeis: PapeisAvaliacao)** — `src/components/avaliacao/acoesFeedback.ts`
  ```
  return capacidadesAvaliacao(papeis).podeValidarPotencial;
  ```
- **podeGerirAvaliacoes(papeis: PapeisAvaliacao)** — `src/components/avaliacao/acoesFeedback.ts`
  ```
  return capacidadesAvaliacao(papeis).podeGerirAvaliacoes;
  ```
- **podeConcluirFeedback({ papeis, avaliadorId, vinculos = [], usuarioId, responsavel = false, autorizadoServidor = false, }: { papeis: PapeisAva)** — `src/components/avaliacao/acoesFeedback.ts`
  ```
  const c = capacidadesAvaliacao(papeis); if (c.admin || c.rh) return true; if (ehAvaliadorDesignado({ avaliadorId, vinculos, usuarioId })) return true; if (autorizadoServidor === true) return true; // Ser supervisor só autoriza quando a conta também tem o papel `gestor`; // um `user` que aparece como supervisor não recebe conclusão por engano. return c.gestor && responsavel === true;
  ```
- **perfisOperadorEfetivos(papeis: PapeisAvaliacao, _responsavel?: boolean)** — `src/components/avaliacao/acoesFeedback.ts`
  ```
  const c = capacidadesAvaliacao(papeis); const perfis: PerfilOperador[] = []; if (c.admin || c.rh) perfis.push('admin_rh'); if (c.gestor) perfis.push('gestor'); if (perfis.length === 0) perfis.push(normalizarPapeis(papeis).includes('user') ? 'avaliador' : 'desconhecido'); return perfis;
  ```
- **podeEnviarParaGestor(papeis: PapeisAvaliacao)** — `src/components/avaliacao/aprovacaoGestor.ts`
  ```
  return capacidadesAvaliacao(papeis).podeGerirAvaliacoes;
  ```
- **podeDecidirAprovacao(papeis: PapeisAvaliacao)** — `src/components/avaliacao/aprovacaoGestor.ts`
  ```
  return capacidadesAvaliacao(papeis).podeDecidirAprovacao;
  ```
- **validarJustificativaDevolucao(texto: unknown)** — `src/components/avaliacao/aprovacaoGestor.ts`
  ```
  const t = String(texto ?? '').trim(); if (!t) return { pode: false, motivo: 'vazia', descricao: 'Informe a justificativa da devolução.' }; if (t.length < MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO) { return { pode: false, motivo: 'curta', descricao: `A justificativa precisa de pelo menos ${MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO} caracteres.`, }; } return { pode: true, motivo: 'ok', descricao: '' };
  ```
- **feedbackDoGestor(grupo: unknown[])** — `src/components/avaliacao/aprovacaoGestor.ts`
  ```
  const gestores = (grupo ?? []) .map((bruto) => (bruto ?? {}) as Record<string, unknown>) .filter( (f) => tipoFeedback(f.tipo) === 'gestor' && texto(f.id) !== '' && texto(f.status).toLowerCase() !== 'cancelado' ); if (gestores.length === 0) return null; return gestores.sort( (a, b) => (instante(b.updated_at) || instante(b.created_at)) - (instante(a.updated_at) || instante(a.created_at)) )[0];
  ```
- **versaoValidacaoDemo(grupo: unknown[])** — `src/components/avaliacao/aprovacaoGestor.ts`
  ```
  const gestor = feedbackDoGestor(grupo); return gestor ? versaoConsolidadaDemo([gestor]) : null;
  ```
- **validacoesLocais(estado: EstadoLocalDemo)** — `src/components/avaliacao/aprovacaoLocal.ts`
  ```
  return Object.values(estado.validacoes).map((v) => ({ colaborador_id: v.colaboradorId, ciclo_id: v.cicloId, versao_avaliacao: v.versaoAvaliacao, validado_em: v.validadoEm, validado_por: v.validadoPor, observacao: v.observacao, }));
  ```
- **aplicarFiltros(eventos: EventoAuditoria[], filtros: FiltrosAuditoria, opcoes: { ignorarModulo?: boolean; agora?: Date } = {})** — `src/components/avaliacao/auditoriaComum.ts`
  ```
  const agora = opcoes.agora ?? new Date(); const busca = filtros.busca.trim().toLowerCase(); const registro = filtros.registro.trim().toLowerCase(); const campo = filtros.campo.trim().toLowerCase(); return eventos.filter((evento) => { if (!opcoes.ignorarModulo && filtros.modulo !== '' && evento.tabela !== filtros.modulo) return false; if (filtros.acao !== '' && String(evento.acao).toUpperCase() !== filtros.acao) return false; if (filtros.responsavel !== '') { if (filtros.responsavel === 'sistema' …
  ```
- **calcularCamposAlterados(anteriores: Record<string, unknown> | null, novos: Record<string, unknown> | null, ignorados: readonly string[] = CAMPOS)** — `src/components/avaliacao/auditoriaFeedback.ts`
  ```
  if (!anteriores || !novos) return []; const chaves = Array.from(new Set([...Object.keys(anteriores), ...Object.keys(novos)])); return chaves .filter((k) => !ignorados.includes(k)) .filter((k) => JSON.stringify(anteriores[k] ?? null) !== JSON.stringify(novos[k] ?? null)) .sort();
  ```
- **validarRegistroAuditoria(registro: Partial<RegistroAuditoria>)** — `src/components/avaliacao/auditoriaFeedback.ts`
  ```
  const impedimentos: ImpedimentoAuditoria[] = []; if (!String(registro.registroId ?? '').trim()) impedimentos.push('registro_ausente'); if (!String(registro.tabela ?? '').trim()) impedimentos.push('tabela_ausente'); const campos = registro.camposAlterados ?? []; if (campos.length === 0) impedimentos.push('sem_campos_alterados'); // Todo campo declarado como alterado precisa existir no antes OU no depois. const divergentes = campos.filter( (c) => !(registro.dadosAnteriores && c in registro.dadosAn …
  ```
- **assinaturaFeedback(entrada: EntradaFeedbackForm)** — `src/components/avaliacao/criacaoFeedback.ts`
  ```
  const tipo = textoOuNulo(entrada?.tipo) ?? ''; return JSON.stringify([ textoOuNulo(entrada?.avaliado_id) ?? '', textoOuNulo(entrada?.avaliador_id) ?? '', textoOuNulo(entrada?.ciclo_id) ?? '', tipo.toLowerCase(), notaNaEscala(entrada?.nota_geral) ?? '', notaNaEscala(entrada?.potencial) ?? '', textoOuNulo(entrada?.pontos_fortes) ?? '', textoOuNulo(entrada?.pontos_melhoria) ?? '', textoOuNulo(entrada?.comentarios) ?? '', ]);
  ```
- **gerarIdOperacao()** — `src/components/avaliacao/criacaoFeedback.ts`
  ```
  const cripto = (globalThis as { crypto?: Crypto }).crypto; if (cripto && typeof cripto.randomUUID === 'function') return cripto.randomUUID(); return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  ```
- **validarEntradaFeedback(entrada: EntradaFeedbackForm)** — `src/components/avaliacao/criacaoFeedback.ts`
  ```
  const faltando: string[] = []; if (!textoOuNulo(entrada?.avaliado_id)) faltando.push('colaborador avaliado'); if (!textoOuNulo(entrada?.ciclo_id)) faltando.push('ciclo de avaliação'); const tipo = (textoOuNulo(entrada?.tipo) ?? '').toLowerCase(); if (!(TIPOS_FEEDBACK as readonly string[]).includes(tipo)) faltando.push('tipo do feedback'); if (notaNaEscala(entrada?.nota_geral) === null) faltando.push('nota de desempenho (escala de 0,5 a 5)'); return faltando.length === 0 ? { valida: true, faltand …
  ```
- **feedbackCancelado(status: unknown)** — `src/components/avaliacao/edicaoFeedback.ts`
  ```
  return ['cancelado', 'cancelada', 'cancel'].includes(chaveStatus(status));
  ```
- **normalizarFeedback(item: FeedbackDerivado, opcoes: OpcoesCanonicas = {})** — `src/components/avaliacao/feedbackCanonico.ts`
  ```
  const f = (item.feedback ?? {}) as Record<string, unknown>; const pendencia = opcoes.pendencia ?? null; const aprovacao = situacaoDaPendencia(pendencia); const gestorDaPendencia = nomeDeGestor(pendencia?.gestorResponsavel); const gestorDoVinculo = nomeDeGestor(opcoes.gestorResponsavel); const nota = Number(f?.nota_geral ?? 0); const potencialBruto = Number(f?.potencial ?? 0); const conteudo = { pontosFortes: campo(f?.pontos_fortes as string | null | undefined), pontosMelhoria: campo(f?.pontos_me …
  ```
- **tipoFeedback(tipo: unknown)** — `src/components/avaliacao/feedbacksComum.ts`
  ```
  const t = String(tipo ?? '') .trim() .toLowerCase(); if (t.includes('auto')) return 'auto'; if (t.includes('subordin')) return 'subordinado'; if (t.includes('par')) return 'par'; return 'gestor';
  ```
- **derivarFeedbacks(feedbacks: any[], contexto: ContextoFeedbacks & { ciclos?: any[] } = {})** — `src/components/avaliacao/feedbacksComum.ts`
  ```
  const { colaboradores = [], pdis = [], ciclos = [] } = contexto; return feedbacks.map((f) => { const nota = Number(f?.nota_geral ?? 0); const mesMs = inicioDoMes(f?.created_at); const avaliado = nomeDe(f?.avaliado, colaboradores, f?.avaliado_id); const avaliador = nomeDe(f?.avaliador, colaboradores, f?.avaliador_id); const local = localDe(colaboradores, f?.avaliado_id); const tipo = tipoFeedback(f?.tipo); return { feedback: f, tipo, segmento: segmentoDoTipo(f?.tipo), tipoRotulo: ROTULO_TIPO_FEED …
  ```
- **responsaveisDisponiveis(itens: MetaDerivada[])** — `src/components/avaliacao/metasComum.ts`
  ```
  const vistos = new Set<string>(); itens.forEach((i) => { if (i.responsavel && i.responsavel !== '—') vistos.add(i.responsavel); }); return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  ```
- **validacaoAplicavel(validacao: ValidacaoPotencial | null | undefined, atual: { versaoAvaliacao: string; empresaId: string | null; cicloId: s)** — `src/components/avaliacao/motorAvaliacao360.ts`
  ```
  if (!validacao) return false; if (!validacao.validadoPor || !validacao.validadoEm) return false; if (!validacao.versaoAvaliacao || !atual.versaoAvaliacao) return false; if (validacao.versaoAvaliacao !== atual.versaoAvaliacao) return false; if (validacao.empresaId !== atual.empresaId) return false; if (validacao.cicloId !== atual.cicloId) return false; return validacao.colaboradorId === atual.colaboradorId;
  ```
- **normalizarValidacaoPotencial(valor: unknown)** — `src/components/avaliacao/nineBox360.ts`
  ```
  const v = (valor ?? {}) as Record<string, unknown>; const texto = (x: unknown) => String(x ?? '').trim(); const versaoAvaliacao = texto(v.versaoAvaliacao ?? v.versao_avaliacao); const validadoPor = texto(v.validadoPor ?? v.validado_por); const validadoEm = texto(v.validadoEm ?? v.validado_em); const empresaId = texto(v.empresaId ?? v.empresa_id); const colaboradorId = texto(v.colaboradorId ?? v.colaborador_id); const feedbackId = texto(v.feedbackId ?? v.feedback_id); if (!versaoAvaliacao || !val …
  ```
- **rankingPontos(pontos: PontoNineBox[])** — `src/components/avaliacao/nineBoxComum.ts`
  ```
  return pontos .filter((p) => p.quadrante !== null && p.pontuacao !== null) .sort( (a, b) => (b.pontuacao as number) - (a.pontuacao as number) || (b.nota as number) - (a.nota as number) || a.nome.localeCompare(b.nome, 'pt-BR') );
  ```
- **avaliacaoElegivel(avaliacao: Pick<AvaliacaoNormalizada, 'colaboradorId' | 'nota' | 'potencial' | 'status'>, statusQueNaoConsolidam: readon)** — `src/components/avaliacao/nineBoxConsolidacao.ts`
  ```
  return ( avaliacao.colaboradorId !== null && notaNaEscala(avaliacao.nota) !== null && notaNaEscala(avaliacao.potencial) !== null && !statusQueNaoConsolidam.includes(avaliacao.status) );
  ```
- **classifyScore(score: number)** — `src/components/avaliacao/nineBoxConsolidacao.ts`
  ```
  if (score <= LIMIARES_CLASSIFICACAO.baixo) return 1; if (score <= LIMIARES_CLASSIFICACAO.medio) return 2; return 3;
  ```
- **validarInvariantes(consolidacoes: ConsolidacaoColaborador[])** — `src/components/avaliacao/nineBoxConsolidacao.ts`
  ```
  const vistos = new Set<string>(); const chavesDuplicadas: string[] = []; consolidacoes.forEach((c) => { const chave = `${c.empresaId ?? ''}|${c.cicloId ?? ''}|${c.colaboradorId}`; if (vistos.has(chave)) chavesDuplicadas.push(chave); vistos.add(chave); }); const classificados = consolidacoes.filter((c) => c.classificacao !== null); const naoClassificados = consolidacoes.filter((c) => c.status === 'incompleto').length; const semBase = consolidacoes.filter((c) => c.status === 'sem_base').length; // …
  ```
- **aplicarMockNineBox({ feedbacks, colaboradores, pdis, }: { feedbacks: unknown[]; colaboradores: ColaboradorNineBox[]; pdis: unknown[]; })** — `src/components/avaliacao/nineBoxMock.ts`
  ```
  feedbacks: unknown[]; colaboradores: ColaboradorNineBox[]; pdis: unknown[]
  ```
- **pdisEmAtencao(itens: PdiDerivado[])** — `src/components/avaliacao/pdiComum.ts`
  ```
  return itens.filter((i) => i.vencido || i.categoria === 'pendente');
  ```
- **validarPotencialAvaliacao(params: { feedbackId: string; idOperacao: string; observacao?: string | null })** — `src/components/avaliacao/servicoDemo.ts`
  ```
  const alvo = contexto.feedbackDe?.(params.feedbackId) ?? null; const colaboradorId = texto(alvo?.avaliado_id); const cicloId = texto(alvo?.ciclo_id); const alvoId = texto(params.feedbackId); const decisaoLocal = lerEstadoLocal().decisoes[chaveLocal(colaboradorId, cicloId)] ?? null; /** * A validação é ancorada na versão da AVALIAÇÃO DO GESTOR — a MESMA da * decisão de versão? NÃO: a decisão usa a versão do CONJUNTO e a validação * usa a versão canônica do feedback do gestor (`versao_avaliacao_fe …
  ```
- **validarTransicao({ statusAtual, acao, perfil, }: { statusAtual: unknown; acao: AcaoStatus; perfil: PerfilOperador; })** — `src/components/avaliacao/statusFeedback.ts`
  ```
  const base = { exigeBackend: true } as const; const status = normalizarStatus(statusAtual); if (status === 'desconhecido') { return { ...base, permitido: false, para: null, motivo: 'status_desconhecido', descricao: 'Status atual não reconhecido — regularize o registro antes de mudar o estado.', }; } const candidatas = TRANSICOES.filter((t) => t.de === status && t.acao === acao); if (candidatas.length === 0) { return { ...base, permitido: false, para: null, motivo: 'transicao_inexistente', descri …
  ```
- **validarConclusao(feedback: FeedbackParaValidar)** — `src/components/avaliacao/statusFeedback.ts`
  ```
  const impedimentos: ImpedimentoConclusao[] = []; const avisos: AvisoConclusao[] = []; const temAvaliado = String(feedback.avaliado_id ?? '').trim() !== ''; const temAvaliador = String(feedback.avaliador_id ?? '').trim() !== ''; const temCiclo = String(feedback.ciclo_id ?? '').trim() !== ''; if (!temAvaliado) impedimentos.push('avaliado_ausente'); if (!temAvaliador) impedimentos.push('avaliador_ausente'); if (!temCiclo) impedimentos.push('ciclo_ausente'); const desempenhoBruto = feedback.performa …
  ```
- **validarCancelamento({ motivo }: { motivo?: unknown })** — `src/components/avaliacao/statusFeedback.ts`
  ```
  const impedimentos: ImpedimentoCancelamento[] = []; const texto = String(motivo ?? '').trim(); if (texto === '') impedimentos.push('motivo_ausente'); else if (texto.length < MIN_CARACTERES_MOTIVO) impedimentos.push('motivo_curto'); return { podeCancelar: impedimentos.length === 0, impedimentos };
  ```
- **validarReabertura({ justificativa }: { justificativa?: unknown })** — `src/components/avaliacao/statusFeedback.ts`
  ```
  const impedimentos: ImpedimentoReabertura[] = []; const texto = String(justificativa ?? '').trim(); if (texto === '') impedimentos.push('justificativa_ausente'); else if (texto.length < MIN_CARACTERES_JUSTIFICATIVA) impedimentos.push('justificativa_curta'); return { podeReabrir: impedimentos.length === 0, impedimentos };
  ```
- **formatCurrency(v: number)** — `src/components/beneficios/BeneficiosDashboard.tsx`
  ```
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **formatCurrency(v: number | null)** — `src/components/colaborador-detalhes/BeneficiosTab.tsx`
  ```
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **valorAtual(campoId: string)** — `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx`
  ```
  edicoes[campoId] ?? valorSalvo[campoId] ?? '';
  ```
- **formatCurrency(v: number)** — `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx`
  ```
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **avaliarValidade(id: string, titulo: string, validade: string)** — `src/components/colaborador-detalhes/documentos/PrazosAlertasCard.tsx`
  ```
  const dataValidade = dataLocalDoEvento(validade); const dias = Math.round((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)); const validadeBR = dataValidade.toLocaleDateString('pt-BR'); if (dias < 0) { alertas.push({ id, titulo, sub: `Venceu em ${validadeBR}`, tone: 'destructive', badgeLabel: 'Vencido' }); } else if (dias <= DIAS_ALERTA_VALIDADE) { alertas.push({ id, titulo, sub: `Vence em ${dias} dia${dias === 1 ? '' : 's'} (${validadeBR})`, tone: 'warning', badgeLabel: 'Em bre …
  ```
- **formatCurrency(value: number, decimals = 0)** — `src/components/dashboard/MetricCard.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: decimals, maximumFractionDigits: decimals, }).format(value);
  ```
- **dataValida(valor?: string | null)** — `src/components/desligamentos/desligamentosDerivacoes.ts`
  ```
  if (!valor) return undefined; if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return parseDateLocalISO(valor); const data = new Date(valor); return Number.isNaN(data.getTime()) ? undefined : data;
  ```
- **formatCurrencyBRL(valor: number)** — `src/components/desligamentos/desligamentosDerivacoes.ts`
  ```
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  ```
- **formatarValor(chave: string, valor: unknown)** — `src/components/desligamentos/trilhaDerivacoes.ts`
  ```
  if (valor === null || valor === undefined || valor === '') return '—'; if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'; if (typeof valor === 'number') { if (CAMPOS_MOEDA.has(chave)) return formatCurrencyBRL(valor); if (CAMPOS_CONTAGEM.has(chave)) return `${valor} validado${valor === 1 ? '' : 's'}`; return valor.toLocaleString('pt-BR'); } if (typeof valor === 'string') { if (CAMPOS_DATA.has(chave)) return formatarData(valor); if (chave === 'status') return STATUS_LABELS[valor] ?? hum …
  ```
- **mesmoValorCru(a: unknown, b: unknown)** — `src/components/desligamentos/trilhaDerivacoes.ts`
  ```
  if (a === b) return true; try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); } catch { return false; }
  ```
- **iniciaisDoAutor(nome: string)** — `src/components/desligamentos/trilhaDerivacoes.ts`
  ```
  if (!nome) return '—'; const limpo = nome.includes('@') ? nome.split('@')[0] : nome; const partes = limpo.split(/[.\s_-]+/).filter(Boolean); if (partes.length === 0) return '—'; if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase(); const segunda = partes[1][0] ?? ''; return /[a-z0-9]/i.test(segunda) ? `${partes[0][0]}${segunda}`.toUpperCase() : partes[0].slice(0, 2).toUpperCase();
  ```
- **formatCurrency(val: number | string)** — `src/components/esocial/NaoPeriodicos.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  ```
- **formatCurrency(val: number)** — `src/components/esocial/Periodicos.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  ```
- **formatCurrency(val: number | string)** — `src/components/esocial/S2206AlteracaoContratual.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  ```
- **calcularDataFimFerias(dataInicio: string, diasGozo: number)** — `src/components/ferias/FeriasForm.tsx`
  ```
  if (!dataInicio || !Number.isFinite(diasGozo) || diasGozo < 1) return ''; return format(addDays(parseISO(dataInicio), diasGozo - 1), 'yyyy-MM-dd');
  ```
- **saldoDe(p: { id: string; dias_direito: number })** — `src/components/ferias/FeriasForm.tsx`
  ```
  p.dias_direito - (usoPorPeriodo.get(p.id)?.usado ?? 0);
  ```
- **calcularSeveridadePagamento(s: Ferias)** — `src/components/ferias/FeriasTable.tsx`
  ```
  if (s?.cancelado || s?.pagamento_confirmado_em) return null; const inicio = s?.data_inicio ? new Date(s.data_inicio) : null; if (!inicio || Number.isNaN(inicio.getTime())) return null; const dias = differenceInCalendarDays(inicio, new Date()); if (dias < 0) return null; if (dias <= 2) return { label: `Pgto D-${dias} (crítico)`, className: 'bg-destructive text-destructive-foreground border-destructive', }; if (dias <= 5) return { label: `Pgto D-${dias}`, className: 'bg-orange-500/15 text-orange-6 …
  ```
- **CalculoFolhaWizard({ competencia }: { competencia: string })** — `src/components/folha/CalculoFolhaWizard.tsx`
  ```
  const { empresaAtualId } = useEmpresas(); const [isOpen, setIsOpen] = useState(false); const [currentStep, setCurrentStep] = useState(1); const [isProcessing, setIsProcessing] = useState(false); const [currentFolhaId, setCurrentFolhaId] = useState<string | null>(null); const [resultadoCalculo, setResultadoCalculo] = useState<CalculoResultado | null>(null); const { executarCalculoLote, progressoLote } = useCalculoFolha(); const queryClient = useQueryClient(); // Queries for validation const { dat …
  ```
- **formatCurrency(value: number)** — `src/components/folha/FolhaComposicao.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  ```
- **formatCurrency(value: number)** — `src/components/folha/FolhaKPIs.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  ```
- **formatCurrency(value: number)** — `src/components/folha/HistoricoSimulacoesDialog.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  ```
- **formatCurrency(value: number)** — `src/components/folha/Simulador13Dialog.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  ```
- **formatCurrency(value: number)** — `src/components/folha/SimuladorWhatIf.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  ```
- **calcularImpacto()** — `src/components/folha/SimuladorWhatIf.tsx`
  ```
  setLoading(true); const salario = parseFloat(form.salario) || 0; const inss = salario * (parseFloat(form.percentualInssPatronal) / 100); const fgts = salario * (parseFloat(form.percentualFgts) / 100); const rat = salario * (parseFloat(form.percentualRat) / 100); const terceiros = salario * (parseFloat(form.percentualTerceiros) / 100); const provisaoFerias = (salario * 1.3333) / 12; const provisao13 = salario / 12; const encargosProvisoes = (provisaoFerias + provisao13) * ((parseFloat(form.percen …
  ```
- **GerarLinkCienciaDialog({ medidaId, colaboradorNome, open, onOpenChange, }: GerarLinkCienciaDialogProps)** — `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx`
  ```
  const [gerando, setGerando] = useState(false); const [link, setLink] = useState<LinkGerado | null>(null); const [copiado, setCopiado] = useState(false); async function gerar() { if (!medidaId) return; setGerando(true); try { const { data, error } = await supabase.rpc('medida_gerar_link_ciencia', { p_medida_id: medidaId, }); if (error) throw error; const res = data as unknown as { success: boolean; token: string; url_path: string; expires_at: string }; if (!res?.success) throw new Error('Não foi …
  ```
- **gerar()** — `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx`
  ```
  if (!medidaId) return; setGerando(true); try { const { data, error } = await supabase.rpc('medida_gerar_link_ciencia', { p_medida_id: medidaId, }); if (error) throw error; const res = data as unknown as { success: boolean; token: string; url_path: string; expires_at: string }; if (!res?.success) throw new Error('Não foi possível gerar o link.'); setLink({ token: res.token, url: `${window.location.origin}${res.url_path}`, expires_at: res.expires_at, }); } catch (e) { toast.error(safeErrorMessage( …
  ```
- **invalidar()** — `src/components/medidas-disciplinares/MedidasKanban.tsx`
  ```
  qc.invalidateQueries({ queryKey: ['medidas-kanban', empresaAtual?.id] });
  ```
- **formatCurrency(v: number)** — `src/components/obrigacoes/DarfTab.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  ```
- **formatCurrency(v: number)** — `src/components/obrigacoes/DeclaracoesTable.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  ```
- **formatCurrency(v: number)** — `src/components/obrigacoes/GuiasTable.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  ```
- **GerarAEJDialog()** — `src/components/ponto/GerarAEJDialog.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [inicio, setInicio] = useState(''); const [fim, setFim] = useState(''); const [resultado, setResultado] = useState<{ hash: string; bytes: number; marcacoes: number; colaboradores: number; sem_pis: number; } | null>(null); const handleGerar = async () => { if (!empresaAtual?.id) return toast.error('Selecione uma empresa'); if (!inicio || !fim) return toast.error('I …
  ```
- **GerarAFDDialog()** — `src/components/ponto/GerarAFDDialog.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [inicio, setInicio] = useState(''); const [fim, setFim] = useState(''); const [resultado, setResultado] = useState<{ hash: string; bytes: number; marcacoes: number; colaboradores: number; sem_pis: number; } | null>(null); const handleGerar = async () => { if (!empresaAtual?.id) return toast.error('Selecione uma empresa'); if (!inicio || !fim) return toast.error('I …
  ```
- **Valor({ rotulo, valor }: { rotulo: string; valor: number | null })** — `src/components/premiacoes/AuditoriaEventoDialog.tsx`
  ```
  return ( <div> <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{rotulo}</dt> <dd className="mt-0.5 text-xs font-medium tabular-nums">{valor === null ? '—' : formatCurrency(valor)}</dd> </div> );
  ```
- **ValorEvento({ evento, compacto = false }: { evento: EventoAuditoria; compacto?: boolean })** — `src/components/premiacoes/AuditoriaTab.tsx`
  ```
  const temTransicao = evento.valorAnterior !== null && evento.valorPosterior !== null && evento.valorAnterior !== evento.valorPosterior; if (temTransicao) { return ( <div className={cn('min-w-0', compacto && 'text-right')}> <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold tabular-nums"> <span className="text-muted-foreground line-through">{formatCurrency(evento.valorAnterior)}</span> <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" /> <span>{fo …
  ```
- **invalidar()** — `src/components/premiacoes/PagamentosTab.tsx`
  ```
  CHAVES.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  ```
- **valor(v: number | string | null | undefined)** — `src/components/premiacoes/PagamentosTabela.tsx`
  ```
  (v ? formatCurrency(Number(v)) : '—');
  ```
- **aplicarCenario(s: CenarioROI)** — `src/components/premiacoes/RewardsSimulator.tsx`
  ```
  setEmployees(s.configuracoes.employees ?? 0); setAvgSalary(s.configuracoes.avgSalary ?? 0); setBonusPercent(s.configuracoes.bonusPercent ?? 0); setPerformanceLevel(s.configuracoes.performanceLevel ?? 0); setRetentionImpact(s.configuracoes.retentionImpact ?? 0); setCenarioAtual(s.id); toast.info(`Cenário "${nomeDoCenario(s)}" carregado.`);
  ```
- **valorDoCenario(s: CenarioROI, chave: LinhaChave)** — `src/components/premiacoes/RewardsSimulator.tsx`
  ```
  switch (chave) { case 'totalBudget': return s.resultados.totalBudget ?? 0; case 'savings': return s.resultados.savings ?? 0; case 'roi': return s.resultados.roi ?? 0; case 'resultadoLiquido': return (s.resultados.savings ?? 0) - (s.resultados.totalBudget ?? 0); default: return s.configuracoes[chave] ?? 0; }
  ```
- **valorBase(chave: LinhaChave)** — `src/components/premiacoes/RewardsSimulator.tsx`
  ```
  switch (chave) { case 'totalBudget': return totalBudget; case 'savings': return savings; case 'roi': return roi; case 'resultadoLiquido': return resultadoLiquido; default: return valores[chave]; }
  ```
- **formatarValor(v: number, unit: ScenarioParameterUnit)** — `src/components/premiacoes/ScenarioParameterCard.tsx`
  ```
  if (unit === 'currency') return numero(v, 2); if (unit === 'percentage') return numero(v, Number.isInteger(v) ? 0 : 1); return numero(v, 0);
  ```
- **converterNumero(texto: string)** — `src/components/premiacoes/ScenarioParameterCard.tsx`
  ```
  let s = texto.trim().replace(/\s/g, '').replace(/^R\$/i, ''); if (!s) return null; let negativo = false; if (s.startsWith('-')) { negativo = true; s = s.slice(1); } if (!/^[\d.,]+$/.test(s)) return null; if (s.includes(',')) { s = s.replace(/\./g, '').replace(',', '.'); } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) { s = s.replace(/\./g, ''); } if (!/^\d+(\.\d+)?$/.test(s)) return null; const n = Number(s); if (!Number.isFinite(n)) return null; return negativo ? -n : n;
  ```
- **arredondar(v: number, casas: number)** — `src/components/premiacoes/ScenarioParameterCard.tsx`
  ```
  const fator = 10 ** casas; return Math.round(v * fator) / fator;
  ```
- **primeiroValor(...fontes: unknown[])** — `src/components/premiacoes/auditoriaComum.ts`
  ```
  for (const fonte of fontes) { const obj = objeto(fonte); if (!obj) continue; for (const campo of CAMPOS_VALOR) { const n = numero(obj[campo]); if (n !== null) return n; } } return null;
  ```
- **valorCitado(motivo: string)** — `src/components/premiacoes/auditoriaComum.ts`
  ```
  const achado = motivo.match(/R\$\s*([\d.]+(?:,\d{2})?)/i); return achado ? numero(achado[1]) : null;
  ```
- **valorDoPagamento(p: PagamentoHub)** — `src/components/premiacoes/pagamentosComum.ts`
  ```
  return numero(p.valor_folha_real) || numero(p.valor_aprovado) || numero(p.valor_calculado);
  ```
- **valorParaGravar(p: PagamentoHub, proximoStatus: string)** — `src/components/premiacoes/pagamentosComum.ts`
  ```
  if (proximoStatus === 'rejeitado') return 0; if (proximoStatus === STATUS_REINICIO_PAGAMENTO) return numero(p.valor_calculado); return numero(p.valor_aprovado) || numero(p.valor_calculado);
  ```
- **podeRejeitarPagamento(status: string)** — `src/components/premiacoes/pagamentosComum.ts`
  ```
  return status !== 'rejeitado' && status !== 'pago';
  ```
- **podeConciliarPagamento(status: string)** — `src/components/premiacoes/pagamentosComum.ts`
  ```
  return status === 'aprovado_financeiro' || status === 'divergente_em_revisao';
  ```
- **iniciaisDe(nome: string | null | undefined)** — `src/components/premiacoes/premiacoesComum.ts`
  ```
  const partes = String(nome ?? '') .trim() .split(/\s+/) .filter(Boolean); if (partes.length === 0) return '?'; if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase(); return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  ```
- **maisAntigo(lista: PagamentoHub[])** — `src/components/premiacoes/premiacoesComum.ts`
  ```
  
  ```
- **calcularMetricas(p: ParametrosRoi)** — `src/components/premiacoes/simuladorRoiComum.ts`
  ```
  const totalBudget = p.employees * p.avgSalary * (p.bonusPercent / 100) * (p.performanceLevel / 100); const custoReposicao = p.avgSalary * PREMISSAS_ROI.salariosPorReposicao * p.employees * PREMISSAS_ROI.turnoverBase; const savings = custoReposicao * (p.retentionImpact / 100); const roi = totalBudget > 0 ? savings / totalBudget : 0; const retidos = p.employees * (p.retentionImpact / 100); const resultadoLiquido = savings - totalBudget; return { totalBudget, custoReposicao, savings, roi, resultado …
  ```
- **aplicarFiltros(patch: Partial<FiltrosCandidatos>)** — `src/components/recrutamento/CandidatosPainel.tsx`
  ```
  setFiltros((atual) => ({ ...atual, ...patch })); setPagina(1); setSelecionados(new Set());
  ```
- **dataValida(valor: string | null | undefined)** — `src/components/recrutamento/analyticsComum.ts`
  ```
  if (!valor) return null; const data = new Date(valor); return Number.isNaN(data.getTime()) ? null : data;
  ```
- **arredondar(valor: number, casas = 1)** — `src/components/recrutamento/analyticsComum.ts`
  ```
  const fator = 10 ** casas; return Math.round(valor * fator) / fator + 0;
  ```
- **taxaConversaoDaJanela(candidaturas: CandidaturaComRelacoes[], referencia: Date, deslocamento = 0)** — `src/components/recrutamento/analyticsComum.ts`
  ```
  const daJanela = candidaturas.filter((candidatura) => { const criada = dataValida(candidatura.created_at); if (!criada) return false; const fim = inicioDoDia(referencia) + DIA_MS - deslocamento * JANELA_COMPARACAO_DIAS * DIA_MS; const inicio = fim - JANELA_COMPARACAO_DIAS * DIA_MS; return criada.getTime() >= inicio && criada.getTime() < fim; }); if (daJanela.length === 0) return null; return arredondar((daJanela.filter(ehContratada).length / daJanela.length) * 100);
  ```
- **podeArrastarCandidatura(status: string | null | undefined)** — `src/components/recrutamento/pipelineDragDrop.ts`
  ```
  const normalizado = (status ?? '').trim().toLowerCase(); return !STATUS_FORA_DO_FLUXO.includes(normalizado as (typeof STATUS_FORA_DO_FLUXO)[number]);
  ```
- **iniciaisDoNome(nome: string | null | undefined)** — `src/components/recrutamento/pipelineEtapas.ts`
  ```
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean); if (partes.length === 0) return '?'; if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase(); return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  ```
- **perfisDoUsuario(userId: string)** — `src/components/settings/UserRolesTab.tsx`
  ```
  new Set(roles.filter((x) => x.user_id === userId).map((x) => x.role));
  ```
- **GerarLtcatOsButton()** — `src/components/sst/GerarLtcatOsButton.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [tipo, setTipo] = useState<'os' | 'ltcat'>('os'); const [form, setForm] = useState({ titulo: '', responsavel_nome: '', responsavel_registro: '', responsavel_tipo: 'engenheiro' as 'engenheiro' | 'medico', descricao: '', conclusao: '', }); const handleGerar = async () => { if (!empresaAtual?.id) { toast.error('Selecione uma empresa'); return; } if (!form.titulo || ! …
  ```
- **GerarPgrButton()** — `src/components/sst/GerarPgrButton.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [responsavel, setResponsavel] = useState(''); const [registro, setRegistro] = useState(''); const { data: programas } = useQuery({ queryKey: ['sst-programas-pgr', empresaAtual?.id], enabled: !!empresaAtual?.id && open, queryFn: async () => { const { data, error } = await supabase .from('sst_programas') .select('id, versao, data_emissao, data_validade, status, hash_sha256, arquivo_u …
  ```
- **iniciaisColaborador(nome: string)** — `src/components/treinamentos/TreinamentoParticipantes.tsx`
  ```
  const partes = nome.trim().split(/\s+/).filter(Boolean); if (partes.length === 0) return '?'; if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase(); return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  ```
- **textoValidade(situacao: SituacaoRealCertificado, validade: Date | null)** — `src/components/treinamentos/certificadosDerivacoes.ts`
  ```
  if (situacao === 'vitalicio') return 'Vitalício'; if (situacao === 'sem_validade' || !validade) return 'Validade não informada'; return formatarDataTreinamento( `${validade.getFullYear()}-${String(validade.getMonth() + 1).padStart(2, '0')}-${String( validade.getDate() ).padStart(2, '0')}` );
  ```
- **detalheValidade(situacao: SituacaoRealCertificado, dias: number | null)** — `src/components/treinamentos/certificadosDerivacoes.ts`
  ```
  if (dias === null) return null; if (situacao === 'a_vencer') return dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias === 1 ? '' : 's'}`; if (situacao === 'vencido') { const abs = Math.abs(dias); return `Vencido há ${abs} dia${abs === 1 ? '' : 's'}`; } return null;
  ```
- **calcularMetricasTrilha(vinculos: readonly TrilhaCursoVinculo[])** — `src/components/treinamentos/trilhasDerivacoes.ts`
  ```
  const unicos = new Map<string, TrilhaCursoVinculo>(); for (const vinculo of vinculos) { if (!unicos.has(vinculo.curso_id)) unicos.set(vinculo.curso_id, vinculo); } let horas = 0; let comCarga = 0; for (const vinculo of unicos.values()) { const carga = cargaHorariaNumerica(vinculo.curso?.carga_horaria); if (carga !== null) { horas += carga; comCarga += 1; } } return { cursos: unicos.size, horas, horasCompletas: unicos.size > 0 && comCarga === unicos.size, horasDisponiveis: comCarga > 0, };
  ```
- **calcularOcupacaoTurma(inscritos: number | string | null | undefined, capacidade: number | null)** — `src/components/treinamentos/turmasDerivacoes.ts`
  ```
  if (!capacidade || capacidade <= 0) return null; if (inscritos === null || inscritos === undefined || inscritos === '') return null; const total = typeof inscritos === 'number' ? inscritos : Number(String(inscritos).replace(',', '.')); if (!Number.isFinite(total) || total < 0) return null; return { inscritos: total, capacidade, percentual: Math.round((total / capacidade) * 100) };
  ```
- **validateCNPJ(cnpj: string)** — `src/components/ui/cnpj-input.tsx`
  ```
  const cleaned = cnpj.replace(/\D/g, ''); if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) return false; const calc = (x: number) => { const slice = cleaned.slice(0, x); let factor = x - 7, sum = 0; for (let i = x; i >= 1; i--) { sum += parseInt(slice[x - i]) * factor--; if (factor < 2) factor = 9; } const result = 11 - (sum % 11); return result > 9 ? 0 : result; }; return calc(12) === parseInt(cleaned[12]) && calc(13) === parseInt(cleaned[13]);
  ```
- **calc(x: number)** — `src/components/ui/cnpj-input.tsx`
  ```
  const slice = cleaned.slice(0, x); let factor = x - 7, sum = 0; for (let i = x; i >= 1; i--) { sum += parseInt(slice[x - i]) * factor--; if (factor < 2) factor = 9; } const result = 11 - (sum % 11); return result > 9 ? 0 : result;
  ```
- **validateCPF(cpf: string)** — `src/components/ui/cpf-input.tsx`
  ```
  const cleaned = cpf.replace(/\D/g, ''); // Rejeita tamanho inválido ou todos os dígitos iguais (ex.: 111.111.111-11). if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i); let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== parseInt(cleaned[9])) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i); let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0; retur …
  ```
- **formatCurrency(value: number)** — `src/components/ui/currency-input.tsx`
  ```
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **invalidate()** — `src/hooks/useAdmissoes.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['admissoes', empresaId] });
  ```
- **calcular(dados: Dados13Salario)** — `src/hooks/useCalcular13Salario.ts`
  ```
  setLoading(true); setResultado(null); try { const { data, error } = await supabase.functions.invoke('calcular-13-salario', { body: dados, }); if (error) throw error; if (!data?.success) throw new Error(data?.error || 'Erro no cálculo'); setResultado(data.resultado); toast.success(`13º Salário (${dados.parcela}ª parcela) calculado!`); return data.resultado; } catch (err) { // Prefixo de contexto ajuda o usuário a saber qual operação falhou. toast.error(`Erro ao calcular 13º: ${safeErrorMessage(er …
  ```
- **useValoresCamposCustomizados(colaboradorId?: string)** — `src/hooks/useColaboradorDetalhes.ts`
  ```
  return useQuery({ queryKey: ['valores-campos-customizados', colaboradorId], queryFn: () => service.obterValoresCamposCustomizados(colaboradorId!), enabled: !!colaboradorId, });
  ```
- **invalidate()** — `src/hooks/useContratoTemplates.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['contrato-templates'] });
  ```
- **invalidateAll()** — `src/hooks/useContratosAssinaturaKPI.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['contratos-assinatura-kpi'] }); queryClient.invalidateQueries({ queryKey: ['contratos-tokens-pendentes'] });
  ```
- **invalidate()** — `src/hooks/useESocial.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['esocial-eventos'] }); queryClient.invalidateQueries({ queryKey: ['esocial-stats'] });
  ```
- **invalidate()** — `src/hooks/useFeriasAprovacao.ts`
  ```
  qc.invalidateQueries({ queryKey: ['ferias', empresaId] });
  ```
- **formatCurrency(v: number | null | undefined)** — `src/hooks/useHistoricoColaborador.ts`
  ```
  if (v === null || v === undefined) return '—'; return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **computeSessionFingerprint()** — `src/hooks/useSecurityMonitor.ts`
  ```
  const components = [ navigator.userAgent, navigator.language, `${screen.width}x${screen.height}x${screen.colorDepth}`, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.hardwareConcurrency?.toString() || '', ]; let hash = 0; const str = components.join('|'); for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0; } return hash.toString(36);
  ```
- **invalidarCapasDeTreinamento(queryClient: QueryClient, empresaId?: string | null)** — `src/hooks/useTrainingImages.ts`
  ```
  return queryClient.invalidateQueries({ queryKey: trainingImagesQueryKey(empresaId) });
  ```
- **invalidate()** — `src/hooks/ferias/useProgramacaoFerias.ts`
  ```
  qc.invalidateQueries({ queryKey: ['ferias-programacao', empresaId, ano] });
  ```
- **validateCPF(cpf: string)** — `src/lib/masks.ts`
  ```
  const cleaned = cpf.replace(/\D/g, ''); if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i), 10) * (10 - i); let rest = 11 - (sum % 11); if (rest === 10 || rest === 11) rest = 0; if (rest !== parseInt(cleaned.charAt(9), 10)) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i), 10) * (11 - i); rest = 11 - (sum % 11); if (rest === 10 || rest === 11) rest = 0; return res …
  ```
- **validatePIS(pis: string)** — `src/lib/masks.ts`
  ```
  const cleaned = pis.replace(/\D/g, ''); if (cleaned.length !== 11) return false; const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i), 10) * weights[i]; const rest = 11 - (sum % 11); const digit = rest === 10 || rest === 11 ? 0 : rest; return digit === parseInt(cleaned.charAt(10), 10);
  ```
- **validateRG(rg: string)** — `src/lib/masks.ts`
  ```
  const cleaned = rg.replace(/\D/g, ''); return cleaned.length >= 5 && cleaned.length <= 14;
  ```
- **validateTituloEleitor(titulo: string)** — `src/lib/masks.ts`
  ```
  const cleaned = titulo.replace(/\D/g, ''); return cleaned.length === 12;
  ```
- **validateCNH(cnh: string)** — `src/lib/masks.ts`
  ```
  const cleaned = cnh.replace(/\D/g, ''); return cleaned.length === 11;
  ```
- **validateCNPJ(cnpj: string)** — `src/lib/masks.ts`
  ```
  const cleaned = cnpj.replace(/\D/g, ''); if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) return false; let sum = 0; const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; for (let i = 0; i < 12; i++) sum += parseInt(cleaned.charAt(i), 10) * w1[i]; let rest = sum % 11 < 2 ? 0 : 11 - (sum % 11); if (rest !== parseInt(cleaned.charAt(12), 10)) return false; sum = 0; const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; for (let i = 0; i < 13; i++) sum += parseInt(cleaned.charAt(i), 10) * w2[i]; r …
  ```
- **invalidateQueries(key: string | string[])** — `src/lib/queryClient.ts`
  ```
  queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
  ```
- **gerarReciboAssinaturaPDF(data: ReciboAssinaturaData)** — `src/lib/reciboAssinaturaPdf.ts`
  ```
  const url = `${data.origin}/verificar-contrato/${data.hash}`; const qrDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 320, }); const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const pageW = doc.internal.pageSize.getWidth(); // Cabeçalho doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 28, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Recibo de Assinatura Eletrônica', pageW / 2, 12, { align: 'cen …
  ```
- **computeDelay(attempt: number, baseDelayMs: number, maxDelayMs: number, jitterRatio: number, retryAfterSeconds?: number)** — `src/lib/retry.ts`
  ```
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) { return Math.min(retryAfterSeconds * 1000, maxDelayMs); } const exponential = baseDelayMs * Math.pow(2, attempt - 1); const jitter = exponential * jitterRatio * (Math.random() * 2 - 1); return Math.min(Math.max(exponential + jitter, 0), maxDelayMs);
  ```
- **generateId()** — `src/lib/utils.ts`
  ```
  return Math.random().toString(36).substring(2, 9);
  ```
- **mockFormatCurrency(v: number | null | undefined)** — `src/mocks/colaboradoresMock.ts`
  ```
  if (v === null || v === undefined) return '—'; return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **invalidarDemo()** — `src/pages/AvaliacaoPage.tsx`
  ```
  qc.invalidateQueries({ queryKey: [CHAVE_DEMO] });
  ```
- **formatCurrency(v: number | null)** — `src/pages/BeneficiosPage.tsx`
  ```
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **CalculadoraRescisaoPage()** — `src/pages/CalculadoraRescisaoPage.tsx`
  ```
  const { user } = useAuth(); const { empresaAtual } = useEmpresas(); const [loadingColab, setLoadingColab] = useState(false); const [selectedColabId, setSelectedColabId] = useState<string | undefined>(undefined); useDataAccessLog('colaboradores', selectedColabId, empresaAtual?.id); const [form, setForm] = useState({ nomeColaborador: '', cpf: '', cargo: '', salario: '', dataAdmissao: '', dataDesligamento: '', tipo: 'sem_justa_causa', avisoTrabalhado: false, feriasVencidas: false, saldoFGTS: '', di …
  ```
- **formatCurrency(v: number | null)** — `src/pages/CargosPage.tsx`
  ```
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **gerarLancamentos()** — `src/pages/ContabilidadePage.tsx`
  ```
  if (!selectedFolha) { toast.warning('Selecione uma folha de pagamento'); return; } try { setProcessing(true); await contabilidadeService.gerarLancamentosFolha(empresaAtual!.id, selectedFolha); toast.success('Lançamentos contábeis gerados com sucesso'); loadData(); } catch (error) { toast.error(safeErrorMessage(error, 'Erro ao gerar lançamentos contábeis.')); } finally { setProcessing(false); }
  ```
- **formatCurrency(val: number)** — `src/pages/ContabilidadePage.tsx`
  ```
  
  ```
- **formatCurrency(value: number)** — `src/pages/DashboardPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0, }).format(value);
  ```
- **DescontosPage()** — `src/pages/DescontosPage.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const qc = useQueryClient(); const [activeTab, setActiveTab] = useState('emprestimos'); const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores-descontos', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase .from('colaboradores') .select('id, nome_completo') .eq('empresa_id', empresaAtual?.id as string) .eq('status', 'ativo'); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id, }); cons …
  ```
- **generateCNAB()** — `src/pages/FinanceiroBancarioPage.tsx`
  ```
  if (!selectedFolha) { toast.warning('Selecione uma folha de pagamento'); return; } if (!config) { toast.error('Configure os dados bancários primeiro'); setConfigDialogOpen(true); return; } try { setGenerating(true); const content = await cnabService.generateCNAB240(empresaAtual!.id, selectedFolha); // Download file const blob = new Blob([content], { type: 'text/plain' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `REMESSA_${co …
  ```
- **generatePix()** — `src/pages/FinanceiroBancarioPage.tsx`
  ```
  if (!selectedFolha) { toast.warning('Selecione uma folha de pagamento'); return; } try { setGenerating(true); const content = await cnabService.generatePIXBatch(empresaAtual!.id, selectedFolha); // Download CSV const blob = new Blob([content], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `PIX_LOTE_${todayLocalISO()}.csv`; a.click(); // Trilha LGPD — o lote carrega chaves PIX de toda a folha. void registrarA …
  ```
- **formatCurrency(val: number)** — `src/pages/FinanceiroBancarioPage.tsx`
  ```
  
  ```
- **gerarCompetencias()** — `src/pages/FolhaPagamentoPage.tsx`
  ```
  const competencias: string[] = []; const hoje = new Date(); for (let i = -12; i <= 2; i++) { const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1); const mes = String(data.getMonth() + 1).padStart(2, '0'); competencias.push(`${mes}/${data.getFullYear()}`); } return competencias.reverse();
  ```
- **calcularFolhaServidor()** — `src/pages/FolhaPagamentoPage.tsx`
  ```
  const empresaId = empresaAtual?.id; if (!empresaId) { toast.error('Selecione uma empresa antes de calcular a folha.'); return; } setCalcServidor(true); const [mes, ano] = competencia.split('/'); const compServer = `${ano}-${mes}`; const intent = `calcular-folha:${empresaId}:${compServer}`; try { await edgeFunctionsService.calcularFolha({ empresaId, competencia: compServer, idempotencyKey: idemKey(intent), }); idemReset(intent); // sucesso → habilita nova operação legítima queryClient.invalidateQ …
  ```
- **formatCurrency(value: number)** — `src/pages/FolhaPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
  ```
- **gerarPDF(template: string, colaborador: Pick<Tables<'colaboradores'>, 'nome_completo' | 'cpf' | 'cargo' | 'salario_base' | 'data_)** — `src/pages/GeradorDocumentosPage.tsx`
  ```
  const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); const margin = 20; let y = 25; // Header doc.setFontSize(10); doc.setTextColor(100); doc.text(empresa?.razao_social || 'Empresa', margin, y); doc.text(`CNPJ: ${empresa?.cnpj || '—'}`, margin, y + 5); y += 20; doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 15; const nome = colaborador?.nome_completo || '____________________'; const cpf = colaborador?.cpf || '______ …
  ```
- **formatCurrency(value: number)** — `src/pages/HoleritesPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
  ```
- **aplicarNoColaborador(colaboradorId: string, patch: Updatable<'colaboradores'>)** — `src/pages/MovimentacoesPage.tsx`
  ```
  const { data, error } = await supabase .from('colaboradores') .update(patch) .eq('id', colaboradorId) .eq('empresa_id', empresaAtual!.id) .select('id'); if (error) throw error; if (!data || data.length === 0) throw new Error('Sem permissão para atualizar o cadastro do colaborador.');
  ```
- **formatCurrency(v: number)** — `src/pages/ObrigacoesFiscaisPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  ```
- **gerarCompetencias()** — `src/pages/ObrigacoesFiscaisPage.tsx`
  ```
  const items: string[] = []; const hoje = new Date(); for (let i = -6; i <= 1; i++) { const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1); items.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`); } return items.reverse();
  ```
- **gerarGuiasServidor()** — `src/pages/ObrigacoesFiscaisPage.tsx`
  ```
  if (!empresaAtual?.id) return; setGerandoServidor(true); try { const [mes, ano] = competencia.split('/'); // gerarGuias devolve o RetryResult de retryWithIdempotency: o corpo da edge vem em `.data`. const { data: r } = (await edgeFunctionsService.gerarGuias({ empresaId: empresaAtual.id, competencia: `${ano}-${mes}`, tipo: 'todos', })) as { data?: { guias?: unknown[]; duplicatas_bloqueadas?: string[]; nao_persistidas?: { tipo: string }[]; } | null; }; qc.invalidateQueries({ queryKey: ['guias-fgts …
  ```
- **totalDoChip(valor: ChipAtivo | ChipConcluido)** — `src/pages/OnboardingPage.tsx`
  ```
  baseFiltrada.filter((l) => combinaChip(l, valor)).length;
  ```
- **calcFerias(salario: number, admissao: string, ultimaFim: string | null, hoje: Date)** — `src/pages/PassivoTrabalhistaPage.tsx`
  ```
  const admiss = new Date(admissao); const ultFim = ultimaFim ? new Date(ultimaFim) : null; const periodoInicio = ultFim ? new Date(ultFim.getTime() + 86400000) : admiss; const vencimento = addMonths(periodoInicio, 12); const diasDecorridos = differenceInDays(vencimento, hoje); const vencidas = Math.max(0, -diasDecorridos); const direito = Math.min(vencidas, 30); const vf = (salario / 30) * direito; const tc = vf * TERCO; return { dias: vencidas, vf, tc, vencimento };
  ```
- **calc13(salario: number, admissao: string, hoje: Date)** — `src/pages/PassivoTrabalhistaPage.tsx`
  ```
  const iniAno = new Date(hoje.getFullYear(), 0, 1); const ini = new Date(admissao) > iniAno ? new Date(admissao) : iniAno; const meses = Math.min(12, Math.max(1, differenceInMonths(hoje, ini) + 1)); return salario * (meses / 12);
  ```
- **formatCurrency(v: number)** — `src/pages/PassivoTrabalhistaPage.tsx`
  ```
  
  ```
- **calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number)** — `src/pages/PontoPage.tsx`
  ```
  const R = 6371e3; // metres const φ1 = (lat1 * Math.PI) / 180; const φ2 = (lat2 * Math.PI) / 180; const Δφ = ((lat2 - lat1) * Math.PI) / 180; const Δλ = ((lon2 - lon1) * Math.PI) / 180; const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c; // in metres
  ```
- **formatCurrency(value: number)** — `src/pages/ProvisoesPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **gerarCertificadoPdf(cert: CertificadoComJoins, empresaNome?: string)** — `src/pages/TreinamentosPage.tsx`
  ```
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const cx = doc.internal.pageSize.getWidth() / 2; doc.setDrawColor(60); doc.setLineWidth(1.2); doc.rect(12, 12, doc.internal.pageSize.getWidth() - 24, doc.internal.pageSize.getHeight() - 24); doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.text('CERTIFICADO', cx, 45, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.text('Certificamos que', cx, 65, { align: 'center' }); doc.s …
  ```
- **podeEditarCat(c: CatEnvio)** — `src/pages/adminCatEdicao.ts`
  ```
  return c.status_esocial === 'pendente' && !c.protocolo_esocial && !c.data_envio_esocial;
  ```
- **validateInput(schema: z.ZodType, payload: object, contexto: string)** — `src/schemas/validate.ts`
  ```
  // {} passa por qualquer .partial() sem campo obrigatório — um update/insert // vazio nunca escreve nada útil e esconde bug no caller. if (Object.keys(payload).length === 0) { throw new Error(`${contexto}: payload vazio — nenhum campo informado`); } // Payload completo (todas as chaves obrigatórias presentes): roda o schema // INTEIRO — refinamentos cross-field (ex.: data_inicio < data_fim no // feriasSchema) só existem no schema original; o .partial() os descarta. const raw = shapeOf(schema); i …
  ```
- **cpfValido(cpf: string | null | undefined, campo: string, errors: ValidationError[])** — `src/schemas/esocial/helpers.ts`
  ```
  if (!cpf) return; const clean = cpf.replace(/\D/g, ''); if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) { errors.push({ campo, mensagem: 'CPF inválido', regra: 'REGRA_CPF' }); return; } let s = 0; for (let i = 0; i < 9; i++) s += parseInt(clean[i], 10) * (10 - i); let d = 11 - (s % 11); if (d >= 10) d = 0; if (parseInt(clean[9], 10) !== d) { errors.push({ campo, mensagem: 'CPF inválido', regra: 'REGRA_CPF' }); return; } s = 0; for (let i = 0; i < 10; i++) s += parseInt(clean[i], 10) * (11 - …
  ```
- **cnpjValido(cnpj: string | null | undefined, campo: string, errors: ValidationError[])** — `src/schemas/esocial/helpers.ts`
  ```
  if (!cnpj) return; const clean = cnpj.replace(/\D/g, ''); if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) { errors.push({ campo, mensagem: 'CNPJ inválido', regra: 'REGRA_CNPJ' }); return; } const pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2]; const pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]; let s = 0; for (let i = 0; i < 12; i++) s += parseInt(clean[i], 10) * pesos1[i]; let d = s % 11 < 2 ? 0 : 11 - (s % 11); if (parseInt(clean[12], 10) !== d) { errors.push({ campo, mensagem: 'CNPJ inválido', regra: 'REGRA_ …
  ```
- **dataValida(val: string | null | undefined, campo: string, errors: ValidationError[])** — `src/schemas/esocial/helpers.ts`
  ```
  if (!val) return; const d = new Date(val); if (isNaN(d.getTime())) errors.push({ campo, mensagem: 'Data inválida', regra: 'REGRA_DATA' });
  ```
- **enumValido(val: string | null | undefined, opcoes: string[], campo: string, errors: ValidationError[])** — `src/schemas/esocial/helpers.ts`
  ```
  if (val && !opcoes.includes(val)) { errors.push({ campo, mensagem: `Valor '${val}' não permitido. Opções: ${opcoes.join(', ')}`, regra: 'REGRA_ENUM' }); }
  ```
- **validadore(s)** — `src/schemas/esocial/index.ts`
  ```
  ValidationResult> = {
  ```
- **validarEvento(tipo: string, dados: ESocialData)** — `src/schemas/esocial/index.ts`
  ```
  const fn = validadores[tipo]; if (!fn) { return { valid: false, errors: [ { campo: 'tpEvento', mensagem: `Validador não encontrado para ${tipo}. Verifique se este evento é suportado.`, regra: 'REGRA_TIPO_EVENTO', }, ], warnings: [], }; } return fn(dados);
  ```
- **validarTrabalhador(dados: ESocialData, errors: ValidationError[])** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  required(dados.cpfTrab, 'cpfTrab', errors); cpfValido(dados.cpfTrab as string, 'cpfTrab', errors);
  ```
- **validarS2190(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtAdm, 'dtAdm', errors); dataValida(dados.dtAdm as string, 'dtAdm', errors); naoFutura(dados.dtAdm, 'dtAdm', errors); if (dados.dtNascto !== undefined && dados.dtNascto !== null && dados.dtNascto !== '') { dataValida(dados.dtNascto as string, 'dtNascto', errors); ordemCronologica( dados.dtNascto, dados.dtAdm, 'dtAdm', 'Data de admissão não pode ser anterior à data de …
  ```
- **validarS2200(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.nmTrab, 'nmTrab', errors); maxLen(dados.nmTrab as string, 70, 'nmTrab', errors); required(dados.dtAdm, 'dtAdm', errors); dataValida(dados.dtAdm as string, 'dtAdm', errors); naoFutura(dados.dtAdm, 'dtAdm', errors); // Data de nascimento: consistência com a admissão + idade mínima constitucional. if (dados.dtNascto !== undefined && dados.dtNascto !== null && dados.dtNas …
  ```
- **validarS2205(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); if (dados.dtAlteracao !== undefined && dados.dtAlteracao !== null && dados.dtAlteracao !== '') { dataValida(dados.dtAlteracao as string, 'dtAlteracao', errors); } else { warnings.push({ campo: 'dtAlteracao', mensagem: 'Data de alteração não informada' }); } if (dados.nmTrab !== undefined && dados.nmTrab !== null && dados.nmTrab !== '') { maxLen(dados.nmTrab as string, 70, 'nmTrab', …
  ```
- **validarS2206(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtAlteracao, 'dtAlteracao', errors); dataValida(dados.dtAlteracao as string, 'dtAlteracao', errors); if (dados.codCBO !== undefined && dados.codCBO !== null && dados.codCBO !== '') { if (!/^\d{6}$/.test(String(dados.codCBO))) { errors.push({ campo: 'codCBO', mensagem: 'CBO deve conter exatamente 6 dígitos', regra: 'REGRA_CBO', }); } } if (dados.vrSalFx !== undefined & …
  ```
- **validarS2230(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.codMotAfast, 'codMotAfast', errors); required(dados.dtIniAfast, 'dtIniAfast', errors); dataValida(dados.dtIniAfast as string, 'dtIniAfast', errors); if (dados.dtTermAfast !== undefined && dados.dtTermAfast !== null && dados.dtTermAfast !== '') { dataValida(dados.dtTermAfast as string, 'dtTermAfast', errors); ordemCronologica( dados.dtIniAfast, dados.dtTermAfast, 'dtTe …
  ```
- **validarS2299(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtDeslig, 'dtDeslig', errors); dataValida(dados.dtDeslig as string, 'dtDeslig', errors); if (dados.dtAdm !== undefined && dados.dtAdm !== null && dados.dtAdm !== '') { ordemCronologica( dados.dtAdm, dados.dtDeslig, 'dtDeslig', 'Data de desligamento não pode ser anterior à data de admissão', errors ); } if (dados.mtvDeslig !== undefined && dados.mtvDeslig !== null && d …
  ```
- **validarS2300(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtInicio, 'dtInicio', errors); dataValida(dados.dtInicio as string, 'dtInicio', errors); if (dados.codCateg !== undefined && dados.codCateg !== null && dados.codCateg !== '') { // Categorias TSVE ficam na faixa 7xx/9xx da Tabela 1 do eSocial. if (!/^\d{3}$/.test(String(dados.codCateg))) { errors.push({ campo: 'codCateg', mensagem: 'Código de categoria deve ter 3 dígit …
  ```
- **validarS2306(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); if (dados.dtAlteracao !== undefined && dados.dtAlteracao !== null && dados.dtAlteracao !== '') { dataValida(dados.dtAlteracao as string, 'dtAlteracao', errors); } else { warnings.push({ campo: 'dtAlteracao', mensagem: 'Data de alteração não informada' }); } if (dados.codCBO !== undefined && dados.codCBO !== null && dados.codCBO !== '') { if (!/^\d{6}$/.test(String(dados.codCBO))) { …
  ```
- **validarS2399(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtTerm, 'dtTerm', errors); dataValida(dados.dtTerm as string, 'dtTerm', errors); if (dados.dtInicio !== undefined && dados.dtInicio !== null && dados.dtInicio !== '') { ordemCronologica( dados.dtInicio, dados.dtTerm, 'dtTerm', 'Data de término não pode ser anterior à data de início', errors ); } if (dados.mtvDesligTSV !== undefined && dados.mtvDesligTSV !== null && da …
  ```
- **validarS2400(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); if (dados.nmBenefic !== undefined && dados.nmBenefic !== null && dados.nmBenefic !== '') { maxLen(dados.nmBenefic as string, 70, 'nmBenefic', errors); } if (dados.dtNascto !== undefined && dados.dtNascto !== null && dados.dtNascto !== '') { dataValida(dados.dtNascto as string, 'dtNascto', errors); naoFutura(dados.dtNascto, 'dtNascto', errors); } if (dados.sexo !== undefined && dados …
  ```
- **validarS3000(dados: ESocialData)** — `src/schemas/esocial/naoPeriodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.nrRecEvt, 'nrRecEvt', errors); maxLen(dados.nrRecEvt as string, 40, 'nrRecEvt', errors); required(dados.tpEvt, 'tpEvt', errors); if (dados.tpEvt !== undefined && dados.tpEvt !== null && dados.tpEvt !== '') { // Apenas eventos não periódicos e periódicos podem ser excluídos via S-3000. if (!/^S-\d{4}$/.test(String(dados.tpEvt))) { errors.push({ campo: 'tpEvt', mensagem: 'Tipo de evento deve seguir o pad …
  ```
- **validarS1298(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; // ── ideEmpregador ──────────────────────────────────────────────────── required(dados.tpInsc, 'ideEmpregador.tpInsc', errors); enumValido(String(dados.tpInsc), ['1', '2', '3', '4', '5', '6'], 'ideEmpregador.tpInsc', errors); required(dados.nrInsc, 'ideEmpregador.nrInsc', errors); if (dados.tpInsc === 1) cnpjValido(String(dados.nrInsc ?? ''), 'ideEmpregador.nrInsc', errors); if (dados.tpInsc === 2) cpfValido(String( …
  ```
- **validarS1299(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; // ── ideEmpregador ──────────────────────────────────────────────────── required(dados.tpInsc, 'ideEmpregador.tpInsc', errors); enumValido(String(dados.tpInsc), ['1', '2', '3', '4', '5', '6'], 'ideEmpregador.tpInsc', errors); required(dados.nrInsc, 'ideEmpregador.nrInsc', errors); if (dados.tpInsc === 1) cnpjValido(String(dados.nrInsc ?? ''), 'ideEmpregador.nrInsc', errors); // ── ideEvento ───────────────────────── …
  ```
- **validarS5001(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; // ── IDEEvento ───────────────────────────────────────────────────────── required(dados.tpInsc, 'IDEEvento.tpInsc', errors); enumValido(String(dados.tpInsc), ['1', '2'], 'IDEEvento.tpInsc', errors); required(dados.nrInsc, 'IDEEvento.nrInsc', errors); if (dados.tpInsc === 1) cnpjValido(String(dados.nrInsc ?? ''), 'IDEEvento.nrInsc', errors); required(dados.perApur, 'IDEEvento.perApur', errors); if (typeof dados.perAp …
  ```
- **validarS5011(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; // ── IDEEvento ───────────────────────────────────────────────────────── required(dados.tpInsc, 'IDEEvento.tpInsc', errors); enumValido(String(dados.tpInsc), ['1'], 'IDEEvento.tpInsc', errors); required(dados.nrInsc, 'IDEEvento.nrInsc', errors); cnpjValido(String(dados.nrInsc ?? ''), 'IDEEvento.nrInsc', errors); required(dados.perApur, 'IDEEvento.perApur', errors); if (typeof dados.perApur === 'string' && !/^\d{4}-( …
  ```
- **competenciaValida(val: unknown, campo: string, errors: ValidationError[])** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  if (typeof val === 'string' && !COMPETENCIA_RE.test(val)) { errors.push({ campo, mensagem: `${campo} deve estar no formato AAAA-MM`, regra: 'REGRA_PERIODO', }); }
  ```
- **validarInscricao(dados: ESocialData, errors: ValidationError[], campoTp = 'tpInsc', campoNr = 'nrInsc')** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  required(dados[campoTp], campoTp, errors); enumValido(String(dados[campoTp] ?? ''), ['1', '2', '3', '4', '5', '6'], campoTp, errors); required(dados[campoNr], campoNr, errors); if (Number(dados[campoTp]) === 1) cnpjValido(String(dados[campoNr] ?? ''), campoNr, errors); if (Number(dados[campoTp]) === 2) cpfValido(String(dados[campoNr] ?? ''), campoNr, errors);
  ```
- **validarS1000(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarInscricao(dados, errors); required(dados.nmRazao, 'nmRazao', errors); maxLen(String(dados.nmRazao ?? ''), 115, 'nmRazao', errors); required(dados.classTrib, 'classTrib', errors); maxLen(String(dados.classTrib ?? ''), 2, 'classTrib', errors); // Indicadores binários obrigatórios (0 = não, 1 = sim) for (const campo of ['indCoop', 'indConstr', 'indDesFolha', 'indOptRegEletron'] as const) { required(dados[campo], …
  ```
- **validarS1005(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarInscricao(dados, errors); required(dados.iniValid, 'iniValid', errors); competenciaValida(dados.iniValid, 'iniValid', errors); required(dados.cnaePrep, 'cnaePrep', errors); if (dados.cnaePrep !== undefined && dados.cnaePrep !== null && dados.cnaePrep !== '') { if (!/^\d{7}$/.test(String(dados.cnaePrep))) { errors.push({ campo: 'cnaePrep', mensagem: 'CNAE preponderante deve ter exatamente 7 dígitos', regra: 'RE …
  ```
- **validarS1010(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.codRubr, 'codRubr', errors); maxLen(String(dados.codRubr ?? ''), 30, 'codRubr', errors); required(dados.ideTabRubr, 'ideTabRubr', errors); maxLen(String(dados.ideTabRubr ?? ''), 8, 'ideTabRubr', errors); required(dados.iniValid, 'iniValid', errors); competenciaValida(dados.iniValid, 'iniValid', errors); required(dados.dscRubr, 'dscRubr', errors); maxLen(String(dados.dscRubr ?? ''), 100, 'dscRubr', erro …
  ```
- **validarS1020(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.codLotacao, 'codLotacao', errors); maxLen(String(dados.codLotacao ?? ''), 30, 'codLotacao', errors); required(dados.iniValid, 'iniValid', errors); competenciaValida(dados.iniValid, 'iniValid', errors); // tpLotacao conforme Tabela 10 do eSocial (01..10, 21..24, 90..91) required(dados.tpLotacao, 'tpLotacao', errors); enumValido( String(dados.tpLotacao ?? ''), ['01', '02', '03', '04', '05', '06', '07', ' …
  ```
- **validarS1070(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; // tpProc: 1=administrativo, 2=judicial, 3=judicial do trabalhador required(dados.tpProc, 'tpProc', errors); enumValido(String(dados.tpProc ?? ''), ['1', '2', '3'], 'tpProc', errors); required(dados.nrProc, 'nrProc', errors); maxLen(String(dados.nrProc ?? ''), 21, 'nrProc', errors); required(dados.iniValid, 'iniValid', errors); competenciaValida(dados.iniValid, 'iniValid', errors); // indAutoria: 1=próprio contribuin …
  ```
- **validarS1200(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); required(dados.cpfTrab, 'cpfTrab', errors); cpfValido(String(dados.cpfTrab ?? ''), 'cpfTrab', errors); if (!Array.isArray(dados.dmDev) || dados.dmDev.length === 0) { errors.push({ campo: 'dmDev', mensagem: 'dmDev deve ser uma lista com ao menos um demonstrativo', regra: 'REGRA_ESTRUTURA', }); return { valid: false, errors …
  ```
- **validarS1210(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); required(dados.cpfTrab, 'cpfTrab', errors); cpfValido(String(dados.cpfTrab ?? ''), 'cpfTrab', errors); if (!Array.isArray(dados.infoPgto) || dados.infoPgto.length === 0) { errors.push({ campo: 'infoPgto', mensagem: 'infoPgto deve ser uma lista com ao menos um pagamento', regra: 'REGRA_ESTRUTURA', }); return { valid: false …
  ```
- **validarS1260(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); required(dados.nrInsc, 'nrInsc', errors); // indComerc conforme Tabela 13 — 1 não é código válido para este evento required(dados.indComerc, 'indComerc', errors); enumValido(String(dados.indComerc ?? ''), ['2', '3', '5', '6', '7', '8', '9'], 'indComerc', errors); required(dados.vrTotCom, 'vrTotCom', errors); if (dados.vrT …
  ```
- **validarS1270(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); required(dados.nrInsc, 'nrInsc', errors); required(dados.codLotacao, 'codLotacao', errors); maxLen(String(dados.codLotacao ?? ''), 30, 'codLotacao', errors); return { valid: errors.length === 0, errors, warnings };
  ```
- **validarS1280(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); // indSubstPatr: 1=integral, 2=proporcional if (dados.indSubstPatr !== undefined && dados.indSubstPatr !== null && dados.indSubstPatr !== '') { enumValido(String(dados.indSubstPatr), ['1', '2'], 'indSubstPatr', errors); } if (dados.percRedContrib !== undefined && dados.percRedContrib !== null && dados.percRedContrib !== ' …
  ```
- **validarRubricaESocial(rubrica: ESocialData)** — `src/schemas/esocial/rubricaValidator.ts`
  ```
  const errors: ValidationError[] = []; required(rubrica.codigo, 'codigo', errors); required(rubrica.descricao, 'descricao', errors); required(rubrica.tipo, 'tipo', errors); enumValido(rubrica.tipo as string, ['provento', 'desconto', 'informativa', 'informativo'], 'tipo', errors); // Validação contra rubricas padrão (se o código for um dos conhecidos) const padrao = RUBRICAS_PADRAO.find((r) => r.codigo === rubrica.codigo); if (padrao) { const norm = (t: unknown) => (t === 'informativa' ? 'informat …
  ```
- **validarS2210(dados: ESocialData)** — `src/schemas/esocial/sstValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.cpfTrab, 'cpfTrab', errors); cpfValido(dados.cpfTrab as string, 'cpfTrab', errors); required(dados.dtAcid, 'dtAcid', errors); dataValida(dados.dtAcid as string, 'dtAcid', errors); required(dados.tpAcid, 'tpAcid', errors); enumValido(dados.tpAcid?.toString(), ['1', '2', '3'], 'tpAcid', errors); required(dados.hrAcid, 'hrAcid', errors); if (presente(dados.hrAcid) && !HORA_RE.test(String(dados.hrAcid))) { …
  ```
- **validarS2220(dados: ESocialData)** — `src/schemas/esocial/sstValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.cpfTrab, 'cpfTrab', errors); cpfValido(dados.cpfTrab as string, 'cpfTrab', errors); required(dados.dtExame, 'dtExame', errors); dataValida(dados.dtExame as string, 'dtExame', errors); required(dados.tpExame, 'tpExame', errors); enumValido(dados.tpExame?.toString(), ['0', '1', '2', '3', '4', '9'], 'tpExame', errors); const exame = ts(dados.dtExame); if (exame !== null && exame > Date.now() + 86_400_000) …
  ```
- **validarS2240(dados: ESocialData)** — `src/schemas/esocial/sstValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.cpfTrab, 'cpfTrab', errors); cpfValido(dados.cpfTrab as string, 'cpfTrab', errors); required(dados.dtIniCondic, 'dtIniCondic', errors); dataValida(dados.dtIniCondic as string, 'dtIniCondic', errors); if (presente(dados.dtFimCondic)) { dataValida(dados.dtFimCondic as string, 'dtFimCondic', errors); const ini = ts(dados.dtIniCondic); const fim = ts(dados.dtFimCondic); if (ini !== null && fim !== null && …
  ```
- **cancelar(id: string, empresaId: string)** — `src/services/admissaoService.ts`
  ```
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant'); // Concluída já gerou colaborador ativo — cancelar pela etapa deixaria o // vínculo vivo. Reversão de colaborador é processo próprio (desligamento). const adm = await this.buscarPorId(id, empresaId); if (adm?.etapa === 'concluida') { throw new Error( 'Admissão já concluída — o colaborador criado permanece ativo; use desligamento para revertê-lo.' ); } return this.atualizar(id, { etapa: 'cancelada' }, empresaId);
  ```
- **validarDocumento(id: string, validado: boolean, empresaId: string)** — `src/services/afastamentoService.ts`
  ```
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant'); // documentos_afastamento não carrega empresa_id: escopamos pelo pai — fail closed. const { data: doc } = await supabase .from('documentos_afastamento') .select(sel('afastamento_id')) .eq('id', id) .maybeSingle<{ afastamento_id: string }>(); if (!doc?.afastamento_id) throw new Error('Documento não encontrado'); const { data: af } = await supabase .from('afastamentos') .select(sel('empresa_id')) .eq('id', doc.afa …
  ```
- **calcularDias(inicio: string, fim: string)** — `src/services/afastamentoService.ts`
  ```
  if (!inicio || !fim) return 0; const start = new Date(inicio); const end = new Date(fim); if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0; start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0); const diffMs = end.getTime() - start.getTime(); const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; return days > 0 ? days : 0;
  ```
- **calcularDistribuicaoDias(diasTotais: number, tipo: string, configs: ConfigAfastamentoRow[])** — `src/services/afastamentoService.ts`
  ```
  const config = configs.find((c) => c.tipo === tipo); const tiposComLimite = ['doenca', 'acidente_trabalho', 'acidente_trajeto']; const maxEmpresa = config?.dias_empresa_maximo ?? (tiposComLimite.includes(tipo) ? 15 : 0); if (maxEmpresa === 0) return { empresa: diasTotais, inss: 0 }; if (diasTotais <= maxEmpresa) return { empresa: diasTotais, inss: 0 }; return { empresa: maxEmpresa, inss: diasTotais - maxEmpresa };
  ```
- **cancel()** — `src/services/assistenteIAService.ts`
  ```
  cancelActiveRequest(); loggerService.info('[ASSISTENTE_IA] Request cancelada pelo usuário');
  ```
- **validateMessage(text: string)** — `src/services/assistenteIAService.ts`
  ```
  ok: boolean; reason?: string
  ```
- **validarPotencialAvaliacao(params: { feedbackId: string; idOperacao: string; observacao?: string | null })** — `src/services/avaliacaoService.ts`
  ```
  exigirEscritaOperacional('Validar potencial', { feedback_id: params.feedbackId }); const { data, error } = await (supabase as any).rpc('validar_potencial_avaliacao', { p_feedback_id: params.feedbackId, p_idempotencia: params.idOperacao, p_observacao: params.observacao ?? null, }); if (error) throw error; const confirmado = exigirOk( data as { ok?: boolean; validacao_id?: string; versao_avaliacao?: string; potencial_validado?: number; idempotente?: boolean; } | null, 'a validação do Potencial' ); …
  ```
- **podeAprovarColaborador(colaboradorId: string)** — `src/services/avaliacaoService.ts`
  ```
  const id = String(colaboradorId ?? '').trim(); if (!id) return false; const { data, error } = await (supabase as any).rpc('pode_aprovar_colaborador', { p_colaborador_id: id, }); if (error) throw error; return data === true;
  ```
- **calcularCustoMensal(colaboradorId: string, diasUteis = 22)** — `src/services/calculoBeneficiosService.ts`
  ```
  const { data: colab, error: colabError } = await supabase .from('colaboradores') .select('salario_base') .eq('id', colaboradorId) .single(); if (colabError) throw colabError; const salario = colab?.salario_base || 0; const descontoMaximo = salario * 0.06; const { data: rotas, error: rotasError } = await ( fromBeneficiosColaborador().select('*, beneficio:beneficios(*)') as unknown as QBuilder<BeneficioColaboradorRow> ) .eq('colaborador_id', colaboradorId) .eq('status_vinculo', 'ativo'); if (rotas …
  ```
- **calcularCredito(beneficioId: string, diasTrabalhados = 22)** — `src/services/calculoBeneficiosService.ts`
  ```
  const { data: beneficio, error } = await supabase .from('beneficios') .select('valor, tipo') .eq('id', beneficioId) .single(); if (error) throw error; const valor = beneficio?.valor || 0; // Se for mensal (valor alto), retorna o valor cheio, senão calcula proporcional if (valor < 100) { return valor * diasTrabalhados; } return valor;
  ```
- **calcularCoparticipacao(colaboradorId: string, mesReferencia: string)** — `src/services/calculoBeneficiosService.ts`
  ```
  const { data, error } = await ( fromBeneficiariosPlano().select('valor_coparticipacao') as unknown as QBuilder<BeneficiarioPlanoRow> ) .eq('colaborador_id', colaboradorId) .eq('mes_referencia', mesReferencia) .neq('status', 'excluido'); if (error) throw error; return (data || []).reduce( (acc: number, item: BeneficiarioPlanoRow) => acc + (Number(item.valor_coparticipacao) || 0), 0 );
  ```
- **calcularCustosEmpresa(empresaId: string, mesReferencia: string)** — `src/services/calculoBeneficiosService.ts`
  ```
  const { data, error } = await ( fromBeneficiosColaborador().select(` id, valor_empresa, beneficio:beneficios!inner (tipo, empresa_id) `) as unknown as QBuilder<BeneficioColaboradorRow> ) .eq('beneficio.empresa_id', empresaId) .eq('beneficio.tipo', 'saude') .eq('status_vinculo', 'ativo'); if (error) throw error; return (data || []).reduce( (acc: number, item: BeneficioColaboradorRow) => acc + (Number(item.valor_empresa) || 0), 0 );
  ```
- **calcularPremioMedio(empresaId: string)** — `src/services/calculoBeneficiosService.ts`
  ```
  const { data, error } = await supabase .from('beneficios') .select('id, valor, tipo') .eq('empresa_id', empresaId) .eq('tipo', 'vida'); if (error) throw error; if (!data || data.length === 0) return 0; let totalPremiums = 0; let totalParticipants = 0; for (const beneficio of data) { const { count, error: countError } = await ( supabase .from('beneficios_colaborador') .select('*', { count: 'exact', head: true }) as unknown as QBuilder<BeneficioColaboradorRow> ) .eq('beneficio_id', beneficio.id) . …
  ```
- **validarCPF(cpf: string)** — `src/services/cnabService.ts`
  ```
  const clean = cpf.replace(/\D/g, ''); if (clean.length !== 11) return false; if (/^(\d)\1+$/.test(clean)) return false; let s = 0; for (let i = 0; i < 9; i++) s += parseInt(clean[i], 10) * (10 - i); let d = 11 - (s % 11); if (d >= 10) d = 0; if (parseInt(clean[9], 10) !== d) return false; s = 0; for (let i = 0; i < 10; i++) s += parseInt(clean[i], 10) * (11 - i); d = 11 - (s % 11); if (d >= 10) d = 0; return parseInt(clean[10], 10) === d;
  ```
- **generateCNAB240(empresaId: string, folhaId: string)** — `src/services/cnabService.ts`
  ```
  const config = await this.getConfig(empresaId); if (!config) throw new Error('Configuração CNAB não encontrada para esta empresa.'); // Idempotency guard (C46/C47): reject if a remessa already exists in 'enviado' // status for this folha to prevent double-payment. Allow recovery if 'pendente' // (previous attempt failed before sending). const { data: existingRemessa } = await (supabase.from('cnab_remessas') as unknown as QueryBuilderType) .select('id, status, arquivo_remessa') .eq('empresa_id', …
  ```
- **generatePIXBatch(empresaId: string, folhaId: string)** — `src/services/cnabService.ts`
  ```
  // Idempotência (BUG-2.5): o CSV PIX pagável fica registrado em pix_lotes // igual ao CNAB240 — um lote por (empresa, folha). Remessa finalizada é // reutilizada; uma segunda geração nunca cria arquivo paralelo. const { data: existingLote } = await (supabase.from('pix_lotes') as unknown as QueryBuilderType) .select('id, status, arquivo_lote') .eq('empresa_id', empresaId) .eq('folha_id', folhaId) .maybeSingle(); if (existingLote) { const rec = existingLote as { id: string; status: string; arquivo …
  ```
- **generateCNAB400(empresaId: string, folhaId: string, opts: { banco_codigo?: string; convenio?: string; nome_empresa?: string } = {})** — `src/services/cnabService.ts`
  ```
  // ── 1. Carregar config ──────────────────────────────────────────── const config = opts.banco_codigo ? { banco_codigo: opts.banco_codigo, convenio: opts.convenio ?? '', nome_empresa: opts.nome_empresa ?? '', agencia: '', agencia_digito: '', conta: '', conta_digito: '', } : await this.getConfig(empresaId); if (!config) throw new Error('Configuração CNAB não encontrada.'); // ── 2. Idempotency: se já enviado, retorna arquivo existente ─────── const { data: existingRemessa } = await (supabase.fro …
  ```
- **obterValoresCamposCustomizados(colaboradorId: string)** — `src/services/colaboradorDetalhesService.ts`
  ```
  const { data, error } = await supabase .from('valores_campos_customizados') .select('*') .eq('colaborador_id', colaboradorId); if (error) throw error; return data || [];
  ```
- **salvarValorCampoCustomizado(campoId: string, colaboradorId: string, valor: string)** — `src/services/colaboradorDetalhesService.ts`
  ```
  const { data, error } = await supabase .from('valores_campos_customizados') .upsert( validateTablePayload( 'valores_campos_customizados', { campo_customizado_id: campoId, colaborador_id: colaboradorId, valor }, 'colaboradorDetalhesService:valores_campos_customizados' ), { onConflict: 'campo_customizado_id,colaborador_id' } ) .select() .maybeSingle(); if (error) throw error; return data;
  ```
- **gerarLancamentosFolha(empresaId: string, folhaId: string)** — `src/services/contabilidadeService.ts`
  ```
  try { // Fetch folha summary const { data: folha, error: fError } = await supabase .from('folhas_pagamento') .select('*') .eq('id', folhaId) .single(); if (fError) throw fError; // Fetch plano de contas const { data: plano, error: pError } = await supabase .from('plano_contas') .select('*') .eq('empresa_id', empresaId); if (pError) throw pError; const contaSalariosPagar = plano?.find((c) => c.codigo === '2.1.01.001'); const contaDespesaSalarios = plano?.find((c) => c.codigo === '3.1.01.001'); if …
  ```
- **gerarTemplateContrato(admissaoId: string)** — `src/services/contratacaoService.ts`
  ```
  const { data: admissao, error } = await supabase .from('admissoes') .select('*, empresa:empresas!admissoes_empresa_id_fkey(*)') .eq('id', admissaoId) .maybeSingle(); if (error) throw error; if (!admissao) throw new Error('Admissão não encontrada'); const empresa = admissao.empresa as unknown as Empresa; return ` <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: auto; padding: 40px; border: 1px solid #eee; background: #fff; border-radius: 8px; bo …
  ```
- **validarDocumento(admissaoId: string, docType: string, status: 'validado' | 'rejeitado', observacao?: string, empresaId?: string)** — `src/services/contratacaoService.ts`
  ```
  // Achado E51-026: a allowlist antiga (rg/cpf/titulo/reservista/ // comprovante_residencia/certidao/pis/cnh) não correspondia a nenhuma // coluna `checklist_*` real, nem aos `tipo` que o checklist de admissão // (DetalhesAdmissaoDialog) de fato envia — 4 dos 5 itens do checklist // (documentos pessoais, comprovante de endereço, exame admissional, // contrato assinado) sempre caíam nesse guard e retornavam "Tipo de // documento inválido" antes de tocar o banco; só `ctps` por coincidência // batia …
  ```
- **gerarPdf(admissao_id: string, template_id?: string)** — `src/services/contratoTemplateService.ts`
  ```
  const { data, error } = await supabase.functions.invoke('gerar-contrato-pdf', { body: { admissao_id, template_id }, }); if (error) throw error; return data as { contrato_id: string; template_id: string; template_nome: string; template_versao: number; path: string; hash: string; signed_url: string; };
  ```
- **gerarTokenAssinatura(contratoId: string, opts: { email?: string; cpf?: string; validadeDias?: number } = {})** — `src/services/contratoTemplateService.ts`
  ```
  token: string; url: string; expira_em: string
  ```
- **validateCPF(cpf: string)** — `src/services/encryptionService.ts`
  ```
  const cleanCPF = cpf.replace(/\D/g, ''); if (cleanCPF.length !== 11) return false; if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // Validação dos dígitos verificadores let sum = 0; for (let i = 0; i < 9; i++) { sum += parseInt(cleanCPF[i]) * (10 - i); } let remainder = (sum * 10) % 11; if (remainder === 10 || remainder === 11) remainder = 0; if (remainder !== parseInt(cleanCPF[9])) return false; sum = 0; for (let i = 0; i < 10; i++) { sum += parseInt(cleanCPF[i]) * (11 - i); } remainder = (su …
  ```
- **validateCNPJ(cnpj: string)** — `src/services/encryptionService.ts`
  ```
  const cleanCNPJ = cnpj.replace(/\D/g, ''); if (cleanCNPJ.length !== 14) return false; if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // Validação básica de dígitos verificadores // (implementação completa omitida para brevidade) return true;
  ```
- **validarAnteDeEnviar(tipoEvento: string, dados: Record<string, unknown>)** — `src/services/esocialService.ts`
  ```
  return validarEvento(tipoEvento, dados);
  ```
- **gerarEventosPeriodo(empresaId: string, competencia: string)** — `src/services/esocialService.ts`
  ```
  try { const { data: itens, error: iError } = await supabase .from('folha_itens') .select('*, colaboradores(*), folhas_pagamento!inner(*)') .eq('folhas_pagamento.empresa_id', empresaId) .eq('folhas_pagamento.competencia', competencia); if (iError) throw iError; const resultados = { criados: 0, pulados: 0, erros: 0 }; for (const item of itens || []) { try { const colaborador = Array.isArray(item.colaboradores) ? item.colaboradores[0] : item.colaboradores; if (!colaborador) continue; const { data: …
  ```
- **validateExportData(data: Record<string, unknown>[])** — `src/services/exportService.ts`
  ```
  if (!data || data.length === 0) { throw new Error('Nenhum dado disponível para exportação'); } // Verificação de integridade básica: garantir que todos os campos essenciais existem const sample = data[0]; const requiredKeys = ['colaborador', 'data']; const missingKeys = requiredKeys.filter((key) => !Object.keys(sample).includes(key)); if (missingKeys.length > 0) { loggerService.warn(`Aviso de integridade: Campos faltando no primeiro registro: ${missingKeys.join(', ')}`); } return true;
  ```
- **cancelar(id: string, empresaId: string, userId?: string)** — `src/services/feriasService.ts`
  ```
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant'); const { error } = await this.getQuery() .update({ cancelado: true, cancelado_em: new Date().toISOString(), cancelado_por: userId || null, status: 'cancelada', }) .eq('id', id) .eq('empresa_id', empresaId); if (error) throw error;
  ```
- **gerarPDF(medidaId: string)** — `src/services/medidasDisciplinaresService.ts`
  ```
  const { data, error } = await supabase.functions.invoke< Partial<MedidaPdfResultado> & { success?: boolean; error?: string } >('gerar-medida-disciplinar-pdf', { body: { medida_id: medidaId }, }); if (error) throw error; if (!data?.success) throw new Error(data?.error ?? 'Falha ao gerar documento'); if (!data.path || !data.hash || !data.signed_url) { throw new Error('Resposta incompleta ao gerar documento da medida disciplinar.'); } return { path: data.path, hash: data.hash, signed_url: data.sign …
  ```
- **aplicarIntegracao(medidaId: string)** — `src/services/medidasDisciplinaresService.ts`
  ```
  const { data, error } = await supabase.rpc('aplicar_medida_folha_ponto', { p_medida_id: medidaId, }); if (error) throw error; return data;
  ```
- **dataValidaIso(valor?: string | null)** — `src/services/onboardingJornadaService.ts`
  ```
  if (!valor) return undefined; const data = new Date(valor); return Number.isNaN(data.getTime()) ? undefined : formatDateLocalISO(data);
  ```
- **gerarGrades(planoId: string, numGrades: number, salarioBaseMenor?: number | null)** — `src/services/pcsService.ts`
  ```
  const { data, error } = await supabase.rpc('pcs_gerar_grades', { p_plano_id: planoId, p_num_grades: numGrades, p_salario_base_menor: salarioBaseMenor ?? undefined, }); if (error) throw error; return data ?? [];
  ```
- **validarBiometria(batidaId: string, colaboradorId: string, fotoBase64: string)** — `src/services/pontoService.ts`
  ```
  valid: boolean; confidence: number; status: string; message?: string
  ```
- **calcular(empresaId: string, competencia: string)** — `src/services/provisaoService.ts`
  ```
  const { data, error } = await supabase.functions.invoke<CalcularProvisoesResult>('calcular-provisoes', { body: { empresa_id: empresaId, competencia }, }); if (error) throw error; if (!data) throw new Error('Nenhuma resposta recebida ao calcular provisões.'); return data;
  ```
- **validarTransicao(id: string, novaEtapa: string, empresaId: string)** — `src/services/rescisaoService.ts`
  ```
  try { const { data: atual, error } = await supabase .from('desligamentos') .select('etapa, status') .eq('id', id) .eq('empresa_id', empresaId) .single(); if (error) throw new Error('Erro ao buscar dados do desligamento'); const indexAtual = ORDEM_ETAPAS.indexOf(atual.etapa || 'comunicacao'); const indexNova = ORDEM_ETAPAS.indexOf(novaEtapa); if (indexNova > indexAtual + 1) { throw new Error( `Transição bloqueada: Você deve concluir a etapa '${ORDEM_ETAPAS[indexAtual]}' e passar por '${ORDEM_ETAP …
  ```
- **calcularSLA(execucao: Execucao, etapa: Etapa)** — `src/services/workflowService.ts`
  ```
  const config = etapa.config ?? {}; const slaHoras = config.sla_horas ?? 48; const started = execucao.sla_iniciado_em ?? execucao.updated_at; const deadlineMs = new Date(started).getTime() + slaHoras * 60 * 60 * 1000; const nowMs = Date.now(); const hoursRemaining = (deadlineMs - nowMs) / (60 * 60 * 1000); return { expired: nowMs > deadlineMs, hoursRemaining: Math.round(hoursRemaining * 10) / 10, deadlineUtc: new Date(deadlineMs).toISOString(), };
  ```
- **validarCaminhoDaEmpresa(caminho: string | null | undefined, empresaId: string | null | undefined)** — `src/services/trainingImages/paths.ts`
  ```
  if (!caminho || !empresaId) return false; if (!segmentoSeguro(empresaId)) return false; // Recusa navegação de diretório e segmentos vazios. if (caminho.includes('..') || caminho.includes('//') || caminho.startsWith('/')) return false; return empresaDoCaminho(caminho) === empresaId;
  ```
- **generate()** — `src/services/trainingImages/provider.ts`
  ```
  throw new TrainingImageIntegrationDisabledError();
  ```
- **validarArquivoDeCapa(arquivo: { mimeType?: string | null; tamanho: number })** — `src/services/trainingImages/storage.ts`
  ```
  const mime = String(arquivo.mimeType ?? '').toLowerCase(); if (!TRAINING_IMAGES_MIME_TYPES.includes(mime as (typeof TRAINING_IMAGES_MIME_TYPES)[number])) { throw new Error(`Formato de imagem não suportado: use ${TRAINING_IMAGES_MIME_TYPES.join(', ')}.`); } if (!Number.isFinite(arquivo.tamanho) || arquivo.tamanho <= 0) { throw new Error('Arquivo de imagem vazio.'); } if (arquivo.tamanho > TRAINING_IMAGES_LIMITE_BYTES) { throw new Error('Imagem acima do limite de 5 MB.'); }
  ```
- **gerarAfastamentosPDF(titulo: string, dados: AfastamentoPDFData[], filtros: { cid?: string; status?: string; tipo?: string } = {})** — `src/utils/afastamentoPDF.ts`
  ```
  try { const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable'); const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); // Cabeçalho Profissional doc.setFillColor(240, 240, 240); doc.rect(0, 0, pageWidth, 40, 'F'); doc.setFontSize(22); doc.setTextColor(40, 40, 40); doc.setFont('helvetica', 'bold'); doc.text('ERP DP - Módulo de Afastamentos', 14, 20); doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.setFont('hel …
  ```
- **gerarAvisoFeriasPDF(input: AvisoFeriasInput)** — `src/utils/avisoFeriasPDF.ts`
  ```
  const { ferias, colaborador, empresa, assinatura } = input; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const pageWidth = doc.internal.pageSize.getWidth(); // Cabeçalho empresa doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text((empresa?.razao_social || empresa?.nome_fantasia || 'EMPRESA').toUpperCase(), 14, 16); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`CNPJ: ${empresa?.cnpj || '—'}`, 14, 21); const endereco = [empresa?.logradouro, empresa?.numero, …
  ```
- **gerarComunicadoMTE(input: ComunicadoColetivasInput)** — `src/utils/comunicadoFeriasColetivasPDF.ts`
  ```
  const { coletiva, empresa, totalColaboradores } = input; const doc = baseDoc(); cabecalhoEmpresa(doc, empresa); const cidade = empresa.cidade || '__________'; const uf = empresa.uf || '__'; doc.setFont('helvetica', 'bold').setFontSize(12); doc.text('COMUNICADO DE FÉRIAS COLETIVAS — MTE/SRTE', 105, 45, { align: 'center' }); doc.setFont('helvetica', 'normal').setFontSize(9); doc.text('Fundamento legal: CLT arts. 139 a 141 (Decreto-Lei nº 5.452/1943)', 105, 50, { align: 'center', }); doc.setFontSiz …
  ```
- **gerarComunicadoSindicato(input: ComunicadoColetivasInput)** — `src/utils/comunicadoFeriasColetivasPDF.ts`
  ```
  const { coletiva, empresa, sindicato, totalColaboradores } = input; const doc = baseDoc(); cabecalhoEmpresa(doc, empresa); const cidade = empresa.cidade || '__________'; const uf = empresa.uf || '__'; doc.setFont('helvetica', 'bold').setFontSize(12); doc.text('COMUNICADO DE FÉRIAS COLETIVAS — SINDICATO', 105, 45, { align: 'center' }); doc.setFont('helvetica', 'normal').setFontSize(9); doc.text('Fundamento legal: CLT art. 139, §2º', 105, 50, { align: 'center' }); doc.setFontSize(10); doc.text(`${ …
  ```
- **gerarXmlESocial({ tipo, dados, empresa, ambiente = '2' }: ESocialXmlParams)** — `src/utils/esocialXmlGenerator.ts`
  ```
  const now = new Date().toISOString(); const id = `ID1${(empresa.cnpj ?? '').replace(/\D/g, '').padStart(14, '0')}${now.replace(/[-T:.Z]/g, '').slice(0, 14)}`; let content: string; switch (tipo) { case 'S-1000': content = generateS1000(id, dados, empresa, ambiente); break; case 'S-2200': content = generateS2200(id, dados, empresa, ambiente); break; default: content = generateGeneric(id, tipo, dados, empresa, ambiente); } return `<?xml version="1.0" encoding="UTF-8"?> <eSocial xmlns="http://www.es …
  ```
- **generateS1000(id: string, dados: ESocialDados, empresa: ESocialXmlParams['empresa'], ambiente: string)** — `src/utils/esocialXmlGenerator.ts`
  ```
  return ` <evtInfoEmpregador Id="${id}"> <ideEvento> <tpAmb>${ambiente}</tpAmb> <procEmi>1</procEmi> <verProc>1.0.0</verProc> </ideEvento> <ideEmpregador> <tpInsc>1</tpInsc> <nrInsc>${(empresa.cnpj ?? '').replace(/\D/g, '')}</nrInsc> </ideEmpregador> <infoEmpregador> <inclusao> <idePeriodo> <iniValid>${dados.iniValid || '2023-01'}</iniValid> </idePeriodo> <infoCadastro> <nmRazao>${empresa.razao_social}</nmRazao> <classTrib>${dados.classTrib || '01'}</classTrib> <natJurid>${dados.natJurid || '2062 …
  ```
- **generateS2200(id: string, dados: ESocialDados, empresa: ESocialXmlParams['empresa'], ambiente: string)** — `src/utils/esocialXmlGenerator.ts`
  ```
  return ` <evtAdmissao Id="${id}"> <ideEvento> <indRetif>1</indRetif> <tpAmb>${ambiente}</tpAmb> <procEmi>1</procEmi> <verProc>1.0.0</verProc> </ideEvento> <ideEmpregador> <tpInsc>1</tpInsc> <nrInsc>${(empresa.cnpj ?? '').replace(/\D/g, '')}</nrInsc> </ideEmpregador> <trabalhador> <cpfTrab>${(dados.cpfTrab ?? '').replace(/\D/g, '')}</cpfTrab> <nmTrab>${dados.nmTrab}</nmTrab> <sexo>${dados.sexo || 'M'}</sexo> <racaCor>${dados.racaCor || '1'}</racaCor> <estCiv>${dados.estCiv || '1'}</estCiv> <grauI …
  ```
- **generateGeneric(id: string, _tipo: string, dados: ESocialDados, empresa: ESocialXmlParams['empresa'], ambiente: string)** — `src/utils/esocialXmlGenerator.ts`
  ```
  return ` <evento Id="${id}"> <ideEvento> <tpAmb>${ambiente}</tpAmb> <procEmi>1</procEmi> <verProc>1.0.0</verProc> </ideEvento> <ideEmpregador> <tpInsc>1</tpInsc> <nrInsc>${(empresa.cnpj ?? '').replace(/\D/g, '')}</nrInsc> </ideEmpregador> <dados> ${JSON.stringify(dados)} </dados> </evento>`;
  ```
- **gerarPDIPDF(colaborador: string, pdi: PDIData)** — `src/utils/evaluationPDF.ts`
  ```
  const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable'); const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth(); let y = 20; doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI)', pw / 2, y, { align: 'center' }); y += 12; doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Colaborador: ${colaborador}`, 14, y); y += 6; doc.text(`Data de Emissão: ${new Date(). …
  ```
- **hasValidSignature(file: File, declaredType: SignedFileType)** — `src/utils/fileSignature.ts`
  ```
  const buffer = await file.slice(0, 8).arrayBuffer(); const header = new Uint8Array(buffer); const sigs = SIGNATURES[declaredType]; if (!sigs) return false; return sigs.some((sig) => sig.every((b, i) => header[i] === b));
  ```
- **formatCurrency(input: NumberInput, fallback = DEFAULT_FALLBACK)** — `src/utils/format.ts`
  ```
  const n = parseNumberSafe(input); if (n === null) return fallback; return new Intl.NumberFormat(LOCALE_BR, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2, }).format(n);
  ```
- **gerarPDFHolerite(h: HoleriteData)** — `src/utils/holeritePDF.ts`
  ```
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); const pw = doc.internal.pageSize.getWidth(); let y: number; // Header doc.setFillColor(30, 58, 138); doc.rect(0, 0, pw, 30, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('DEMONSTRATIVO DE PAGAMENTO', pw / 2, 12, { align: 'center' }); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Competência: ${h.competencia || 'N/A'}`, pw / 2, 22, { align: 'c …
  ```
- **validatePassword(password: string)** — `src/utils/passwordPolicy.ts`
  ```
  const errors: string[] = []; if (password.length < MIN_LENGTH) { errors.push(`Mínimo de ${MIN_LENGTH} caracteres`); } if (password.length > MAX_LENGTH) { errors.push(`Máximo de ${MAX_LENGTH} caracteres`); } if (!/[A-Z]/.test(password)) { errors.push('Pelo menos 1 letra maiúscula'); } if (!/[a-z]/.test(password)) { errors.push('Pelo menos 1 letra minúscula'); } if (!/[0-9]/.test(password)) { errors.push('Pelo menos 1 número'); } if (!/[^A-Za-z0-9]/.test(password)) { errors.push('Pelo menos 1 cara …
  ```
- **validatePasswordFull(password: string)** — `src/utils/passwordPolicy.ts`
  ```
  const base = validatePassword(password); if (!base.valid) return base; const { breached, count } = await checkPasswordBreach(password); const warnings: string[] = []; if (breached) { warnings.push( `Esta senha apareceu em ${count.toLocaleString('pt-BR')} vazamentos de dados. Considere usar outra.` ); } return { ...base, warnings };
  ```
- **validarSaldoFerias(params: { diasDireito: number; uso: UsoPeriodo; diasGozo: number; diasAbono: number; })** — `src/utils/regrasSolicitacaoFerias.ts`
  ```
  const { diasDireito, uso, diasGozo, diasAbono } = params; const saldo = diasDireito - uso.usado; if (diasGozo + diasAbono > saldo) { return `Dias de gozo + abono excedem o direito disponível no período (saldo ${Math.max(saldo, 0)} de ${diasDireito} dias).`; } const limiteAbono = Math.floor(diasDireito / 3); if (uso.abonoUsado + diasAbono > limiteAbono) { return `Abono pecuniário limitado a 1/3 do direito do período: ${limiteAbono} dias (já convertidos ${uso.abonoUsado}) — Art. 143 CLT.`; } if (u …
  ```
- **validarInicioFerias(dataInicio: string, hoje: string)** — `src/utils/regrasSolicitacaoFerias.ts`
  ```
  return dataInicio && dataInicio < hoje ? 'A data de início não pode estar no passado.' : null;
  ```
- **calcularAvos(inicio: Date, fim: Date)** — `src/utils/rescisaoCalc.ts`
  ```
  if (fim < inicio) return 0; let meses = (fim.getFullYear() - inicio.getFullYear()) * 12; meses += fim.getMonth() - inicio.getMonth(); const diaInicio = inicio.getDate(); const diaFim = fim.getDate(); if (diaFim < diaInicio - 1) { meses--; } const anoRef = inicio.getFullYear(); const mesRef = inicio.getMonth() + meses; // Clamp diaInicio to the last valid day of mesRef (avoids Jan 31 + 1 month = Mar 3 overflow). const ultimoDiaMesRef = new Date(anoRef, mesRef + 1, 0).getDate(); const dataReferenc …
  ```
- **estimarParcelaSeguro(salarioMedio: number)** — `src/utils/rescisaoCalc.ts`
  ```
  const sd = FAIXAS_SEGURO_DESEMPREGO_2026; let valor: number; if (salarioMedio <= sd.faixa1Limite) valor = salarioMedio * sd.faixa1Mult; else if (salarioMedio <= sd.faixa2Limite) valor = sd.faixa2Base + (salarioMedio - sd.faixa1Limite) * sd.faixa2Mult; else valor = sd.teto; return Math.max(SALARIO_MINIMO_2026, trunc2(valor));
  ```
- **calcularRescisaoCore(params: RescisaoParams)** — `src/utils/rescisaoCalc.ts`
  ```
  const { salario, dataAdmissao, dataDesligamento, avisoTrabalhado, feriasVencidas: feriasVencidasFlag, saldoFGTS, dependentes = 0, } = params; if (salario <= 0) throw new Error('Salário deve ser maior que zero'); const admissao = new Date(dataAdmissao + 'T00:00:00'); const desligamento = new Date(dataDesligamento + 'T00:00:00'); if (isNaN(admissao.getTime()) || isNaN(desligamento.getTime())) { throw new Error('Datas inválidas'); } if (desligamento < admissao) { throw new Error('Data de desligamen …
  ```
- **calcularRescisao(params: RescisaoParams)** — `src/utils/rescisaoCalc.ts`
  ```
  try { const result = calcularRescisaoCore(params); // Assinatura digital do resultado para auditoria e integridade result.assinaturaDigital = await signCalculation(result); return result; } catch (e: unknown) { if (e instanceof Error) throw e; throw new Error(String(e), { cause: e }); }
  ```
- **gerarPDFRescisao(form: RescisaoPdfForm, result: RescisaoResult, auditoriaParam?: AuditoriaPdf | null)** — `src/utils/rescisaoPDF.ts`
  ```
  const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable'); // Buscar trilha de auditoria se não fornecida let auditoria = auditoriaParam; if (!auditoria && form.id && form.empresa_id) { try { const [registro] = await auditoriaService.listarTrilha({ empresa_id: form.empresa_id, tabela: 'desligamentos', registro_id: form.id, limite: 1, }); auditoria = registro; } catch { // Audit metadata enriches the PDF but is not required to generate an // …
  ```
- **validateUploadFile(file: File, options?: { maxSizeMB?: number })** — `src/utils/uploadValidation.ts`
  ```
  const maxSize = (options?.maxSizeMB ?? 10) * 1024 * 1024; if (file.size > maxSize) { throw new Error(`Arquivo excede o limite de ${options?.maxSizeMB ?? 10}MB`); } if (file.size === 0) { throw new Error('Arquivo está vazio'); } // Check ALL extensions in the filename (double-extension attack: file.pdf.exe) const parts = file.name.split('.'); for (let i = 1; i < parts.length; i++) { const ext = parts[i].toLowerCase(); if (DANGEROUS_EXTENSIONS.has(ext)) { throw new Error(`Tipo de arquivo não permi …
  ```
- **formatCurrency(value: number)** — `src/utils/folha/validadorFolha.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **validarCPF(cpf: string)** — `src/utils/importacao/validators.ts`
  ```
  const clean = String(cpf ?? '').replace(/\D/g, ''); if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false; let sum = 0; for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i); let rest = (sum * 10) % 11; if (rest === 10) rest = 0; if (rest !== parseInt(clean[9])) return false; sum = 0; for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i); rest = (sum * 10) % 11; if (rest === 10) rest = 0; return rest === parseInt(clean[10]);
  ```
- **podeGerirRh(admin: AdminClient, userId: string, empresaId: string | null | undefined)** — `supabase/functions/_shared/authz.ts`
  ```
  if (!empresaId) return Promise.resolve(false); return rpcBool(admin, 'pode_gerir_rh_para', { _user_id: userId, _empresa_id: empresaId });
  ```
- **podeGerirPessoas(admin: AdminClient, userId: string, empresaId: string | null | undefined)** — `supabase/functions/_shared/authz.ts`
  ```
  if (!empresaId) return Promise.resolve(false); return rpcBool(admin, 'pode_gerir_pessoas_para', { _user_id: userId, _empresa_id: empresaId });
  ```
- **computeETag(payload: unknown)** — `supabase/functions/_shared/cache.ts`
  ```
  const data = new TextEncoder().encode(JSON.stringify(payload)); const hash = await crypto.subtle.digest('SHA-256', data); const hex = Array.from(new Uint8Array(hash)) .map((b) => b.toString(16).padStart(2, '0')) .join(''); return `"${hex.slice(0, 32)}"`;
  ```
- **invalidateCache(keyOrPrefix: string)** — `supabase/functions/_shared/cache.ts`
  ```
  let removed = 0; for (const key of cache.keys()) { if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) { cache.delete(key); removed++; } } return removed;
  ```
- **createValidationErrorResponse(zodError: z.ZodError, req?: Request)** — `supabase/functions/_shared/contract.ts`
  ```
  const fields = zodError.errors.map((err) => ({ field: err.path.join('.'), message: err.message, })); return createErrorResponse( 'Erro de validação nos dados fornecidos', 422, 'VALIDATION_ERROR', fields, req, );
  ```
- **generateCsrfToken()** — `supabase/functions/_shared/csrf.ts`
  ```
  const buf = new Uint8Array(32); crypto.getRandomValues(buf); return btoa(String.fromCharCode(...buf)) .replace(/\+/g, '-') .replace(/\//g, '_') .replace(/=+$/, '');
  ```
- **calcularINSSCents(baseCents: bigint, referencia: string)** — `supabase/functions/_shared/inss.ts`
  ```
  if (baseCents <= 0n) return 0n; const { tetoCents, faixasCents } = tabelaDe(referencia); const b = baseCents < tetoCents ? baseCents : tetoCents; let inssMilesimos = 0n; let anterior = 0n; for (const [limite, aliquota] of faixasCents) { if (b <= anterior) break; const faixa = (b < limite ? b : limite) - anterior; inssMilesimos += faixa * aliquota; anterior = limite; if (b <= limite) break; } return inssMilesimos / 1000n;
  ```
- **calcularINSS(salario: number, referencia: string)** — `supabase/functions/_shared/inss.ts`
  ```
  if (!Number.isFinite(salario) || salario <= 0) return 0; const baseCents = BigInt(Math.round(salario * 100)); return Number(calcularINSSCents(baseCents, referencia)) / 100;
  ```
- **calcIRRF(bruto: number, dependentes = 0, competencia: string, outrasDeducoes = 0)** — `supabase/functions/_shared/irrf.ts`
  ```
  if (!Number.isFinite(bruto) || bruto <= 0) return 0; const ano = anoCompetencia(competencia); const { faixas, simplificado } = IRRF_POR_ANO[Math.max(2025, Math.min(ano, 2026))]; const inss = calcularINSS(bruto, competencia); const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF - outrasDeducoes; const baseSimplificada = bruto - simplificado; const base = Math.max(0, Math.min(baseLegal, baseSimplificada)); if (base <= 0) return 0; const baseCents = BigInt(Math.round(base * 100)); …
  ```
- **shouldLog(level: LogLevel)** — `supabase/functions/_shared/logger.ts`
  ```
  return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL];
  ```
- **validarAllowlist(entrada: EntradaAllowlist, config: ConfigAllowlist)** — `supabase/functions/_shared/trainingImages/allowlist.ts`
  ```
  const empresaPermitida = normalizar(config.empresaId); const conteudoPermitido = normalizar(config.contentId); if (!isUuid(empresaPermitida) || !isUuid(conteudoPermitido)) { return { ok: false, status: 503, motivo: 'allowlist_nao_configurada', detalhe: `${ALLOWLIST_EMPRESA_ENV} e ${ALLOWLIST_CONTENT_ENV} são obrigatórios e devem ser UUIDs válidos quando a geração está habilitada.`, }; } const empresaSolicitada = normalizar(entrada.empresaId); const conteudoSolicitado = normalizar(entrada.content …
  ```
- **validarImagemGerada(bytes: Uint8Array)** — `supabase/functions/_shared/trainingImages/imageValidation.ts`
  ```
  if (bytes.length < MINIMO_BYTES_IMAGEM) { throw new TrainingImageProviderError('imagem menor que o mínimo aceitável', { code: 'imagem_muito_pequena', retryable: false, }); } if (bytes.length > LIMITE_BYTES_IMAGEM) { throw new TrainingImageProviderError('imagem acima do limite de 5 MB', { code: 'imagem_muito_grande', retryable: false, }); } const mimeType = detectarMimeImagem(bytes); if (!mimeType) { throw new TrainingImageProviderError('formato de imagem não suportado', { code: 'formato_invalido …
  ```
- **generate(request: TrainingImageRequest)** — `supabase/functions/_shared/trainingImages/openaiProvider.ts`
  ```
  if (!apiKey) { throw new TrainingImageProviderError('OPENAI_API_KEY ausente no ambiente da função', { code: 'sem_chave', retryable: false, }); } const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); let resposta: Response; try { resposta = await fetchImpl(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Client-Request-Id': request.operationId, }, body: JSON.stringify({ model, prompt …
  ```
- **gerarCapaDeTreinamento(entrada: EntradaGeracaoCapa, deps: DepsPipelineCapa)** — `supabase/functions/_shared/trainingImages/pipeline.ts`
  ```
  if (!entrada.empresaId || !entrada.contentId || !TRAINING_CONTENT_TYPES.includes(entrada.contentType)) { return { gerado: false, motivo: 'conteudo_inexistente' }; } const conteudo = await deps.carregarConteudo(entrada); if (!conteudo) return { gerado: false, motivo: 'conteudo_inexistente' }; // Defesa extra: o registro carregado tem de ser da empresa pedida. if (conteudo.empresaId !== entrada.empresaId) return { gerado: false, motivo: 'conteudo_inexistente' }; const briefing = montarBriefingVisu …
  ```
- **generate(request: TrainingImageRequest)** — `supabase/functions/_shared/trainingImages/simulatedProvider.ts`
  ```
  chamadas += 1; ultimoPedido = request; if (options.atrasoMs) { await new Promise((resolve) => setTimeout(resolve, options.atrasoMs)); } if (options.falha === 'timeout') { throw new TrainingImageProviderError('tempo limite na geração da imagem', { code: 'timeout', retryable: true, }); } if (options.falha === 'rate_limit') { throw new TrainingImageProviderError('limite de uso da API atingido', { code: 'rate_limit', retryable: true, status: 429, }); } if (options.falha === 'http_permanente') { thro …
  ```
- **validarCaminhoDaEmpresa(caminho: unknown, empresaId: unknown)** — `supabase/functions/_shared/trainingImages/storagePath.ts`
  ```
  if (typeof caminho !== 'string' || typeof empresaId !== 'string') return false; if (!segmentoSeguro(empresaId)) return false; if (caminho.includes('..') || caminho.includes('//') || caminho.startsWith('/')) return false; return caminho.split('/')[0] === empresaId;
  ```
- **validarVinculo(userId: string, sub: string, cpf: string, db: GovbrLookups,)** — `supabase/functions/auth-gov-br/govbrIdentity.ts`
  ```
  const outros = unicos(await db.profilesPorGovbrUid(sub)).filter((id) => id !== userId); if (outros.length > 0) { return { ok: false, status: 409, erro: 'Esta conta gov.br já está vinculada a outro usuário.' }; } const hashes = unicos(await db.cpfHashesDoUsuario(userId)); if (hashes.length > 0 && !hashes.includes(await sha256Hex(cpf))) { return { ok: false, status: 403, erro: 'O CPF do gov.br não confere com o CPF do seu cadastro.' }; } return { ok: true, userId };
  ```
- **reaisToCents(v: number)** — `supabase/functions/calcular-13-salario/index.ts`
  ```
  return BigInt(Math.round(v * 100));
  ```
- **calcularIRRFCents(baseCents: bigint, dependentes: number)** — `supabase/functions/calcular-13-salario/index.ts`
  ```
  const deducaoDep = BigInt(dependentes) * 18_959n; // R$ 189,59 const bLegal = baseCents - deducaoDep; // Desconto simplificado R$564,80 = 56_480 centavos (Art. 1°, Lei 13.149/2015) const bSimplificado = baseCents - 56_480n; const b = bLegal < bSimplificado ? bLegal : bSimplificado; if (b <= 225_920n) return 0n; if (b <= 282_665n) { const v = (b * 75n) / 1000n - 16_944n; return v > 0n ? v : 0n; } if (b <= 375_105n) { const v = (b * 150n) / 1000n - 38_144n; return v > 0n ? v : 0n; } if (b <= 466_4 …
  ```
- **round2(n: number)** — `supabase/functions/calcular-ferias/index.ts`
  ```
  Math.round((n + Number.EPSILON) * 100) / 100;
  ```
- **calcIRRF(bruto: number, dependentes = 0, referencia: string)** — `supabase/functions/calcular-ferias/index.ts`
  ```
  if (!Number.isFinite(bruto) || bruto <= 0) return 0; const inss = calcularINSS(bruto, referencia); const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF; const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF; const base = Math.max(0, Math.min(baseLegal, baseSimplificada)); if (base <= 0) return 0; for (const f of FAIXAS_IRRF) { if (base <= f.l) return Math.max(0, trunc2(base * f.a - f.d)); } return 0;
  ```
- **round2(n: number)** — `supabase/functions/calcular-folha/index.ts`
  ```
  Math.round((n + Number.EPSILON) * 100) / 100;
  ```
- **descontosVariavei(s)** — `supabase/functions/calcular-folha/index.ts`
  ```
  codigo: string; descricao: string; tipo: 'desconto'; valor: number
  ```
- **reaisToCents(v: number)** — `supabase/functions/calcular-provisoes/index.ts`
  ```
  return BigInt(Math.round(v * 100));
  ```
- **calcularAvos(inicio: Date, fim: Date)** — `supabase/functions/calcular-rescisao/motor.ts`
  ```
  if (fim < inicio) return 0; let meses = (fim.getFullYear() - inicio.getFullYear()) * 12; meses += fim.getMonth() - inicio.getMonth(); const diaInicio = inicio.getDate(); const diaFim = fim.getDate(); if (diaFim < diaInicio - 1) { meses--; } const anoRef = inicio.getFullYear(); const mesRef = inicio.getMonth() + meses; const ultimoDiaMesRef = new Date(anoRef, mesRef + 1, 0).getDate(); const dataReferencia = new Date(anoRef, mesRef, Math.min(inicio.getDate(), ultimoDiaMesRef)); const diffTime = fi …
  ```
- **calcularRescisaoMotor(p: RescisaoMotorParams)** — `supabase/functions/calcular-rescisao/motor.ts`
  ```
  const { salarioBase, dataAdmissao, dataDesligamento } = p; if (!(salarioBase > 0)) throw new Error('Salário deve ser maior que zero'); const adm = new Date(dataAdmissao + 'T00:00:00'); const desl = new Date(dataDesligamento + 'T00:00:00'); if (isNaN(adm.getTime()) || isNaN(desl.getTime())) throw new Error('Datas inválidas'); if (desl < adm) throw new Error('Data de desligamento não pode ser anterior à admissão'); const tipo = normalizarTipoRescisao(p.tipo); const terminoIniciativa = p.terminoIni …
  ```
- **competenciaValida(comp: string)** — `supabase/functions/dctfweb/index.ts`
  ```
  ok: boolean; msg?: string
  ```
- **primeiroValido(...vals: Array<string | null | undefined>)** — `supabase/functions/distribuir-holerites/index.ts`
  ```
  for (const v of vals) { const t = (v ?? '').trim(); if (t) return t; } return null;
  ```
- **calcularParcelaPrice(principalCentavos: bigint, taxaMensal: number, n: number)** — `supabase/functions/emprestimo-consignado/index.ts`
  ```
  if (taxaMensal === 0) { return (principalCentavos + BigInt(n) - 1n) / BigInt(n); } // pmt = P * i / (1 - (1+i)^-n) — usar float p/ fator, depois arredondar const i = taxaMensal / 100; const fator = i / (1 - Math.pow(1 + i, -n)); const pmtFloat = Number(principalCentavos) * fator; return BigInt(Math.round(pmtFloat));
  ```
- **hasValidReportDispatchSecret(provided: string, configured: string,)** — `supabase/functions/enviar-relatorio/internalDispatch.ts`
  ```
  if (!provided || !configured) return false; const encoder = new TextEncoder(); const key = await crypto.subtle.importKey( "raw", encoder.encode(HMAC_COMPARISON_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"], ); const [providedSignature, configuredSignature] = await Promise.all([ crypto.subtle.sign("HMAC", key, encoder.encode(provided)), crypto.subtle.sign("HMAC", key, encoder.encode(configured)), ]); const actual = new Uint8Array(providedSignature); const expected = new Uint8Array(conf …
  ```
- **competenciaValida(comp: string)** — `supabase/functions/fgts-digital/index.ts`
  ```
  ok: boolean; msg?: string
  ```
- **reaisToCents(v: number)** — `supabase/functions/gerar-guias/index.ts`
  ```
  return BigInt(Math.round(v * 100));
  ```
- **calcularIRRFCents(baseCents: bigint)** — `supabase/functions/gerar-guias/index.ts`
  ```
  if (baseCents <= 225_920n) return 0n; if (baseCents <= 282_665n) { const v = (baseCents * 75n) / 1000n - 16_944n; return v > 0n ? v : 0n; } if (baseCents <= 375_105n) { const v = (baseCents * 150n) / 1000n - 38_144n; return v > 0n ? v : 0n; } if (baseCents <= 466_468n) { const v = (baseCents * 225n) / 1000n - 66_277n; return v > 0n ? v : 0n; } const v = (baseCents * 275n) / 1000n - 89_600n; return v > 0n ? v : 0n;
  ```
- **calcularVencimento(competencia: string, dia: number)** — `supabase/functions/gerar-guias/index.ts`
  ```
  data: string; alertaDiaUtil: boolean
  ```
- **beneficioDesconto(b: any)** — `supabase/functions/gerar-holerite/index.ts`
  ```
  if (b.tipo?.codigo === 'VT') return Math.min(Number(b.valor ?? 0), salarioBase * 0.06); return Number(b.desconto ?? 0);
  ```
- **generateOSPdf(input: z.infer<typeof OSSchema>, empresaNome: string)** — `supabase/functions/gerar-ltcat-os/index.ts`
  ```
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); let page = pdf.addPage([595, 842]); let y = 800; const write = (txt: string, opts: { size?: number; font?: any; color?: any } = {}) => { if (y < 60) { page = pdf.addPage([595, 842]); y = 800; } page.drawText(txt, { x: 50, y, size: opts.size ?? 10, font: opts.font ?? font, color: opts.color ?? rgb(0, 0, 0) }); y -= (opts.size ?? 10) + 4; …
  ```
- **generateLTCATPdf(input: z.infer<typeof LTCATSchema>, empresaNome: string)** — `supabase/functions/gerar-ltcat-os/index.ts`
  ```
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); let page = pdf.addPage([595, 842]); let y = 800; const write = (txt: string, opts: { size?: number; font?: any } = {}) => { if (y < 60) { page = pdf.addPage([595, 842]); y = 800; } page.drawText(txt, { x: 50, y, size: opts.size ?? 10, font: opts.font ?? font }); y -= (opts.size ?? 10) + 4; }; write("LAUDO TÉCNICO DAS CONDIÇÕES AMBIENTAI …
  ```
- **gerarPdfPgr(empresa: Empresa, riscos: Risco[], meta: { versao: number; responsavel_tecnico: string; registro_profissional: string },)** — `supabase/functions/gerar-pgr/index.ts`
  ```
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold); const marginX = 50; const width = 595; // A4 const height = 842; let page = pdf.addPage([width, height]); let y = height - 60; const write = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => { const size = opts.size ?? 11; const useFont = opts.bold ? fontBold : font; const clean = text …
  ```
- **calculateErrorRate(errorCount: number, totalQueryCount: number)** — `supabase/functions/metrics/metricsMath.ts`
  ```
  if (!Number.isFinite(errorCount) || !Number.isFinite(totalQueryCount) || errorCount < 0 || totalQueryCount < 0) { throw new TypeError('Contagens de telemetria devem ser números finitos não negativos'); } if (totalQueryCount === 0) return 0; return Math.min(errorCount / totalQueryCount, 1);
  ```
- **calculateOverallHealthStatus(databaseOk: boolean, telemetryOk: boolean, bridgeHealthCheckOk: boolean,)** — `supabase/functions/metrics/metricsMath.ts`
  ```
  return databaseOk && telemetryOk && bridgeHealthCheckOk ? 1 : 0;
  ```
- **calculateMetricsHttpStatus(overallHealthStatus: number, telemetryCollectionStatus: number,)** — `supabase/functions/metrics/metricsMath.ts`
  ```
  return overallHealthStatus === 1 && telemetryCollectionStatus === 1 ? 200 : 503;
  ```
- **validaChavePix(tipo: string, chave: string)** — `supabase/functions/pix-lote/index.ts`
  ```
  const c = chave.trim(); switch (tipo) { case 'cpf': return CPF_RE.test(c.replace(/\D/g, '')); case 'cnpj': return CNPJ_RE.test(c.replace(/\D/g, '')); case 'email': return EMAIL_RE.test(c) && c.length <= 77; case 'telefone': return E164_RE.test(c); case 'evp': case 'aleatoria': return EVP_RE.test(c); default: return false; }
  ```
- **shouldRunSchedule(schedule: ReportSchedule, now: Date)** — `supabase/functions/processar-agendamentos/scheduleContract.ts`
  ```
  return scheduleOccurrenceInWindow(schedule, now) !== null;
  ```
- **computeExpectedHash(payload: { colaborador_id: string; empresa_id: string; timestamp: string; tipo: string; dispositivoId: string; })** — `supabase/functions/processar-ponto-offline/index.ts`
  ```
  const secret = Deno.env.get('PONTO_HASH_SECRET') ?? ''; const canonical = `${payload.empresa_id}|${payload.colaborador_id}|${payload.timestamp}|${payload.tipo}|${payload.dispositivoId}`; if (!secret) return sha256Hex(canonical); const key = await crypto.subtle.importKey( 'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'], ); const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical)); return Array.from(new Uint8Array(sig)).map(( …
  ```
- **validateWindow(dataInicio: string, dataFim: string)** — `supabase/functions/relatorio/index.ts`
  ```
  const ini = new Date(dataInicio + 'T00:00:00Z').getTime(); const fim = new Date(dataFim + 'T00:00:00Z').getTime(); if (!Number.isFinite(ini) || !Number.isFinite(fim)) { return createErrorResponse('Datas inválidas', 422, 'INVALID_DATES'); } if (fim < ini) { return createErrorResponse('dataFim < dataInicio', 422, 'INVALID_WINDOW'); } const days = (fim - ini) / 86_400_000; if (days > MAX_WINDOW_DAYS) { return createErrorResponse( `Janela máxima ${MAX_WINDOW_DAYS} dias`, 422, 'WINDOW_TOO_LARGE', ); …
  ```
- **iguaisEmTempoConstante(a: string, b: string)** — `supabase/functions/training-image-dispatch/index.ts`
  ```
  const enc = new TextEncoder(); const chave = await crypto.subtle.importKey( 'raw', enc.encode('dp-training-image-dispatch-comparison'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'] ); const assinaturaA = new Uint8Array(await crypto.subtle.sign('HMAC', chave, enc.encode(a))); const assinaturaB = new Uint8Array(await crypto.subtle.sign('HMAC', chave, enc.encode(b))); let diff = 0; for (let i = 0; i < assinaturaA.length; i += 1) diff |= assinaturaA[i] ^ assinaturaB[i]; return diff === 0;
  ```
- **generateSignature(payload: string, secret: string)** — `supabase/functions/webhook/webhook_test.ts`
  ```
  const encoder = new TextEncoder(); const key = await crypto.subtle.importKey( "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"] ); const signature = await crypto.subtle.sign( "HMAC", key, encoder.encode(payload) ); return "sha256=" + Array.from(new Uint8Array(signature)) .map(b => b.toString(16).padStart(2, "0")) .join("");
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `const beneficio = mediaSalarial * 0.91;` | `src/calculators/beneficios.ts` |
| `const desconto = Math.trunc(Math.min(valorMensal * percentualMaximo, salarioBase * 0.2) * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const fgts = Math.trunc((brutoTotal - primeiraParcelaJaPaga) * 0.08 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const fgts = Math.trunc(bruto * 0.08 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const limiteDesconto = salarioBase * 0.06;` | `src/calculators/beneficios.ts` |
| `const margemTotal = Math.trunc(salarioLiquido * 0.35 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `return Math.trunc(salarioBase * 0.3 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const inssPatronal = Math.trunc(salarioBase * 0.2 * 100) / 100;` | `src/calculators/rescisao.ts` |
| `const provisaoEncargos = Math.trunc((provisaoFerias + provisaoTerco) * 0.3637 * 100) / 100;` | `src/calculators/rescisao.ts` |
| `const provisaoEncargos = Math.trunc(provisao13 * 0.3637 * 100) / 100;` | `src/calculators/rescisao.ts` |
| `margemCartao: Math.trunc(salarioLiquido * 0.05 * 100) / 100,` | `src/calculators/rescisao.ts` |
| `margemTotal: Math.trunc(salarioLiquido * 0.35 * 100) / 100,` | `src/calculators/rescisao.ts` |
| `export const VA_VR_MAX_DESCONTO_PAT = 0.2; // 20% do valor do benefício se for PAT` | `src/calculators/tabelas.ts` |
| `* @param parcela 1 para primeira parcela (50%, sem descontos), 2 para segunda ou integral` | `src/calculators/trabalhista-base.ts` |
| `// 1ª Parcela é sempre 50% do valor de direito, sem descontos de INSS/IRRF` | `src/calculators/trabalhista-base.ts` |
| `transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}` | `src/components/ProtectedRoute.tsx` |
| `* sobreviver a HMR/refresh curto. Alerta via toast quando failRate > 20%` | `src/components/admin/HealthTrendCard.tsx` |
| `* (112/13). O anel mantém a espessura relativa na mesma ordem (~11,6% do` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `* O donut tem 112px de diâmetro e anel de 13px: 9,7% menor que os 124px/14px` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `* que este card usava antes e 12,5% menor que os 128px/14px do` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `142 76% 40% no escuro). Contraste medido no browser: 5,4:1` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `direito deste retângulo, que cresce de 0 a 100% da largura —` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `token `--success` já existente (142 71% 38% no claro /` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `transition={{ duration: 0.6, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `{/* Coluna esquerda: largura fixa do donut, ~10% menor que os` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `// concluído = (nós concluídos − 1). Em 0% → 0 (nenhum trecho verde).` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `* 0.94]`), importada de `dashboard/MetricCard.tsx`.` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `* LARGURA: a faixa ocupa 100% da coluna e os chips a dividem` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `* colorir a superfície. A base é `bg-card/85` (navy/charcoal de `--card` a 85%` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `* no tablet (`sm`) e 3 no desktop LARGO (`xl`), ocupando 100% da largura do` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `* terceira faixa na horizontal a altura cai para ≈180px a 1920px (≈30% mais` | `src/components/admissoes/GestaoCandidatos.tsx` |
| ``text-primary-foreground` (240 20% 6%, quase preto) — MESMA` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `* filete a 25%. Escolhidos por serem DISTINTOS tanto no tema claro quanto no escuro` | `src/components/admissoes/GestaoKits.tsx` |
| `* pelo resto da área. Convenção idêntica à dos chips: tint a 15% + tinta cheia +` | `src/components/admissoes/GestaoKits.tsx` |
| `* ENTRADA 100% CSS (ver o bloco `KANBAN … ENTRADA DAS COLUNAS` no `src/index.css`):` | `src/components/admissoes/KanbanColumn.tsx` |
| `* `kanban-coluna-concluida` depois que as keyframes terminam (altura 100% estável e` | `src/components/admissoes/KanbanColumn.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/admissoes/OnboardingDashboard.tsx` |
| `* vibrante, no mesmo padrão dos chips da área (tint a 15% + tinta cheia).` | `src/components/admissoes/onboardingComum.ts` |
| `* (`MARCOS_ONBOARDING`), quem monta o texto é a tela. Com 100% devolve o ÚLTIMO` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `* 1. `concluido` — 100% das tarefas concluídas;` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `* tarefa e 100% dela está concluída. Derivada (não há coluna de status), como` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `/** Data da última conclusão registrada (para o estado 100% concluído). */` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `transition={{ delay: i * 0.05 }}` | `src/components/afastamentos/AfastamentoStats.tsx` |
| `* a contagem ficou parada em 0% e só apareceu o valor final. Nada do` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `// 'aguardando' → gatilho ainda não partiu: nada desenhado, percentual 0% e` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `{/* Percentual central sincronizado com o desenho: 0% antes do` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `* Composição em três regiões (≈30% / ≈38% / ≈32% no desktop):` | `src/components/avaliacao/CicloAtivoPanel.tsx` |
| `{/* Painel horizontal compacto: ≈30% / ≈38% / ≈32%, as três regiões` | `src/components/avaliacao/CicloAtivoPanel.tsx` |
| `transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: 'easeOut' }}` | `src/components/avaliacao/FeedbacksResumo.tsx` |
| `* medição ANTERIOR (ex.: 51% → 63% = `+12`), nunca variação relativa. O valor é` | `src/components/avaliacao/IndicadorEvolucao.tsx` |
| `* ordenação e paginação são 100% client-side — nenhuma consulta nova e` | `src/components/avaliacao/MetasOKRsTab.tsx` |
| `estreita no `xl`, onde ela ocupa ~28% da grade). */` | `src/components/avaliacao/NineBoxLateral.tsx` |
| `* `delayChildren` igual ao atraso do próprio card (`indice * 0.08`, com o teto` | `src/components/avaliacao/NineBoxMatriz.tsx` |
| `// Atraso do próprio card (`entradaCard`: `indice * 0.08`, com teto). Toda a` | `src/components/avaliacao/NineBoxMatriz.tsx` |
| `const atraso = Math.min(Math.max(indice, 0), MAX_ENTRADA_INDEX) * 0.08;` | `src/components/avaliacao/NineBoxMatriz.tsx` |
| `* ordenação e paginação são 100% client-side: nenhuma consulta nova, nenhuma` | `src/components/avaliacao/PdiTab.tsx` |
| `* A cor vem do STATUS, não de faixas de percentual: um ciclo concluído com 40%` | `src/components/avaliacao/TodosCiclosTable.tsx` |
| `* segue verde de sucesso e um ciclo em andamento com 90% segue âmbar — a cor` | `src/components/avaliacao/TodosCiclosTable.tsx` |
| `* especificado: a 100 % o card está inteiro e o canto do recorte (16 px) é MAIOR` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `* real (UUID) para o conjunto ser REAL. Só conjuntos 100% `mock-*`/`demo-*`` | `src/components/avaliacao/aprovacaoGestor.ts` |
| `* — sem largura alguma a barra ocuparia 100%.` | `src/components/avaliacao/barraProgressoAnim.ts` |
| `* (fundo 10 %, borda 25 %, texto cheio), com uma família de cor do sistema por` | `src/components/avaliacao/feedbacksComum.ts` |
| `* Pele por TIPO de meta — DISCRETA de propósito (fundo a 10 %, borda a 25 %,` | `src/components/avaliacao/metasComum.ts` |
| `* etiqueta de SITUAÇÃO, um degrau acima em intensidade (fundo a 20 %, borda a` | `src/components/avaliacao/metasComum.ts` |
| `* MOTIVO — nunca uma classificação aproximada e nunca redistribuindo os 60%.` | `src/components/avaliacao/motorAvaliacao360.ts` |
| `* disponível, normalizados para totalizar 100%.` | `src/components/avaliacao/motorAvaliacao360.ts` |
| `* não há classificação — e os 60% NÃO são redistribuídos para as outras` | `src/components/avaliacao/motorAvaliacao360.ts` |
| `* • POTENCIAL = 100% gestor, com VALIDAÇÃO OBRIGATÓRIA do RH vinculada à versão` | `src/components/avaliacao/motorAvaliacao360.ts` |
| `/** Pesos oficiais: Gestor 60% · Pares 25% · Autoavaliação 10% · Subordinados 5%. */` | `src/components/avaliacao/motorAvaliacao360.ts` |
| `/** Potencial informado pelo gestor (100% do eixo horizontal). */` | `src/components/avaliacao/motorAvaliacao360.ts` |
| `* ausência é de ACOMPANHAMENTO, não um 0% de execução.` | `src/components/avaliacao/pdiComum.ts` |
| `* • 0–39 % → âmbar (`from-warning/60 to-warning`)` | `src/components/avaliacao/pdiProgressoMock.ts` |
| `* • 40–79 % → lima (`from-primary/70 to-primary`)` | `src/components/avaliacao/pdiProgressoMock.ts` |
| `* • 80–100% → verde (`from-success to-primary`)` | `src/components/avaliacao/pdiProgressoMock.ts` |
| `// Secundário coerente com a faixa: em 100% "andamento" não faz sentido.` | `src/components/avaliacao/pdiProgressoMock.ts` |
| `O custo total de benefícios representa aproximadamente 12% da folha bruta total. Considere revisar o plano` | `src/components/beneficios/BeneficiosDashboard.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/beneficios/BeneficiosDashboard.tsx` |
| `transition: { delay: i * 0.18, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },` | `src/components/colaborador-detalhes/TrabalhoHierarquiaTab.tsx` |
| `transition={{ duration: 0.6, delay: 0.15 + index * 0.1, ease: 'easeOut' }}` | `src/components/colaborador-detalhes/desenvolvimento/DesenvolvimentoProfissionalCard.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/colaboradores/ColaboradorHistory.tsx` |
| `transition={{ delay: 0.5 + i * 0.05 }}` | `src/components/dashboard/BarChartWidget.tsx` |
| `transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}` | `src/components/dashboard/BarChartWidget.tsx` |
| `const strokeOffset = -seg.offset + circumference * 0.25; // start from top` | `src/components/dashboard/DonutChart.tsx` |
| `transition={{ delay: i * 0.08 }}` | `src/components/dashboard/EventTimeline.tsx` |
| `// linha de apoio caber em UMA linha ("150% vs. período` | `src/components/dashboard/MetricCard.tsx` |
| `transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },` | `src/components/dashboard/MetricCard.tsx` |
| `transition={{ delay: 0.5 + i * 0.06 }}` | `src/components/dashboard/QuickActionsGrid.tsx` |
| `const absenteismoScore = Math.max(0, 100 - absenteismo * 10); // 0% = 100, 10% = 0` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `const arcLength = (compositeScore / 100) * circumference * 0.75; // 270 degree arc` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `const turnoverScore = Math.max(0, 100 - turnover * 5); // 0% = 100, 20% = 0` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `transition={{ delay: 0.8 + i * 0.1 }}` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `turnoverScore * 0.3 + absenteismoScore * 0.25 + cadastroScore * 0.2 + feriasScore * 0.15 - passivoPenalty` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `transition={{ duration: 0.2, delay: idx * 0.05 }}` | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx` |
| `98% Aceitação` | `src/components/dashboard/analytics/widgets.tsx` |
| `if (value >= maxValue * 0.5) return 'from-primary-glow to-primary';` | `src/components/dashboard/analytics/widgets.tsx` |
| `if (value >= maxValue * 0.8) return 'from-destructive to-destructive/70';` | `src/components/dashboard/analytics/widgets.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/dashboard/analytics/widgets.tsx` |
| `transition={{ delay: index * 0.1 }}` | `src/components/dashboard/analytics/widgets.tsx` |
| `Colaboradores acima de 30% de desconto` | `src/components/descontos/FinancialSummaryCards.tsx` |
| `const margin = colaboradorData.salario_base * 0.3; // 30% Law` | `src/components/descontos/NewLoanDialog.tsx` |
| `// (`rescisaoCalc.ts:320-323`): 40% na dispensa sem justa causa e no término` | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `// antecipado pelo empregador (acompanha o art. 479), 20% no acordo mútuo e na` | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `transition={{ delay: atraso - ANDAMENTO_GAP * 0.5, duration: ANDAMENTO_GAP, ease: 'easeInOut' }}` | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}` | `src/components/desligamentos/DesligamentoKPIs.tsx` |
| `direita NÃO existe: a linha ocupa 100% da largura útil (`w-full`) e o` | `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx` |
| `/** Cor do pontinho (`bg-*`) — a MESMA tinta, só sem os 15% de alfa. */` | `src/components/desligamentos/trilhaComum.ts` |
| `transition={{ delay: i * 0.02 }}` | `src/components/epis/EpiCatalogoTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/epis/EpiCatalogoTable.tsx` |
| `transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: 'easeOut' }}` | `src/components/epis/EpiCategoryChart.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/epis/EpiEntregasTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/epis/EpiEntregasTable.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.3 }}` | `src/components/epis/EpiKPIs.tsx` |
| `// Sem eventos não há o que checar: não exibir score 100%/nota A nem "tudo conforme".` | `src/components/esocial/ESocialAuditDialog.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/esocial/ESocialTimeline.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.3 }}` | `src/components/exames/ExameKPIs.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/exames/ExameTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/exames/ExameTable.tsx` |
| `transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: 'easeOut' }}` | `src/components/exames/ExameTipoChart.tsx` |
| `if (stats.abonoPecuniario > stats.total * 0.4 && stats.total > 0) {` | `src/components/ferias/FeriasInsights.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/components/ferias/FeriasInsights.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.4 }}` | `src/components/ferias/FeriasKPIs.tsx` |
| `* KPIs de SLA e alerta visual quando o SLA cai abaixo de 80%.` | `src/components/ferias/FeriasReconciliacaoHistoricoCard.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/ferias/FeriasTable.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/folha/FolhaAuditTimeline.tsx` |
| `transition={{ delay: i * 0.08 }}` | `src/components/folha/FolhaComposicao.tsx` |
| `transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}` | `src/components/folha/FolhaComposicao.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/components/folha/FolhaESocialSync.tsx` |
| `transition={{ delay: index * 0.08 }}` | `src/components/folha/FolhaPipeline.tsx` |
| `if (resumo.totalDescontos > resumo.totalProventos * 0.4) {` | `src/components/folha/FolhaValidationAlerts.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/folha/FolhaValidationAlerts.tsx` |
| `* `kanban-coluna-concluida`: altura final estável (100% responsivo) e cards` | `src/components/kanban/entradaKanban.ts` |
| `* por `kanban-coluna-concluida` (altura 100% estável; cards novos/movidos não` | `src/components/kanban/entradaKanban.ts` |
| `transition={{ delay: i * 0.05 }}` | `src/components/layout/MobileQuickActions.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/medidas-disciplinares/MedidaWorkflowTimeline.tsx` |
| `transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: 'easeOut' }}` | `src/components/medidas-disciplinares/MedidasGravityScale.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.3 }}` | `src/components/medidas-disciplinares/MedidasKPIs.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/medidas-disciplinares/MedidasTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/medidas-disciplinares/MedidasTable.tsx` |
| `transition={{ delay: i * 0.04 }}` | `src/components/medidas-disciplinares/MedidasTimeline.tsx` |
| `* 100ms entre um item e o seguinte, contra os 50ms (`index * 0.05`) da` | `src/components/organograma/organogramaCascade.ts` |
| `* • `delay: index * 0.1`: o atraso cresce com a posição do item na árvore` | `src/components/organograma/organogramaCascade.ts` |
| `* Quanto do FIM de um passo o passo seguinte pode atropelar, em segundos: 30% da` | `src/components/organograma/organogramaReveal.ts` |
| `* `y1 = y2 = 1`, logo o progresso é sempre ≤ 100%: sem overshoot (nada de mola).` | `src/components/organograma/organogramaReveal.ts` |
| `* progresso nunca passa de 100%: não estufa e não volta (aqui não existe` | `src/components/organograma/organogramaReveal.ts` |
| `export const REVEAL_STAGE_OVERLAP = REVEAL_CLOSE_DURATION * 0.3;` | `src/components/organograma/organogramaReveal.ts` |
| `O P50 vem da pesquisa salarial mais recente de cada cargo da grade (aba Mercado). Tolerância de ±5%.` | `src/components/pcs/PcsGradesTab.tsx` |
| `podem gerar horas extras a 100%.` | `src/components/ponto/GestaoPontoAnalytics.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/ponto/PontoAuditTimeline.tsx` |
| `// 100% independente do resultado (achado da auditoria — "teatro").` | `src/components/ponto/PontoClockRegister.tsx` |
| `// até 60% — os 40% restantes refletem trabalho assíncrono REAL` | `src/components/ponto/PontoClockRegister.tsx` |
| `transition={{ duration: 1, delay: i * 0.05 }}` | `src/components/ponto/PontoClockRegister.tsx` |
| `if (dx <= w * 0.7 && dy <= h * 0.7) return z;` | `src/components/ponto/PontoGeoAnalytics.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/portal/PortalFinanceiroTab.tsx` |
| `transition={{ delay: 0.25 + i * 0.04 }}` | `src/components/portal/PortalOverviewTab.tsx` |
| `* · Sem payout (0 colaboradores, 0% de bônus ou 0% de meta) não existe ROI:` | `src/components/premiacoes/RewardsSimulator.tsx` |
| `* custo de reposição = salário médio × 3 × colaboradores × 15%` | `src/components/premiacoes/simuladorRoiComum.ts` |
| `* · O custo de reposição assume 3 salários por desligamento e 15% de turnover` | `src/components/premiacoes/simuladorRoiComum.ts` |
| `Regras: permanência &gt; 21 dias, vaga parada &gt; 15 dias e conversão &lt; 60%.` | `src/components/recrutamento/AnalyticsAtencao.tsx` |
| `// seria 0% sobre denominador vazio — mostramos a ausência, não um número.` | `src/components/recrutamento/AnalyticsFunil.tsx` |
| `// Somar percentuais JÁ arredondados fechava 100,1%: o top-3 sai dos totais.` | `src/components/recrutamento/AnalyticsOrigens.tsx` |
| `limite de altura; ocupa 100% da largura útil do modal. */}` | `src/components/recrutamento/CandidatoDetalhesDialog.tsx` |
| `* (`useDroppable` com o id da etapa). O card de origem fica em 30% e o` | `src/components/recrutamento/PipelineBoard.tsx` |
| `// quando ALGUÉM chegou à etapa seguinte — 0% por amostra vazia não é alerta.` | `src/components/recrutamento/analyticsComum.ts` |
| `transition={{ delay: i * 0.05 }}` | `src/components/relatorios/RelatoriosAgendadosTab.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/relatorios/RelatoriosAnalyticsTab.tsx` |
| `{ mes: 'Fev', custo: (analytics?.custoTotal \|\| 0) * 0.97 },` | `src/components/relatorios/RelatoriosAnalyticsTab.tsx` |
| `{ mes: 'Jan', custo: (analytics?.custoTotal \|\| 0) * 0.95 },` | `src/components/relatorios/RelatoriosAnalyticsTab.tsx` |
| `{ mes: 'Mar', custo: (analytics?.custoTotal \|\| 0) * 0.98 },` | `src/components/relatorios/RelatoriosAnalyticsTab.tsx` |
| `transition={{ delay: i * 0.06 }}` | `src/components/relatorios/RelatoriosExportTab.tsx` |
| `transition={{ delay: i * 0.04 }}` | `src/components/sst/SSTEPIsTab.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/sst/SSTIncidentesTab.tsx` |
| `transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}` | `src/components/sst/SSTKPIs.tsx` |
| `transition={{ delay: i * 0.06 }}` | `src/components/sst/SSTProgramasTab.tsx` |
| `transition={{ delay: i * 0.06 }}` | `src/components/sst/SSTRiscosTab.tsx` |
| `* 0%–49% → `--warning` (mais profundo no início) → `--coins` (âmbar → amarelo)` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `* 100% → `--success` → `--primary` (verde → lime)` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `* 50%–99% → `--info` (mais profundo no início) → `--aqua` (azul → ciano)` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `* Intensidades: fundo 10–12%, borda 25%, texto na cor cheia — exceto o violeta,` | `src/components/treinamentos/TreinamentoBadges.tsx` |
| `* em `CATEGORIAS`), em intensidade controlada: fundo 10–12%, borda 25% e` | `src/components/treinamentos/TreinamentoBadges.tsx` |
| `* para “Não informado”. Fundos em 8% e bordas em 20%.` | `src/components/treinamentos/TreinamentoBadges.tsx` |
| `* 0.08 s por índice). O objeto é IMPORTADO da referência (não é uma cópia), então` | `src/components/treinamentos/TrilhaCard.tsx` |
| `* ("—") em vez de 0%, que seria uma afirmação falsa.` | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| ``select.tsx`, não uma cópia. Content acima continua 100% Radix` | `src/components/ui/dropdown-menu.tsx` |
| `* deslocado 150% + escalado 2.5x) e desliza para o centro no hover,` | `src/components/ui/flow-hover-button.tsx` |
| `before:rounded-[100%] before:transition-transform before:duration-700 before:content-['']` | `src/components/ui/flow-hover-button.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/ui/module-skeleton.tsx` |
| `transition={{ delay: index * 0.1 }}` | `src/components/ui/module-skeleton.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/ui/notification-center.tsx` |
| `// Radix em si fica intocado (ref/seleção/teclado/Collection 100% originais)` | `src/components/ui/select.tsx` |
| `100% Radix (posicionamento/Popper/scroll/collision, intocados).` | `src/components/ui/select.tsx` |
| `function bezierPath(x1: number, y1: number, x2: number, y2: number, dx = Math.abs(x2 - x1) * 0.5): string {` | `src/components/workflows/WorkflowDesigner.tsx` |
| `* - MEI com empregado: CPP patronal 3% + FGTS 8%.` | `src/constants/regimes.ts` |
| `* são recolhidos fora do DAS. FGTS 8% segue obrigatório.` | `src/constants/regimes.ts` |
| `* EmpresaProvider now delegates 100% to useEmpresas (Zustand + React Query).` | `src/contexts/EmpresaContext.tsx` |
| `* já roteia 100% dos logins por lá, então a proteção não depende desta tela.` | `src/hooks/useBruteForceProtection.ts` |
| `return arr[Math.floor(arr.length * 0.95)];` | `src/hooks/useSystemHealthHistory.ts` |
| `const liquido = Math.round(salario * 0.82);` | `src/mocks/colaboradoresMock.ts` |
| `const salarioAnterior = Math.round(salarioAtual * 0.88);` | `src/mocks/colaboradoresMock.ts` |
| `dados_anteriores: { salario_base: Math.round(((c as any).salario_base \|\| 3000) * 0.88) },` | `src/mocks/colaboradoresMock.ts` |
| `valor_bolsa: Math.round((c.salario_base \|\| 3000) * 0.6),` | `src/mocks/colaboradoresMock.ts` |
| `valor_fgts: Math.round(salario * 0.08),` | `src/mocks/colaboradoresMock.ts` |
| `valor_inss: Math.round(salario * 0.09),` | `src/mocks/colaboradoresMock.ts` |
| `valor_irrf: Math.round(salario * 0.05),` | `src/mocks/colaboradoresMock.ts` |
| `transition={{ delay: 0.2 + i * 0.08 }}` | `src/pages/AssistenteIAPage.tsx` |
| `transition={{ delay: index * 0.01 }}` | `src/pages/AuditoriaPage.tsx` |
| `* Só um payload 100% UUID vai à RPC real — mesmo com mocks exibidos na tela.` | `src/pages/AvaliacaoPage.tsx` |
| `transition={{ delay: i * 0.08 }}` | `src/pages/BackupPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/BackupPage.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/pages/ComunicacaoInternaPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/ComunicacaoInternaPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/DashboardExecutivoPage.tsx` |
| `transition={{ delay: 0.5 + i * 0.15 }}` | `src/pages/DashboardPage.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/pages/DesligamentosPage.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/pages/DesligamentosPage.tsx` |
| `transition={{ delay: 0.05 + i * 0.03 }}` | `src/pages/ESocialPage.tsx` |
| `transition={{ delay: i * 0.06 }}` | `src/pages/ESocialPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/EmpresasPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/FolhaPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/GeradorDocumentosPage.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/pages/HoleritesPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/HoleritesPage.tsx` |
| `transition={{ delay: (i + 1) * 0.08 }}` | `src/pages/IntegracoesPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/LGPDPage.tsx` |
| `transition={{ delay: i * 0.06 }}` | `src/pages/LGPDPage.tsx` |
| `transition={{ delay: 0.3 + i * 0.1 }}` | `src/pages/LoginPage.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/pages/NotificacoesPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/NotificacoesPage.tsx` |
| `* CONCLUÍDO PARA AS ABAS = 100% E NÃO CANCELADA — a MESMA régua que` | `src/pages/OnboardingPage.tsx` |
| `(Math.abs(vf + tc - provF) > sal * 0.05 \|\| Math.abs(v13 - prov13) > sal * 0.05)` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `13º) e uma estimativa de 2% de reajustes ou novas admissões mensais.` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `Provisionamento registrado diverge &gt;5% do calculado — revise os valores da folha.` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `diff: Math.abs(vf + tc - provF) > sal * 0.05 ? Math.abs(vf + tc - provF) : Math.abs(v13 - prov13),` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `return { mes: format(d, 'MMM/yy', { locale: ptBR }), valor: tTotal * (1 + i * 0.015) };` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `tipo: Math.abs(vf + tc - provF) > sal * 0.05 ? 'Férias' : '13º',` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}` | `src/pages/PontoKioskPage.tsx` |
| `// 100% e o ponto era registrado independente de qualquer checagem).` | `src/pages/PontoPage.tsx` |
| `// desliga o deslocamento — conteúdo 100% visível.` | `src/pages/PremiacoesPage.tsx` |
| `<Cell key={`cell-${index}`} fillOpacity={0.8 + (index / trendData.length) * 0.2} />` | `src/pages/ProvisoesPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/ProvisoesPage.tsx` |
| `placeholder="salario_base * 0.08"` | `src/pages/RubricasPage.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/pages/RubricasPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/RubricasPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/SegurancaPage.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/WorkflowsPage.tsx` |
| `custoTotalEmpresa: totalProventos + totalProventos * 0.278 + fgts,` | `src/pages/folhaResumo.ts` |
| `* Calcula o custo de VT considerando o limite de 6% do salário base (Lei 7.418/85)` | `src/services/calculoBeneficiosService.ts` |
| `const descontoMaximo = salario * 0.06;` | `src/services/calculoBeneficiosService.ts` |
| `// QA-r4: Math.trunc(9.95*100) perdia 1 centavo (~5,9% dos valores) —` | `src/services/cnabService.ts` |
| `export const fgtsService = { calcular: (salario: number) => salario * 0.08 };` | `src/services/index.ts` |
| `// query inteira em runtime, quebrando 100% das tentativas de calcular` | `src/services/rescisaoService.ts` |
| `// vira HE 50% como antes. Registro novo sempre grava '00:00' nas` | `src/services/folha/calculoLoteService.ts` |
| `const desc = v.valor_mensal ? v.valor_mensal * 0.2 : 0;` | `src/services/folha/calculoLoteService.ts` |
| `const descontoMaximoVT = Number(colab.salario_base \|\| 0) * 0.06;` | `src/services/folha/calculoLoteService.ts` |
| `// 2b. Adicional noturno 20% (CLT art. 73) — horas trabalhadas 22h–05h.` | `src/utils/folhaCalc.ts` |
| `* (somente o período efetivamente indenizado: 100% sem justa causa,` | `src/utils/rescisaoCalc.ts` |
| `* - Art. 484-A: aviso 50%, multa FGTS 20%, saque FGTS limitado a 80% e` | `src/utils/rescisaoCalc.ts` |
| `* - Súmula 14 TST (culpa recíproca): aviso, férias proporcionais e 13º a 50%,` | `src/utils/rescisaoCalc.ts` |
| `* 50% dos dias restantes — provento para o empregado ou desconto a favor` | `src/utils/rescisaoCalc.ts` |
| `* 50% no acordo 484-A e na culpa recíproca — Súmula 14 TST).` | `src/utils/rescisaoCalc.ts` |
| `* multa FGTS 20%.` | `src/utils/rescisaoCalc.ts` |
| `* pelo empregado é o menor entre este valor e o teto legal (50% dos dias` | `src/utils/rescisaoCalc.ts` |
| `// 50% no acordo mútuo (art. 484-A) e na culpa recíproca (Súmula 14 TST).` | `src/utils/rescisaoCalc.ts` |
| `// A multa de 40% só existe quando há dispensa sem justa causa: o término` | `src/utils/rescisaoCalc.ts` |
| `// Apenas o período efetivamente indenizado projeta: 100% em sem_justa_causa,` | `src/utils/rescisaoCalc.ts` |
| `// apuradas, teto = valor do art. 479 (50% dos dias restantes).` | `src/utils/rescisaoCalc.ts` |
| `// encerrado antes do fim previsto: 50% dos dias restantes do contrato.` | `src/utils/rescisaoCalc.ts` |
| `const fgtsRescisao = trunc2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);` | `src/utils/rescisaoCalc.ts` |
| `const valor = trunc2((salario / 30) * diasRestantes * 0.5);` | `src/utils/rescisaoCalc.ts` |
| `multaFGTS = trunc2((saldoFGTS + fgtsRescisao) * 0.2);` | `src/utils/rescisaoCalc.ts` |
| `// Nota: O limite legal de descontos totais é maior, mas 70% é um alerta de erro crítico` | `src/utils/folha/validadorFolha.ts` |
| `// Regra 2: Descontos > 30% do bruto (limite prudencial para empréstimos/retenções)` | `src/utils/folha/validadorFolha.ts` |
| `if (totalDescontos > totalProventos * 0.7) {` | `src/utils/folha/validadorFolha.ts` |
| `[151_800n, 75n], // até 1.518,00 @ 7,5%` | `supabase/functions/_shared/inss.ts` |
| `[162_100n, 75n], // até 1.621,00 @ 7,5%` | `supabase/functions/_shared/inss.ts` |
| `[279_388n, 90n], // até 2.793,88 @ 9%` | `supabase/functions/_shared/inss.ts` |
| `[290_284n, 90n], // até 2.902,84 @ 9%` | `supabase/functions/_shared/inss.ts` |
| `[419_083n, 120n], // até 4.190,83 @ 12%` | `supabase/functions/_shared/inss.ts` |
| `[435_427n, 120n], // até 4.354,27 @ 12%` | `supabase/functions/_shared/inss.ts` |
| `[815_741n, 140n], // até 8.157,41 @ 14%` | `supabase/functions/_shared/inss.ts` |
| `[847_555n, 140n], // até 8.475,55 @ 14%` | `supabase/functions/_shared/inss.ts` |
| `const MEM_LIMIT_FRACTION = 0.5; // usa 50% do limite normal em modo degradado` | `supabase/functions/_shared/rateLimit.ts` |
| `// - Regras CLT: colaborador ativo, valor ≤ 40% salário, 1 por competência` | `supabase/functions/adiantamento-salarial/index.ts` |
| `if (mySal > 0 && mySal < median * 0.7) {` | `supabase/functions/alertas-preditivos/index.ts` |
| `- FGTS: 8% sobre remuneracao` | `supabase/functions/assistente-ia/index.ts` |
| `- INSS: Ate R$1.621,00 = 7,5% \| R$1.621,01-R$2.902,84 = 9% \| R$2.902,85-R$4.354,27 = 12% \| R$4.354,28-R$8.475,55 = 14%` | `supabase/functions/assistente-ia/index.ts` |
| `- IRRF: Ate R$2.259,20 = isento \| R$2.259,21-R$2.826,65 = 7,5% \| R$2.826,66-R$3.751,05 = 15% \| R$3.751,06-R$4.664,68 = 22,5% \| Acima de R$4.664,68 = 27,5%` | `supabase/functions/assistente-ia/index.ts` |
| `- Multa FGTS demissao sem justa causa: 40%`;` | `supabase/functions/assistente-ia/index.ts` |
| `// para SUPABASE_URL/auth/v1 estava travando até o timeout, derrubando 100%` | `supabase/functions/auth-login/index.ts` |
| `(Number(r.horas_noturnas) \|\| 0) * 0.2,` | `supabase/functions/calcular-ferias/index.ts` |
| `// Apuração de ponto aprovada da competência (HE 50%/100%, adicional` | `supabase/functions/calcular-folha/index.ts` |
| `// Descontos cadastrais: benefícios (VT 6% + coparticipação),` | `supabase/functions/calcular-folha/index.ts` |
| `// adicional noturno 20% com hora reduzida (52min30s), DSR só` | `supabase/functions/calcular-folha/index.ts` |
| `// de horas_extras vira HE 50%, como o front faz. '00:00' gravado é` | `supabase/functions/calcular-folha/index.ts` |
| `// folhaCalc.processar): HE a 50%/100% sobre a hora contratual,` | `supabase/functions/calcular-folha/index.ts` |
| `const desc = v.valor_mensal ? Number(v.valor_mensal) * 0.2 : 0;` | `supabase/functions/calcular-folha/index.ts` |
| `const descontoVT = Math.min(Number(v.valor ?? 0), salarioBase * 0.06);` | `supabase/functions/calcular-folha/index.ts` |
| `const descontoVT = Math.min(Number(vtLegacy.valor_mensal ?? 0), salarioBase * 0.06);` | `supabase/functions/calcular-folha/index.ts` |
| `const fgts = trunc2(baseTributavel * 0.08);` | `supabase/functions/calcular-folha/index.ts` |
| … +26 linhas — lista completa em `context.json` | |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `CACHE_VERSION` | `'v5'` | `public/sw-custom.js` |
| `SALARIO_MINIMO_2026` | `1621.0` | `src/calculators/tabelas.ts` |
| `TETO_INSS_2026` | `8475.55` | `src/calculators/tabelas.ts` |
| `TETO_INSS_2025` | `8157.41` | `src/calculators/tabelas.ts` |
| `IRRF_2026_ISENCAO_ATE` | `5000` | `src/calculators/tabelas.ts` |
| `IRRF_2026_REDUCAO_ATE` | `7350` | `src/calculators/tabelas.ts` |
| `IRRF_2026_REDUCAO_MAX` | `312.89` | `src/calculators/tabelas.ts` |
| `IRRF_2026_REDUCAO_A` | `978.62` | `src/calculators/tabelas.ts` |
| `IRRF_2026_REDUCAO_B` | `0.133145` | `src/calculators/tabelas.ts` |
| `DEDUCAO_SIMPLIFICADA_IRRF_2026` | `607.2` | `src/calculators/tabelas.ts` |
| `DEDUCAO_DEPENDENTE_IRRF` | `189.59` | `src/calculators/tabelas.ts` |
| `ALIQUOTA_FGTS` | `0.08` | `src/calculators/tabelas.ts` |
| `SALARIO_FAMILIA_TETO` | `1980.38` | `src/calculators/tabelas.ts` |
| `SALARIO_FAMILIA_VALOR` | `67.54` | `src/calculators/tabelas.ts` |
| `VA_VR_MAX_DESCONTO_PAT` | `0.2` | `src/calculators/tabelas.ts` |
| `LIMITE_ISENCAO_PLR` | `7640.8` | `src/calculators/tabelas.ts` |
| `KEEP` | `20` | `src/components/admin/HealthTrendCard.tsx` |
| `AUDIT_UNIFIED_LIMIT` | `100` | `src/components/admin/UnifiedAuditSection.tsx` |
| `DIA_MS` | `24` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `ALTURA_WIDGET` | `'h-[256px]'` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `ALTURA_LISTA_WIDGET` | `'h-[136px]'` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `HOVER_LINHA_WIDGET` | `'hover:bg-background/70'` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `LEGENDA_AREA` | `'text-[10px] leading-tight @max-[240px]:text-[9px]'` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `FUNDO_PROGRESSO` | `'bg-background/60'` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `MIOLO_STEPPER_OPACO` | `'bg-card'` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `LIMITE_DESCRICAO` | `120` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `ACOES_HEADER` | `'shrink-0 pr-9'` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `ACOES_HEADER_EIXO` | `'-mt-2'` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `DESTAQUE_MS` | `1000` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `RECUO_SCROLL` | `12` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `DESTAQUE_DESTINO` | `'border-primary/40 bg-primary/5'` | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `MAX_STAGGER` | `5` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `INICIO_FILTROS` | `0.05` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `PASSO_FILTROS` | `0.028` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `INICIO_CHIPS` | `0.18` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `PASSO_CHIPS` | `0.022` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `INICIO_CARD` | `0.38` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `PASSO_CARD_VARIANTS` | `0.08` | `src/components/admissoes/GestaoCandidatos.tsx` |
| `MAX_STAGGER_INDEX` | `5` | `src/components/admissoes/GestaoKits.tsx` |
| `CARTOES_ESQUELETO` | `3` | `src/components/admissoes/GestaoKits.tsx` |
| `TODOS_DEPARTAMENTOS` | `'todos'` | `src/components/admissoes/GestaoKits.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/admissoes/KitOnboardingDialog.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/admissoes/OnboardingDetalheDialog.tsx` |
| `DIA_MS` | `24` | `src/components/admissoes/admissoesDerivacoes.ts` |
| `PRAZO_DIAS_PADRAO` | `5` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `MARCOS` | `4` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `JANELA_RISCO_DIAS` | `3` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `ORDEM_ONBOARDING_PADRAO` | `'criticos'` | `src/components/admissoes/onboardingDerivacoes.ts` |
| `MAX_FILE_SIZE` | `10` | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| `DONUT_PX` | `140` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `ANIM_DONUT_MS` | `1400` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `ANIM_LEGENDA_MS` | `550` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `ANIM_LEGENDA_DESLOCAMENTO_PX` | `-12` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `ANIM_ENTRADA_MS` | `400` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `ANIM_ENTRADA_POR_INDICE_MS` | `80` | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| `COLUNA_XL` | `'hidden xl:flex'` | `src/components/avaliacao/AuditoriaEvento.tsx` |
| `TODOS` | `'__todos'` | `src/components/avaliacao/AuditoriaFiltros.tsx` |
| `MOCK_VISUAL_ETAPA_ATUAL` | `2` | `src/components/avaliacao/CicloAtivoPanel.tsx` |
| `ETAPAS_REVEAL_GAP` | `0.45` | `src/components/avaliacao/CicloAtivoPanel.tsx` |
| `TODOS` | `'__todos'` | `src/components/avaliacao/FeedbacksFiltros.tsx` |
| `TAM` | `112` | `src/components/avaliacao/FeedbacksResumo.tsx` |
| `ESP` | `14` | `src/components/avaliacao/FeedbacksResumo.tsx` |
| `ALTURA_MARCO_MES` | `18` | `src/components/avaliacao/FeedbacksTimeline.tsx` |
| `VAO_MARCO_CARDS` | `12` | `src/components/avaliacao/FeedbacksTimeline.tsx` |
| `FRACAO_PARA_INICIAR` | `0.08` | `src/components/avaliacao/FeedbacksTimeline.tsx` |
| `TODOS` | `'__todos'` | `src/components/avaliacao/MetasFiltros.tsx` |
| `POR_PAGINA_PADRAO` | `6` | `src/components/avaliacao/MetasOKRsTab.tsx` |
| `TODOS` | `'__todos'` | `src/components/avaliacao/NineBoxFiltros.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/avaliacao/NovaMetaDialog.tsx` |
| `VAZIO` | `'__vazio'` | `src/components/avaliacao/NovaMetaDialog.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/avaliacao/NovoCicloDialog.tsx` |
| `BLOCOS_CASCATA` | `4` | `src/components/avaliacao/NovoFeedbackDialog.tsx` |
| `BLOCOS_CASCATA` | `3` | `src/components/avaliacao/NovoPdiDialog.tsx` |
| `BLOCOS_CASCATA` | `2` | `src/components/avaliacao/PdiDetalheDialog.tsx` |
| `TODOS` | `'__todos'` | `src/components/avaliacao/PdiFiltros.tsx` |
| `POR_PAGINA_PADRAO` | `6` | `src/components/avaliacao/PdiTab.tsx` |
| `DURACAO_CABECALHO` | `0.35` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `DURACAO_EVENTO` | `0.45` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `INTERVALO_EVENTO` | `0.18` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `EASE_CASCATA` | `'easeOut'` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `MARGEM_REDE_SEGURANCA` | `2` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `DURACAO_RECOLHER` | `0.25` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `DURACAO_MINIMA_SAIDA` | `0.35` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `TAMANHO` | `84` | `src/components/avaliacao/ProgressoDonut.tsx` |
| `RAIO` | `35` | `src/components/avaliacao/ProgressoDonut.tsx` |
| `PERIMETRO` | `2` | `src/components/avaliacao/ProgressoDonut.tsx` |
| `ANIM_MS` | `1400` | `src/components/avaliacao/ProgressoDonut.tsx` |
| `ESPESSURA` | `8` | `src/components/avaliacao/ProgressoDonut.tsx` |
| `EXPANSAO_DURACAO_S` | `0.9` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `EXPANSAO_ESCALA_INICIAL` | `0.78` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `EXPANSAO_CLIP_INICIAL` | `'inset(35% 25% round 16px)'` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `EXPANSAO_CLIP_FINAL` | `'inset(0% 0% round 16px)'` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `CASCATA_DURACAO_S` | `0.6` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `CASCATA_Y_INICIAL` | `-48` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `CASCATA_PASSO_S` | `0.2` | `src/components/avaliacao/animacaoFeedbacks.ts` |
| `MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO` | `10` | `src/components/avaliacao/aprovacaoGestor.ts` |
| `BARRA_DURACAO_S` | `0.6` | `src/components/avaliacao/barraProgressoAnim.ts` |
| `BARRA_ATRASO_S` | `0.15` | `src/components/avaliacao/barraProgressoAnim.ts` |
| `BARRA_ATRASO_POR_INDICE_S` | `0.1` | `src/components/avaliacao/barraProgressoAnim.ts` |
| `BARRA_EASE` | `'easeOut'` | `src/components/avaliacao/barraProgressoAnim.ts` |
| `DEGRADE_ALTO` | `'bg-gradient-to-r from-success to-primary'` | `src/components/avaliacao/desempenhoComum.ts` |
| `DEGRADE_MEDIO` | `'bg-gradient-to-r from-primary/70 to-primary'` | `src/components/avaliacao/desempenhoComum.ts` |
| `DEGRADE_BAIXO` | `'bg-gradient-to-r from-warning/60 to-warning'` | `src/components/avaliacao/desempenhoComum.ts` |
| `DEGRADE_CRITICO` | `'bg-gradient-to-r from-destructive/60 to-destructive-vivid'` | `src/components/avaliacao/desempenhoComum.ts` |
| `CHAVE_REGISTROS_DEMO` | `'dp-desempenho-demo-registros'` | `src/components/avaliacao/desempenhoDemoStore.ts` |
| `TEXTO_NAO_INFORMADO` | `'Não informado'` | `src/components/avaliacao/feedbackCanonico.ts` |
| `TEXTO_NAO_APLICAVEL` | `'Não aplicável'` | `src/components/avaliacao/feedbackCanonico.ts` |
| `DIA_MS` | `86` | `src/components/avaliacao/metasComum.ts` |
| `ESTRATEGIA_ATIVA` | `'mais_recente'` | `src/components/avaliacao/nineBoxConsolidacao.ts` |
| `CICLO_ATUAL` | `'mock-ciclo-3'` | `src/components/avaliacao/nineBoxMock.ts` |
| `CICLO_ANTERIOR` | `'mock-ciclo-2'` | `src/components/avaliacao/nineBoxMock.ts` |
| `TEXTO_PROGRESSO_AUSENTE` | `'Progresso não acompanhado'` | `src/components/avaliacao/pdiComum.ts` |
| `DETALHE_PROGRESSO_AUSENTE` | `'O plano não registra ações nem percentual de execução.'` | `src/components/avaliacao/pdiComum.ts` |
| `MIN_CARACTERES_MOTIVO` | `3` | `src/components/avaliacao/statusFeedback.ts` |
| `MIN_CARACTERES_JUSTIFICATIVA` | `10` | `src/components/avaliacao/statusFeedback.ts` |
| `CHAVE_HISTORICO_FEEDBACK` | `'historico_feedback'` | `src/components/avaliacao/useHistoricoFeedback.ts` |
| `DIAS_ALERTA_VALIDADE` | `60` | `src/components/colaborador-detalhes/DocumentosComplianceResumoTab.tsx` |
| `HISTORICO_REVEAL_GAP` | `0.45` | `src/components/colaborador-detalhes/TrabalhoHierarquiaTab.tsx` |
| `DIAS_ALERTA_VALIDADE` | `60` | `src/components/colaborador-detalhes/documentos/PrazosAlertasCard.tsx` |
| `ROW_STAGGER` | `0.12` | `src/components/colaborador-detalhes/historico/HistoryEventRow.tsx` |
| `SUB_STEP` | `0.14` | `src/components/colaborador-detalhes/historico/HistoryEventRow.tsx` |
| `DIRECTORY_MAX_STAGGER_INDEX` | `5` | `src/components/colaboradores/ColaboradorDirectoryGrid.tsx` |
| `ROW_DURATION` | `0.28` | `src/components/colaboradores/ColaboradorTable.tsx` |
| `ROW_MAX_STAGGER_INDEX` | `7` | `src/components/colaboradores/ColaboradorTable.tsx` |
| `ROW_STAGGER_STEP` | `0.05` | `src/components/colaboradores/ColaboradorTable.tsx` |
| `BASE_CONTEUDO_ABA` | `4` | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `ANDAMENTO_GAP` | `0.22` | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `ANDAMENTO_INICIO` | `0.6` | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `COLUNAS_RELATORIO` | `'grid grid-cols-2 gap-x-4 gap-y-3 '` | `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx` |
| `SUPERFICIE_LINHA` | `'rounded-lg border border-border/30 bg-background/40 '` | `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx` |
| `PAGINA_TRILHA` | `500` | `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx` |
| `PAGINAS_TRILHA` | `4` | `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx` |
| `COR_TOTAL` | `'hsl(190 92% 52%)'` | `src/components/desligamentos/TurnoverChart.tsx` |
| `DURACAO_S` | `1.8` | `src/components/desligamentos/TurnoverChart.tsx` |
| `DASH_OCULTO` | `'999999'` | `src/components/desligamentos/TurnoverChart.tsx` |
| `AMOSTRAS` | `64` | `src/components/desligamentos/TurnoverChart.tsx` |
| `DIA_MS` | `24` | `src/components/desligamentos/desligamentosDerivacoes.ts` |
| `PRAZO_RESCISAO_DIAS` | `10` | `src/components/desligamentos/desligamentosDerivacoes.ts` |
| `TRILHA_EVENTO_DURACAO` | `0.7` | `src/components/desligamentos/trilhaReveal.ts` |
| `TRILHA_EVENTO_PASSO` | `0.15` | `src/components/desligamentos/trilhaReveal.ts` |
| `TRILHA_PASSOS_MAX` | `8` | `src/components/desligamentos/trilhaReveal.ts` |
| `TRILHA_SAIDA_DURACAO` | `0.25` | `src/components/desligamentos/trilhaReveal.ts` |
| `SLA_ALERT_THRESHOLD` | `80` | `src/components/ferias/FeriasReconciliacaoHistoricoCard.tsx` |
| `PASSO_COLUNA_MS` | `180` | `src/components/kanban/entradaKanban.ts` |
| `MAX_CARDS_ESCALONADOS` | `8` | `src/components/kanban/entradaKanban.ts` |
| `PASSO_COLUNA_REDUZIDO_MS` | `80` | `src/components/kanban/entradaKanban.ts` |
| `CASCADE_STEP` | `0.1` | `src/components/organograma/organogramaCascade.ts` |
| `CASCADE_DURATION` | `0.7` | `src/components/organograma/organogramaCascade.ts` |
| `CASCADE_EXIT_DURATION` | `0.22` | `src/components/organograma/organogramaCascade.ts` |
| `CASCADE_EXIT_OFFSET_Y` | `-4` | `src/components/organograma/organogramaCascade.ts` |
| `CASCADE_EXIT_STEP` | `0.03` | `src/components/organograma/organogramaCascade.ts` |
| `CASCADE_EXIT_MAX_WINDOW` | `0.28` | `src/components/organograma/organogramaCascade.ts` |
| `CASCADE_ENTER_MAX_WINDOW` | `1.6` | `src/components/organograma/organogramaCascade.ts` |
| `REVEAL_OPEN_DURATION` | `0.4` | `src/components/organograma/organogramaReveal.ts` |
| `REVEAL_CLOSE_DURATION` | `0.3` | `src/components/organograma/organogramaReveal.ts` |
| `REVEAL_OFFSET_Y` | `-4` | `src/components/organograma/organogramaReveal.ts` |
| `REVEAL_WAVE_STEP` | `0.09` | `src/components/organograma/organogramaReveal.ts` |
| `REVEAL_MAX_STAGGERED_BLOCKS` | `8` | `src/components/organograma/organogramaReveal.ts` |
| `REVEAL_CLOSE_WAVE_STEP` | `0.05` | `src/components/organograma/organogramaReveal.ts` |
| `REVEAL_MAX_STAGGERED_CLOSE_BLOCKS` | `3` | `src/components/organograma/organogramaReveal.ts` |
| `TILE` | `256` | `src/components/ponto/PontoGeoAnalytics.tsx` |
| `BUCKET` | `'documentos'` | `src/components/portal/PortalDocumentosTab.tsx` |
| `LIMITE_ACOES` | `3` | `src/components/premiacoes/CampanhaLateral.tsx` |
| `LARGURA_MINIMA_GRADE` | `'min-w-[906px]'` | `src/components/premiacoes/CampanhaTabela.tsx` |
| `PAD_LATERAL` | `'px-2'` | `src/components/premiacoes/CampanhaTabela.tsx` |
| `POR_PAGINA` | `6` | `src/components/premiacoes/PagamentosTab.tsx` |
| `TOM_STATUS_PADRAO` | `'bg-muted/60 text-muted-foreground'` | `src/components/premiacoes/PagamentosTabela.tsx` |
| `PONTO_STATUS_PADRAO` | `'bg-muted-foreground'` | `src/components/premiacoes/PagamentosTabela.tsx` |
| `TOM_BOTAO_CONCILIAR` | `'border-xp/40 bg-xp/10 text-xp hover:bg-xp/20 hover:text-xp'` | `src/components/premiacoes/PagamentosTabela.tsx` |
| `PAD_CELULA_X` | `'px-2'` | `src/components/premiacoes/PagamentosTabela.tsx` |
| `LARGURA_MINIMA_GRADE` | `'min-w-[893px]'` | `src/components/premiacoes/PagamentosTabela.tsx` |
| `PAD_CELULA` | `'py-2'` | `src/components/premiacoes/PagamentosTabela.tsx` |
| `COR_LINHA_PAYOUT` | `'#F59E0B'` | `src/components/premiacoes/RewardsSimulator.tsx` |
| `COR_LINHA_ECONOMIA` | `'#10B981'` | `src/components/premiacoes/RewardsSimulator.tsx` |
| `AUDITORIA_ENTRADA_DURACAO` | `0.55` | `src/components/premiacoes/auditoriaEntrada.ts` |
| `AUDITORIA_ENTRADA_PASSO` | `0.11` | `src/components/premiacoes/auditoriaEntrada.ts` |
| `AUDITORIA_ENTRADA_ATRASO` | `0.08` | `src/components/premiacoes/auditoriaEntrada.ts` |
| `AUDITORIA_ENTRADA_MAX_PASSO` | `9` | `src/components/premiacoes/auditoriaEntrada.ts` |
| `ETAPA_FORA_DO_FLUXO` | `'fora'` | `src/components/premiacoes/pagamentosComum.ts` |
| `ETAPA_PENDENTES` | `'pendentes'` | `src/components/premiacoes/pagamentosComum.ts` |
| `STATUS_REINICIO_PAGAMENTO` | `'calculado'` | `src/components/premiacoes/pagamentosComum.ts` |
| `ENTRADA_HUB_DURACAO` | `0.42` | `src/components/premiacoes/premiacoesEntrada.ts` |
| `ENTRADA_HUB_PASSO` | `0.1` | `src/components/premiacoes/premiacoesEntrada.ts` |
| `ENTRADA_HUB_ATRASO_INICIAL` | `0.06` | `src/components/premiacoes/premiacoesEntrada.ts` |
| `LINHA_HUB_INICIO` | `0.46` | `src/components/premiacoes/premiacoesEntrada.ts` |
| `LINHA_HUB_PASSO` | `0.08` | `src/components/premiacoes/premiacoesEntrada.ts` |
| `LINHA_HUB_DURACAO` | `0.8` | `src/components/premiacoes/premiacoesEntrada.ts` |
| `ENTRADA_SIMULADOR_DURACAO` | `0.35` | `src/components/premiacoes/simuladorEntrada.ts` |
| `ENTRADA_SIMULADOR_PASSO` | `0.06` | `src/components/premiacoes/simuladorEntrada.ts` |
| `BLOCOS_CASCATA` | `5` | `src/components/recrutamento/CandidatoDetalhesDialog.tsx` |
| `JANELA_COMPARACAO_DIAS` | `45` | `src/components/recrutamento/analyticsComum.ts` |
| `DIAS_ALERTA_ETAPA` | `21` | `src/components/recrutamento/analyticsComum.ts` |
| `DIAS_ALERTA_VAGA` | `15` | `src/components/recrutamento/analyticsComum.ts` |
| `DIA_MS` | `24` | `src/components/recrutamento/analyticsComum.ts` |
| `PILL_NEUTRA` | `'border-border/70 bg-muted/30 text-muted-foreground'` | `src/components/recrutamento/candidatosComum.ts` |
| `ORIGEM_NEUTRA` | `'border-border/70 bg-muted/30 text-muted-foreground'` | `src/components/recrutamento/candidatosComum.ts` |
| `PAGE` | `1000` | `src/components/sst/SSTIncidentesTab.tsx` |
| `MAX_EVENTOS_POR_DIA` | `2` | `src/components/treinamentos/AgendaSemanal.tsx` |
| `CERTIFICADOS_POR_PAGINA_PADRAO` | `6` | `src/components/treinamentos/CertificadosPainel.tsx` |
| `GRID_TABELA` | `'grid grid-cols-[20%_20%_13%_13%_12%_11%_11%] items-center'` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `DURACAO_PREENCHIMENTO` | `0.6` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `PASSO_CASCATA_BARRA` | `0.05` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `ATRASO_BARRA_APOS_LINHA` | `0.45` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `AVATARES_VISIVEIS` | `3` | `src/components/treinamentos/TreinamentoCursoCard.tsx` |
| `JANELA_A_VENCER_DIAS` | `30` | `src/components/treinamentos/certificadosDerivacoes.ts` |
| `ORDENACAO_CERTIFICADO_PADRAO` | `'recentes'` | `src/components/treinamentos/certificadosDerivacoes.ts` |
| `INSCRICOES_POR_PAGINA_PADRAO` | `10` | `src/components/treinamentos/inscricoesDerivacoes.ts` |
| `STATUS_AUSENTE` | `'nao_informado'` | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| `CATEGORIA_AUSENTE` | `'__sem_categoria__'` | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| `AVATARES_VISIVEIS` | `3` | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| `CATALOGO_POR_PAGINA_PADRAO` | `12` | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| `ORDENACAO_CATALOGO_PADRAO` | `'nome'` | `src/components/treinamentos/treinamentosDerivacoes.ts` |
| `TRILHAS_POR_PAGINA_PADRAO` | `12` | `src/components/treinamentos/trilhasDerivacoes.ts` |
| `ORDENACAO_TURMA_PADRAO` | `'data_asc'` | `src/components/treinamentos/turmasDerivacoes.ts` |
| `ROTULO_LINHAS_POR_PAGINA` | `'Linhas por página'` | `src/components/ui/app-pagination.tsx` |
| `CASCADE_SHELL_OPEN_DURATION` | `0.9` | `src/components/ui/cascade-motion.ts` |
| `CASCADE_SHELL_CLOSE_DURATION` | `0.55` | `src/components/ui/cascade-motion.ts` |
| `CASCADE_ITEM_STAGGER` | `0.1` | `src/components/ui/cascade-motion.ts` |
| `CASCADE_ITEM_DURATION_OUT` | `0.22` | `src/components/ui/cascade-motion.ts` |
| `CASCADE_ITEM_DURATION_IN` | `0.35` | `src/components/ui/cascade-motion.ts` |
| `CASCADE_OVERLAY_OPEN_DURATION` | `0.25` | `src/components/ui/cascade-motion.ts` |
| `MAX_ENTRADA_INDEX` | `8` | `src/components/ui/entrada-cards.tsx` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `'16rem'` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `'18rem'` | `src/components/ui/sidebar.tsx` |
| `INICIO_LINHAS` | `0.52` | `src/components/ui/table-row-reveal.ts` |
| `PASSO_LINHAS` | `0.04` | `src/components/ui/table-row-reveal.ts` |
| `TOAST_LIMIT` | `1` | `src/components/ui/use-toast.ts` |
| `SUPORTE_MAILTO` | `'mailto:suporte@promobrindes.com.br?subject='` | `src/components/ui/user-profile-menu.tsx` |
| `NODE_W` | `160` | `src/components/workflows/WorkflowDesigner.tsx` |
| `NODE_H` | `56` | `src/components/workflows/WorkflowDesigner.tsx` |
| `GW_W` | `56` | `src/components/workflows/WorkflowDesigner.tsx` |
| `GW_H` | `56` | `src/components/workflows/WorkflowDesigner.tsx` |
| `PORT_R` | `7` | `src/components/workflows/WorkflowDesigner.tsx` |
| `MIN_ZOOM` | `0.25` | `src/components/workflows/WorkflowDesigner.tsx` |
| `MAX_ZOOM` | `2` | `src/components/workflows/WorkflowDesigner.tsx` |
| `AUTH_INIT_TIMEOUT_MS` | `10000` | `src/contexts/AuthContext.tsx` |
| `USER_ROLES_TIMEOUT_MS` | `5000` | `src/contexts/AuthContext.tsx` |
| `MOBILE_BREAKPOINT` | `768` | `src/hooks/use-mobile.tsx` |
| `ALPHABET` | `'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'` | `src/hooks/useAdmissaoWorkflow.ts` |
| `LOCAL_MAX_ATTEMPTS` | `5` | `src/hooks/useBruteForceProtection.ts` |
| `LOCAL_LOCKOUT_MS` | `5` | `src/hooks/useBruteForceProtection.ts` |
| `PAGE_SIZE` | `1000` | `src/hooks/useExecutiveDashboard.ts` |
| `INACTIVITY_LIMIT_MS` | `30` | `src/hooks/useSessionTimeout.ts` |
| `CHECK_INTERVAL_MS` | `60` | `src/hooks/useSessionTimeout.ts` |
| `ACTIVITY_PERSIST_INTERVAL_MS` | `2` | `src/hooks/useSessionTimeout.ts` |
| `SIGN_OUT_TIMEOUT_MS` | `3` | `src/hooks/useSessionTimeout.ts` |
| `TOAST_LIMIT` | `1` | `src/hooks/useToast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `src/hooks/useToast.ts` |
| `BUCKET` | `'ferias-coletivas-comunicados'` | `src/hooks/ferias/useGerarComunicadoColetivas.ts` |
| `DEFAULT_LOCALE` | `'pt-BR'` | `src/i18n/index.ts` |
| `RESULT` | `'lovable-preview-auth:result'` | `src/integrations/supabase/previewAuthStorage.ts` |
| `TIMEOUT` | `2000` | `src/integrations/supabase/previewAuthStorage.ts` |
| `RETRY_DELAY` | `250` | `src/integrations/supabase/previewAuthStorage.ts` |
| `EMAIL_RH` | `'rh.promobrindes@empresa.com.br'` | `src/mocks/desempenhoMock.ts` |
| `EMAIL_GESTOR` | `'gestor.regional@empresa.com.br'` | `src/mocks/desempenhoMock.ts` |
| `MOTIVO_MIN` | `10` | `src/pages/CienciaMedidaPage.tsx` |
| `PAGE_SIZE` | `25` | `src/pages/ContratosGeradosPage.tsx` |
| `BUCKET` | `'documentos'` | `src/pages/DocumentosPage.tsx` |
| `MAX_STAGGER_INDEX` | `5` | `src/pages/OnboardingPage.tsx` |
| `ITENS_POR_PAGINA` | `12` | `src/pages/OnboardingPage.tsx` |
| `VALOR_TODOS` | `'__todos__'` | `src/pages/OnboardingPage.tsx` |
| `DIAS_POR_ANO` | `30` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `TERCO` | `1` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `ALIQ_FGTS` | `0.08` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `MULTA_FGTS` | `0.4` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `ALIQ_INSS` | `0.2` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `POR_PAGINA` | `8` | `src/pages/PremiacoesPage.tsx` |
| `REQUEST_TIMEOUT_MS` | `30` | `src/services/assistenteIAService.ts` |
| `MAX_HISTORY` | `10` | `src/services/assistenteIAService.ts` |
| `MAX_RECORDS_PER_TABLE` | `10` | `src/services/backupService.ts` |
| `BUCKET` | `'contabilidade-anexos'` | `src/services/canalContabilidadeService.ts` |
| `MAX_LINHAS_OPCOES_FILTRO` | `1000` | `src/services/colaboradorService.ts` |
| `LIMITE_OR_BRIDGE` | `500` | `src/services/colaboradorService.ts` |
| `MAX_LOGS_BUFFER` | `50` | `src/services/loggerService.ts` |
| `REDACTED` | `'[REDACTED]'` | `src/services/loggerService.ts` |
| `MAX_LOG_TEXT_LENGTH` | `2` | `src/services/loggerService.ts` |
| `COLUNAS_KIT` | `'id, nome, itens, ativo, created_at'` | `src/services/onboardingJornadaService.ts` |
| `MAX_ROWS` | `500` | `src/services/pcsService.ts` |
| `PERIODO_SEM_DATA` | `'sem-data'` | `src/services/premiacoesService.ts` |
| `PAGE` | `1000` | `src/services/premiacoesService.ts` |
| `PROMPT_VERSION` | `'v2'` | `src/services/trainingImages/briefing.ts` |
| `DESCRICAO_MAX` | `400` | `src/services/trainingImages/briefing.ts` |
| `NOME_MAX` | `120` | `src/services/trainingImages/briefing.ts` |
| `TRAINING_IMAGES_LIMITE_BYTES` | `5` | `src/services/trainingImages/config.ts` |
| `TRAINING_IMAGES_STALE_MS` | `15` | `src/services/trainingImages/config.ts` |
| `TRAINING_IMAGES_GC_MS` | `30` | `src/services/trainingImages/config.ts` |
| `TRAINING_IMAGES_BUCKET` | `'training-images'` | `src/services/trainingImages/paths.ts` |
| `EXTENSAO_PADRAO` | `'webp'` | `src/services/trainingImages/paths.ts` |
| `TENTATIVAS_MAX` | `3` | `src/services/trainingImages/service.ts` |
| `CONTROLE_MAX` | `500` | `src/services/trainingImages/service.ts` |
| `LOCALE_BR` | `'pt-BR'` | `src/utils/format.ts` |
| `TZ_BR` | `'America/Sao_Paulo'` | `src/utils/format.ts` |
| `DEFAULT_FALLBACK` | `'—'` | `src/utils/format.ts` |
| `MIN_LENGTH` | `8` | `src/utils/passwordPolicy.ts` |
| `MAX_LENGTH` | `128` | `src/utils/passwordPolicy.ts` |
| `HOURS_PER_DAY` | `24` | `src/utils/pgInterval.ts` |
| `DAYS_PER_MONTH` | `30` | `src/utils/pgInterval.ts` |
| … +114 linhas — lista completa em `context.json` | | |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `expect: { timeout: 8_000 },` | `playwright.config.ts` |
| `timeout: 120_000,` | `playwright.config.ts` |
| `timeout: 45_000,` | `playwright.config.ts` |
| `: 6 * 60 * 60 * 1000;` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `? 30 * 60 * 1000` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `? 5 * 60 * 1000` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `? 60 * 60 * 1000` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `const DIA_MS = 24 * 60 * 60 * 1000;` | `src/components/admissoes/AdmissoesDashboard.tsx` |
| `export const DIA_MS = 24 * 60 * 60 * 1000;` | `src/components/admissoes/admissoesDerivacoes.ts` |
| `setTimeout(() => setCopiedId(null), 2000);` | `src/components/afastamentos/AfastamentoTable.tsx` |
| `return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));` | `src/components/afastamentos/ProrrogacaoDialog.tsx` |
| `window.setTimeout(() => setCopiado(false), 1500);` | `src/components/avaliacao/AuditoriaDetalheDialog.tsx` |
| `Math.round((dataLocalDoEvento(validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));` | `src/components/colaborador-detalhes/DocumentosComplianceResumoTab.tsx` |
| `eventos.push({ data: addDays(fim, 1), titulo: 'Retorno ao trabalho', sub: 'Retorno previsto', tone: 'info' });` | `src/components/colaborador-detalhes/FeriasResumoTab.tsx` |
| `if (fim) marcarIntervalo(addDays(fim, 1), addDays(fim, 1), 'retorno');` | `src/components/colaborador-detalhes/FeriasResumoTab.tsx` |
| `onClick={() => setMesAtual((m) => addMonths(m, 1))}` | `src/components/colaborador-detalhes/FeriasResumoTab.tsx` |
| `onClick={() => setMesAtual((m) => subMonths(m, 1))}` | `src/components/colaborador-detalhes/FeriasResumoTab.tsx` |
| `const dias = Math.round((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));` | `src/components/colaborador-detalhes/documentos/PrazosAlertasCard.tsx` |
| `const em7Dias = format(new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');` | `src/components/dashboard/MorningBriefing.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/dashboard/MorningBriefing.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/dashboard/analytics/widgets.tsx` |
| `export const DIA_MS = 24 * 60 * 60 * 1000;` | `src/components/desligamentos/desligamentosDerivacoes.ts` |
| `const isProximo = vencimento && !isVencido && isBefore(vencimento, addMonths(new Date(), 1));` | `src/components/epis/EpiEntregasTable.tsx` |
| `return !isBefore(val, now) && isBefore(val, addMonths(now, 1));` | `src/components/exames/ExameKPIs.tsx` |
| `const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));` | `src/components/ferias/CalendarioFerias.tsx` |
| `const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));` | `src/components/ferias/CalendarioFerias.tsx` |
| `start: subMonths(new Date(), 5),` | `src/components/ferias/FeriasDashboard.tsx` |
| `const sixMonthsAgo = subMonths(now, 6);` | `src/components/ferias/FeriasRelatorioDialog.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/folha/FolhaDashboard.tsx` |
| `window.setTimeout(() => setCopiado(false), 2000);` | `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx` |
| `const timer = setTimeout(() => setActive(true), 2000);` | `src/components/onboarding/GuidedTour.tsx` |
| `setTimeout(() => { close(); }, 2000);` | `src/components/onboarding/GuidedTour.tsx` |
| `const diffHours = (inTime.getTime() - outTime.getTime()) / (1000 * 60 * 60);` | `src/components/ponto/GestaoPontoAnalytics.tsx` |
| `setTimeout(() => setShowConfetti(false), 5000);` | `src/components/ponto/PontoClockRegister.tsx` |
| `const diffHoras = (agora.getTime() - dataBatida.getTime()) / (1000 * 60 * 60);` | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `const timer = window.setTimeout(limparBloqueioClique, 1500);` | `src/components/recrutamento/PipelineBoard.tsx` |
| `timerBloqueio.current = window.setTimeout(() => setBloqueioInicial(false), 1200);` | `src/components/recrutamento/PipelineCard.tsx` |
| `const DIA_MS = 24 * 60 * 60 * 1000;` | `src/components/recrutamento/analyticsComum.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/seguranca/PolicyAuditPanel.tsx` |
| `return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4));` | `src/components/sst/SSTEPIsTab.tsx` |
| `const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);` | `src/components/sst/SSTExamesTab.tsx` |
| `onClick={() => setMes((atual) => addMonths(atual, 1))}` | `src/components/treinamentos/CalendarioTurmasDialog.tsx` |
| `onClick={() => setMes((atual) => subMonths(atual, 1))}` | `src/components/treinamentos/CalendarioTurmasDialog.tsx` |
| `timer.current = window.setTimeout(() => setCopiado(false), 1800);` | `src/components/treinamentos/CertificadoCard.tsx` |
| `timer.current = window.setTimeout(() => setCopiado(false), 1800);` | `src/components/treinamentos/CertificadoDetalheDialog.tsx` |
| `const timer = window.setTimeout(() => setAnimar(false), 1600);` | `src/components/treinamentos/InscricoesPainel.tsx` |
| `const timer = window.setTimeout(() => setAnimar(false), 1400);` | `src/components/treinamentos/TreinamentosTabela.tsx` |
| `const LOCAL_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos` | `src/hooks/useBruteForceProtection.ts` |
| `setTimeout(() => setProgressoLote(null), 3000);` | `src/hooks/useCalculoFolha.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useColaboradorVinculo.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useEmpresas.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useEmpresas.ts` |
| `const mesAnterior = format(subMonths(hoje, 1), 'yyyy-MM');` | `src/hooks/useExecutiveDashboard.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useExecutiveDashboard.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useGrupo.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useGrupo.ts` |
| `const dataFimConcessivo = addDays(parseISO(periodo.data_fim), 365);` | `src/hooks/useNotificacoes.ts` |
| `gcTime: 10 * 60 * 1000,` | `src/hooks/useNotificacoes.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/hooks/useNotificacoes.ts` |
| `const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes` | `src/hooks/useSessionTimeout.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/ferias/useReconciliacaoLogs.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/ferias/useReconciliacaoLogs.ts` |
| `const TIMEOUT = 2000;` | `src/integrations/supabase/previewAuthStorage.ts` |
| `const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));` | `src/pages/DashboardPage.tsx` |
| `const em30Dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/pages/DashboardPage.tsx` |
| `gcTime: 15 * 60 * 1000,` | `src/pages/DashboardPage.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/pages/DashboardPage.tsx` |
| `return isBefore(venc, addMonths(now, 1)) && !isBefore(venc, now);` | `src/pages/EPIsPage.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/pages/FolhaPagamentoPage.tsx` |
| `(new Date(s.prazo_legal).getTime() - now) / (1000 * 60 * 60 * 24) <= 5;` | `src/pages/LGPDPage.tsx` |
| `const diff = (prazo.getTime() - now) / (1000 * 60 * 60 * 24);` | `src/pages/LGPDPage.tsx` |
| `? `${format(addMonths(new Date(ultFim), 1), 'MMM/yy', { locale: ptBR })} → ${format(vencimento, 'MMM/yy', { locale: ptBR })}`` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `const vencimento = addMonths(periodoInicio, 12);` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `setTimeout(() => { setStep('pin'); setPin(''); setPinSeguranca(''); setSelectedColab(null); }, 3000);` | `src/pages/PontoKioskPage.tsx` |
| `{ enableHighAccuracy: true, timeout: 8000 }` | `src/pages/PontoKioskPage.tsx` |
| `setTimeout(() => setGeoStatus('idle'), 3000);` | `src/pages/PontoPage.tsx` |
| `{ enableHighAccuracy: true, timeout: 8000 }` | `src/pages/PontoPage.tsx` |
| `staleTime: 3 * 60 * 1000,` | `src/pages/PortalPage.tsx` |
| `const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);` | `src/pages/SSTPage.tsx` |
| `timerEntradaTrilhas.current = window.setTimeout(() => { setAnimarTrilhas(false); setEntradaTrilhasPendente(false); }, 1400);` | `src/pages/TreinamentosPage.tsx` |
| `const diffHours = (now - created.getTime()) / (1000 * 60 * 60);` | `src/pages/WorkflowsPage.tsx` |
| `const horasDecorridas = Math.round((now - new Date(e.created_at).getTime()) / (1000 * 60 * 60));` | `src/pages/WorkflowsPage.tsx` |
| `if (houveObito) d.setTime(d.getTime() + 24 * 60 * 60 * 1000);` | `src/pages/adminCatEdicao.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/providers/QueryProvider.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/providers/QueryProvider.tsx` |
| `const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;` | `src/services/afastamentoService.ts` |
| `const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();` | `src/services/cnabService.ts` |
| `flushTimeout = setTimeout(() => { void this.flush(); }, 10000);` | `src/services/loggerService.ts` |
| `async obterSignedUrl(path: string, expiresIn = 3600): Promise<string> {` | `src/services/medidasDisciplinaresService.ts` |
| `async signedUrlAnexoContestacao(path: string, expiresIn = 3600): Promise<string> {` | `src/services/medidasDisciplinaresService.ts` |
| `const deadlineMs = new Date(started).getTime() + slaHoras * 60 * 60 * 1000;` | `src/services/workflowService.ts` |
| `const hoursRemaining = (deadlineMs - nowMs) / (60 * 60 * 1000);` | `src/services/workflowService.ts` |
| `export const TRAINING_IMAGES_GC_MS = 30 * 60 * 1000;` | `src/services/trainingImages/config.ts` |
| `export const TRAINING_IMAGES_STALE_MS = 15 * 60 * 1000;` | `src/services/trainingImages/config.ts` |
| `const dataLimite = subDays(new Date(coletiva.data_inicio), 15);` | `src/utils/comunicadoFeriasColetivasPDF.ts` |
| `const DIA_MS = 1000 * 60 * 60 * 24;` | `src/utils/rescisaoCalc.ts` |
| `SET idle_in_transaction_session_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_auth_schema.sql` |
| `SET lock_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_auth_schema.sql` |
| `SET statement_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_auth_schema.sql` |
| `SET idle_in_transaction_session_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_data.sql` |
| `SET lock_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_data.sql` |
| `SET statement_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_data.sql` |
| `SET transaction_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_data.sql` |
| `SET idle_in_transaction_session_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_schema.sql` |
| `SET lock_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_schema.sql` |
| `SET statement_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_cron_schema.sql` |
| `SET idle_in_transaction_session_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_storage_schema.sql` |
| `SET lock_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_storage_schema.sql` |
| `SET statement_timeout = 0;` | `supabase/baseline/20260831_canonical/canonical_storage_schema.sql` |
| `const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 min` | `supabase/functions/_shared/cache.ts` |
| `const IN_PROGRESS_TTL_MS = 5 * 60 * 1000;` | `supabase/functions/_shared/idempotency.ts` |
| `export const STALE_AFTER_MS = 10 * 60 * 1000;` | `supabase/functions/_shared/trainingImages/quotas.ts` |
| `const MES_MS = 1000 * 60 * 60 * 24 * 30;` | `supabase/functions/alertas-dp/index.ts` |
| `const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)` | `supabase/functions/alertas-dp/index.ts` |
| `const em83dias = new Date(hoje.getTime() - 83 * 24 * 60 * 60 * 1000)` | `supabase/functions/alertas-dp/index.ts` |
| `const em90dias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)` | `supabase/functions/alertas-dp/index.ts` |
| `const diasAdmitido = (hoje.getTime() - admissao.getTime()) / (24 * 60 * 60 * 1000);` | `supabase/functions/alertas-preditivos/index.ts` |
| `const doisMesesAtras = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);` | `supabase/functions/alertas-preditivos/index.ts` |
| `const tresMesesAtras = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);` | `supabase/functions/alertas-preditivos/index.ts` |
| `const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];` | `supabase/functions/alertas-preditivos/index.ts` |
| `expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10min TTL` | `supabase/functions/auth-gov-br/index.ts` |
| `timeout: 30000,` | `supabase/functions/backup-automatico/config.ts` |
| `timeout: 30000,` | `supabase/functions/calcular-13-salario/config.ts` |
| `const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();` | `supabase/functions/calcular-13-salario/index.ts` |
| `timeout: 30000,` | `supabase/functions/calcular-ferias/config.ts` |
| `timeout: 30000,` | `supabase/functions/calcular-folha/config.ts` |
| `timeout: 30000,` | `supabase/functions/calcular-rescisao/config.ts` |
| `const DIA_MS = 1000 * 60 * 60 * 24;` | `supabase/functions/calcular-rescisao/motor.ts` |
| `const CEP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;` | `supabase/functions/consultarCEP/index.ts` |
| `const CNPJ_CACHE_TTL_MS = 24 * 60 * 60 * 1000;` | `supabase/functions/consultarCNPJ/index.ts` |
| `timeout: 30000,` | `supabase/functions/enviar-esocial/config.ts` |
| `timeout: 30000,` | `supabase/functions/enviar-relatorio/config.ts` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `supabase/functions/folha-metrics/index.ts` |
| `timeout: 30000,` | `supabase/functions/gerar-guias/config.ts` |
| `timeout: 30000,` | `supabase/functions/gerar-holerite/config.ts` |
| `timeout: 30000,` | `supabase/functions/processar-agendamentos/config.ts` |
| `const DUE_WINDOW_MS = 30 * 60 * 1000;` | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `const MAX_CATCH_UP_DELAY_MS = 24 * 60 * 60 * 1000;` | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `target = { ...addDays(target, 1), ...time };` | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `timeout: 30000,` | `supabase/functions/processar-ponto/config.ts` |
| `timeout: 30000,` | `supabase/functions/sincronizar-bitrix/config.ts` |
| `const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos` | `supabase/functions/tabelas-dominio/index.ts` |
| `data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),` | `supabase/migrations/20251220151012_8b801cd7-7ca6-4978-807f-9d741b8ca4ea.sql` |
| `expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),` | `supabase/migrations/20251231124528_43e243cd-475a-4405-b4d9-77b4bfde5fdf.sql` |
| `SELECT (m + interval '1 month')::date` | `supabase/migrations/20260509122342_03e1533f-b165-4618-be38-8eb25a1da535.sql` |
| `expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '10 minutes')` | `supabase/migrations/20260509133327_2e3e0571-201c-4a43-bf9c-6248c7f090bd.sql` |
| `('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'JOAO-2026', 'joao.silva@exemplo.com', now() + interval '7 days'),` | `supabase/migrations/20260509152204_b3bfb6df-c0bf-41a8-bd66-4769fa3a96c1.sql` |
| `('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'PEDRO-SALE', 'pedro.santos@exemplo.com', now() + interval '7 days')` | `supabase/migrations/20260509152204_b3bfb6df-c0bf-41a8-bd66-4769fa3a96c1.sql` |
| `DELETE FROM public.logs_sistema WHERE created_at < now() - interval '30 days';` | `supabase/migrations/20260513191548_9b11aa2c-8ca9-4607-8430-e6831327b858.sql` |
| `(data_adm + ((anos_completos + 1) * interval '1 year') - interval '1 day')::DATE;` | `supabase/migrations/20260513192749_b5058fc2-d067-4afe-a3d1-95ef70138970.sql` |
| `(data_adm + (anos_completos * interval '1 year'))::DATE,` | `supabase/migrations/20260513192749_b5058fc2-d067-4afe-a3d1-95ef70138970.sql` |
| `CASE WHEN _validade_meses > 0 THEN (CURRENT_DATE + (_validade_meses * interval '1 month'))::DATE ELSE NULL END` | `supabase/migrations/20260513193156_bc992237-d9ae-4c9a-aebb-fcf110a1ff73.sql` |
| `DELETE FROM public.login_rate_limits WHERE created_at < now() - interval '24 hours';` | `supabase/migrations/20260515183054_5d2a76a6-0367-4d14-933f-7f345ddb3dde.sql` |
| `expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),` | `supabase/migrations/20260712184140_0536e2cb-6844-417e-86f6-23fe7e74656a.sql` |
| `/ NULLIF(COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours'), 0),` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `100.0 * COUNT(*) FILTER (WHERE status = 'failed' AND created_at > now() - interval '24 hours')` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS total_24h,` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS total_7d,` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `COUNT(*) FILTER (WHERE response_status = 409 AND created_at > now() - interval '24 hours') AS conflict_24h,` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `COUNT(*) FILTER (WHERE status = 'completed' AND created_at > now() - interval '24 hours') AS completed_24h,` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `COUNT(*) FILTER (WHERE status = 'failed' AND created_at > now() - interval '24 hours') AS failed_24h,` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `COUNT(*) FILTER (WHERE status = 'pending' AND created_at > now() - interval '24 hours') AS pending_24h,` | `supabase/migrations/20260712202725_b309f560-f8b7-4061-866d-e8fb64779274.sql` |
| `AND created_at < now() - interval '10 minutes'` | `supabase/migrations/20260712203121_8562a409-33b5-4785-ace8-f055d7993a92.sql` |
| `AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260712203121_8562a409-33b5-4785-ace8-f055d7993a92.sql` |
| `DELETE FROM public.folha_lock_conflicts WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql` |
| `DELETE FROM public.geo_blocked_attempts WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260712215808_8c16ff4b-eb80-4fbb-a8c6-c15c62ed93c7.sql` |
| `WHERE start_time > now() - interval '24 hours'` | `supabase/migrations/20260712222252_1d964bbd-0cff-41f7-9bcb-496036476e63.sql` |
| `AND created_at >= now() - interval '10 minutes'` | `supabase/migrations/20260713124926_a1152a5e-9744-4462-9fc2-f423c57445bb.sql` |
| `_window constant interval := interval '5 minutes';` | `supabase/migrations/20260713124926_a1152a5e-9744-4462-9fc2-f423c57445bb.sql` |
| `AND created_at >= now() - interval '10 minutes'` | `supabase/migrations/20260715154911_30dca9dd-27bf-46ba-a1c7-e1cb3923bf92.sql` |
| `_cooldown_interval constant interval := interval '1 hour';` | `supabase/migrations/20260715154911_30dca9dd-27bf-46ba-a1c7-e1cb3923bf92.sql` |
| `AND created_at >= now() - interval '90 days'` | `supabase/migrations/20260715173728_392ca7e2-2bbc-474b-8158-ccbc730c890b.sql` |
| `WHERE created_at >= now() - interval '30 days'` | `supabase/migrations/20260715173728_392ca7e2-2bbc-474b-8158-ccbc730c890b.sql` |
| `v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/migrations/20260717182238_3ecc597a-1b95-4f4e-904d-48f5edd204cc.sql` |
| `v_periodo_fim := (v_periodo_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/migrations/20260717182238_3ecc597a-1b95-4f4e-904d-48f5edd204cc.sql` |
| `AND n.created_at > now() - interval '7 days'` | `supabase/migrations/20260717205116_801fb7ef-21a5-4601-8da0-9f68d2854166.sql` |
| `OR cg.alerta_vencimento_enviado_em < now() - interval '3 days')` | `supabase/migrations/20260723145602_c2a61f2e-7f49-48f4-9c44-b2fec580f43f.sql` |
| `(t.reminders_enviados = 0 AND t.created_at <= now() - interval '2 days')` | `supabase/migrations/20260723150213_fc3a2a61-bdf1-4e5f-ad3b-b1da5024d07a.sql` |
| `AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at <= now() - interval '12 hours')` | `supabase/migrations/20260723150213_fc3a2a61-bdf1-4e5f-ad3b-b1da5024d07a.sql` |
| `CASE WHEN r.expira_em <= now() + interval '1 day' THEN 'alta' ELSE 'media' END,` | `supabase/migrations/20260723150213_fc3a2a61-bdf1-4e5f-ad3b-b1da5024d07a.sql` |
| `OR (t.reminders_enviados <= 2 AND t.expira_em <= now() + interval '1 day')` | `supabase/migrations/20260723150213_fc3a2a61-bdf1-4e5f-ad3b-b1da5024d07a.sql` |
| `OR (t.reminders_enviados = 1 AND t.created_at <= now() - interval '5 days')` | `supabase/migrations/20260723150213_fc3a2a61-bdf1-4e5f-ad3b-b1da5024d07a.sql` |
| `'expira_em', (now() + interval '10 minutes')` | `supabase/migrations/20260723152056_ad490897-6464-4f4c-86d0-e92a52a658f9.sql` |
| `AND created_at > now() - interval '10 minutes';` | `supabase/migrations/20260723152450_a21491db-9371-4ffd-b928-f6ea93569f2e.sql` |
| `AND created_at > now() - interval '10 minutes';` | `supabase/migrations/20260723152556_1aca4f77-6c8d-4406-b589-a247d41458e3.sql` |
| `AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at < now() - interval '20 hours')` | `supabase/migrations/20260723153630_589ecf53-494d-4834-9e63-d6f4fa1c7822.sql` |
| `AND t.expira_em <= now() + interval '3 days'` | `supabase/migrations/20260723153630_589ecf53-494d-4834-9e63-d6f4fa1c7822.sql` |
| `AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at < now() - interval '20 hours')` | `supabase/migrations/20260723180000_fix_bugs_bot_migs_b1_b2_b3_b7.sql` |
| `AND created_at > now() - interval '10 minutes';` | `supabase/migrations/20260723180000_fix_bugs_bot_migs_b1_b2_b3_b7.sql` |
| `AND t.expira_em <= now() + interval '3 days'` | `supabase/migrations/20260723180000_fix_bugs_bot_migs_b1_b2_b3_b7.sql` |
| `AND created_at > now() - interval '10 minutes';` | `supabase/migrations/20260723210000_fix_verif_auth_v2_ip_inet.sql` |
| `v_window interval := interval '15 minutes';` | `supabase/migrations/20260728180022_cb954a0b-8458-4bf3-ac52-8bb9a44f65ea.sql` |
| `'expires_at', now() + interval '7 days',` | `supabase/migrations/20260728205814_184878ad-cf8c-4222-b6a5-c39e35e48b30.sql` |
| `expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,` | `supabase/migrations/20260728205814_184878ad-cf8c-4222-b6a5-c39e35e48b30.sql` |
| `v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/migrations/20260728220146_f687c8e6-2691-473e-ab7e-d2a2fd9aafb9.sql` |
| `WHERE created_at > now() - interval '24 hours'` | `supabase/migrations/20260830000002_plano100_e036_pii_access_logs.sql` |
| `v_window interval := interval '15 minutes';` | `supabase/migrations/20260911191000_p0_auth_lockout_contract.sql` |
| `OR ra.dispatch_claimed_at < p_now - interval '5 minutes'` | `supabase/migrations/20260912192000_p0_report_schedule_claims.sql` |
| `WHERE scan_at < now() - interval '180 days';` | `supabase/migrations/20260912203000_p1_security_cron_contract.sql` |
| `AND event_claimed_at > now() - interval '5 minutes' THEN` | `supabase/migrations/20260912204000_p1_admission_esocial_claim.sql` |
| `AND a.created_at > now() - interval '1 hour'` | `supabase/migrations/20260912207000_p1_idempotency_monitoring_contract.sql` |
| `AND k.created_at < now() - interval '5 minutes'` | `supabase/migrations/20260912207000_p1_idempotency_monitoring_contract.sql` |
| `WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '1 hour'` | `supabase/migrations/20260912209000_p1_tenant_telemetry_contract.sql` |
| `WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '90 days'` | `supabase/migrations/20260912209000_p1_tenant_telemetry_contract.sql` |
| `locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '5 minutes' ELSE NULL END` | `supabase/migrations/20260924160000_e50_33_pin_quiosque_ponto.sql` |
| `locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '5 minutes' ELSE NULL END` | `supabase/migrations/20260924190000_p0_fix_search_path_pin_quiosque.sql` |
| `v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/migrations/20260924220000_p0_secdef_authz_remediation.sql` |
| `AND created_at > now() - interval '10 minutes';` | `supabase/migrations/20261005160000_wave7_audit_fixes.sql` |
| `AND created_at > now() - interval '10 minutes';` | `supabase/migrations/20261006100000_fix_wave7_contrato_rpcs_regression.sql` |
| `DELETE FROM public.logs_sistema WHERE created_at < now() - interval '30 days';` | `supabase/migrations/20261013130000_fix_broken_cron_jobs.sql` |
| `v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/migrations/20261022000000_qa5_db_fixes.sql` |
| `p_stale_after interval DEFAULT interval '10 minutes'` | `supabase/migrations/20261023120000_training_images_infrastructure.sql` |
| `AND r.started_at < now() - interval '30 minutes'` | `supabase/migrations/20261023130000_training_image_autoqueue.sql` |
| `WHERE scan_at < now() - interval '180 days';` | `supabase/migrations/20261024000000_qa_r4_fixes.sql` |
| `CASE WHEN _validade_meses > 0 THEN (CURRENT_DATE + (_validade_meses * interval '1 month'))::DATE ELSE NULL END` | `supabase/migrations/20261114000300_fn_certificado_treinamento_sem_metadata.sql` |
| `v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/rebaseline/20260902_secdef_authz_remediation.sql` |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
| 1 | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| 20 | `src/components/dashboard/AnalyticsSection.tsx` |
| 10 | `src/components/dashboard/EventTimeline.tsx` |
| 100 | `src/components/ferias/FeriasColetivasTab.tsx` |
| 1 | `src/components/folha/CalculoFolhaWizard.tsx` |
| 20 | `src/components/folha/FolhaAuditTimeline.tsx` |
| 6 | `src/components/folha/FolhaDashboard.tsx` |
| 500 | `src/components/pcs/PcsAvaliacaoTab.tsx` |
| 1 | `src/components/ponto/PontoClockRegister.tsx` |
| 1 | `src/components/portal/PortalDocumentosTab.tsx` |
| 1 | `src/components/portal/PortalRegimentoCard.tsx` |
| 20 | `src/components/relatorios/RelatoriosAgendadosTab.tsx` |
| 50 | `src/components/settings/InlineTabs.tsx` |
| 100 | `src/components/settings/LogsIntegracoesTab.tsx` |
| 10 | `src/components/sst/GerarPgrButton.tsx` |
| 5 | `src/components/ui/command-palette.tsx` |
| 10 | `src/contexts/AuthContext.tsx` |
| 50 | `src/contexts/AuthContext.tsx` |
| 200 | `src/hooks/useContratoTokenTimeline.ts` |
| 200 | `src/hooks/useContratosAssinaturaKPI.ts` |
| 500 | `src/hooks/useContratosVencendo.ts` |
| 500 | `src/hooks/useDocumentos.ts` |
| 1 | `src/hooks/useExecutiveDashboard.ts` |
| 50 | `src/hooks/useNotificacoes.ts` |
| 1 | `src/hooks/useSystemHealth.ts` |
| 1 | `src/hooks/useSystemHealthHistory.ts` |
| 500 | `src/hooks/ferias/useAlertasPagamentoD2.ts` |
| 500 | `src/hooks/ferias/useProgramacaoFerias.ts` |
| 500 | `src/hooks/ferias/useReconciliacaoFolha.ts` |
| 500 | `src/pages/AdminAgendamentoExamesPage.tsx` |
| 500 | `src/pages/AdminAsoWorkflowPage.tsx` |
| 500 | `src/pages/AdminCatPage.tsx` |
| 500 | `src/pages/AdminClinicasPartnersPage.tsx` |
| 1 | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| 200 | `src/pages/AdminEpisFichasPage.tsx` |
| 500 | `src/pages/AdminExtintoresPage.tsx` |
| 500 | `src/pages/AdminPontoDivergenciasPage.tsx` |
| 50 | `src/pages/AdminRegimentoInternoPage.tsx` |
| 200 | `src/pages/AdminSecurityPage.tsx` |
| 500 | `src/pages/AdminTelemetriaPage.tsx` |
| 200 | `src/pages/BancoHorasPage.tsx` |
| 500 | `src/pages/ContratosGeradosPage.tsx` |
| 1 | `src/pages/DashboardPage.tsx` |
| 500 | `src/pages/FolhaCompliancePage.tsx` |
| 1 | `src/pages/MovimentacoesPage.tsx` |
| 100 | `src/pages/NotificacoesPage.tsx` |
| 1 | `src/pages/PassivoTrabalhistaPage.tsx` |
| 500 | `src/pages/PensoesPage.tsx` |
| 1 | `src/pages/PortalPage.tsx` |
| 3 | `src/pages/PortalPage.tsx` |
| 5 | `src/pages/PortalPage.tsx` |
| 6 | `src/pages/PortalPage.tsx` |
| 8 | `src/pages/PortalPage.tsx` |
| 10 | `src/pages/ProvisoesPage.tsx` |
| 6 | `src/pages/ProvisoesPage.tsx` |
| 50 | `src/pages/SSTPage.tsx` |
| 1 | `src/pages/ValesPage.tsx` |
| 100 | `src/pages/ValesPage.tsx` |
| 10 | `src/services/afastamentoService.ts` |
| 50 | `src/services/auditoriaService.ts` |
| 200 | `src/services/canalContabilidadeService.ts` |
| 200 | `src/services/contratoTemplateService.ts` |
| 500 | `src/services/desligamentoService.ts` |
| 200 | `src/services/documentoService.ts` |
| 50 | `src/services/esocialService.ts` |
| 500 | `src/services/folhaService.ts` |
| 1 | `src/services/integracaoService.ts` |
| 50 | `src/services/integracaoService.ts` |
| 1 | `src/services/onboardingJornadaService.ts` |
| 100 | `src/services/pcsService.ts` |
| 1 | `src/services/premiacoesService.ts` |
| 100 | `src/services/securityService.ts` |
| 500 | `src/services/securityService.ts` |
| 1 | `src/services/turnoService.ts` |
| 1 | `src/services/vinculoService.ts` |
| 50 | `src/services/webhookService.ts` |
| 1 | `src/services/workflowService.ts` |
| 1 | `src/services/tabelas/adminService.ts` |
| 100 | `src/services/tabelas/adminService.ts` |
| 50 | `src/services/tabelas/adminService.ts` |
| 1 | `src/services/tabelas/rhService.ts` |
| 1 | `supabase/functions/adiantamento-salarial/index.ts` |
| 100 | `supabase/functions/alertas-dp/index.ts` |
| 20 | `supabase/functions/alertas-dp/index.ts` |
| 100 | `supabase/functions/assinaturaDigital/index.ts` |
| 10 | `supabase/functions/auditoria/index.ts` |
| 5 | `supabase/functions/auth-gov-br/index.ts` |
| 1 | `supabase/functions/backup/index.ts` |
| 1 | `supabase/functions/backup-automatico/index.ts` |
| 50 | `supabase/functions/backup-automatico/index.ts` |
| 1 | `supabase/functions/calcular-13-salario/index.ts` |
| 1 | `supabase/functions/calcular-ferias/index.ts` |
| 1 | `supabase/functions/dctfweb/index.ts` |
| 1 | `supabase/functions/fgts-digital/index.ts` |
| 1 | `supabase/functions/gerar-guias/index.ts` |
| 1 | `supabase/functions/gerar-pgr/index.ts` |
| 50 | `supabase/functions/integracao/index.ts` |
| 1 | `supabase/functions/limpeza/index.ts` |
| 1 | `supabase/functions/metricas/index.ts` |
| 2 | `supabase/functions/metricas/index.ts` |
| 200 | `supabase/functions/metricas/index.ts` |
| 10 | `supabase/functions/metrics/index.ts` |
| 50 | `supabase/functions/notificacao/index.ts` |
| 1 | `supabase/functions/processar-ponto/index.ts` |
| 1 | `supabase/functions/sincronizar-bitrix/index.ts` |

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| VITE_REACT_COMPILER=1 exige o pacote oxc-transform-react: npm i -D oxc-transform-react | `vite.config.ts` |
| E2E_NON_ADMIN_PASSWORD não definido — configure o secret (senha não fica no repo). | `e2e/auth-non-admin.setup.ts` |
| Desafio TOTP não completou — a página não saiu de /login. | `e2e/auth.setup.ts` |
| E2E_TOTP_SECRET não é base32 válido | `e2e/auth.setup.ts` |
| E2E_USER_PASSWORD não definido — configure o secret (senha não fica no repo). | `e2e/auth.setup.ts` |
| Login caiu no desafio TOTP mas E2E_TOTP_SECRET não está configurado. | `e2e/auth.setup.ts` |
| Login não saiu de /login e o desafio TOTP não apareceu. | `e2e/auth.setup.ts` |
| MFA verify do E2E falhou: ${JSON.stringify(verified)} | `e2e/auth.setup.ts` |
| Payload too large | `public/sw-custom.js` |
| Não foi possível localizar ${name} | `scripts/audit-bridge-frontend-contract.mjs` |
| TypeScript não carregou ${file} | `scripts/audit-edge-syntax.mjs` |
| falha fixture | `scripts/automation.unit.mjs` |
| A migração gerada não contém a role dp_mcp_role — o prelude não foi incluído. | `scripts/build-rebaseline.mjs` |
| A migração gerada não contém nenhum CREATE TABLE — o dump pode estar vazio ou corrompido. | `scripts/build-rebaseline.mjs` |
| A migração gerada tem apenas ${result.length} bytes — esperado > 50 kB para um dump completo. | `scripts/build-rebaseline.mjs` |
| A migração não pode conter metacomandos exclusivos do psql. | `scripts/build-rebaseline.mjs` |
| A migração não pode recriar o schema public gerenciado. | `scripts/build-rebaseline.mjs` |
| A migração squash não pode conter dados de Auth ou negócio. | `scripts/build-rebaseline.mjs` |
| ${email} já existe no projeto — usar conta dedicada de teste ou E2E_ALLOW_EXISTING_ACCOUNT=1 para sobrescrever senha/roles | `scripts/provision-e2e-users.mjs` |
| esperado um objeto { diretório: número } | `scripts/ratchet-any-tests.mjs` |
| esperado um objeto { diretório: número } | `scripts/ratchet-any.mjs` |
| esperado um objeto { regra: número } | `scripts/ratchet-lint-warnings.mjs` |
| GitHub API ${res.status}: ${url} | `scripts/report-workflows.mjs` |
| GitHub API inacessível (rede): ${err.message} | `scripts/report-workflows.mjs` |
| SUPABASE_DB_URL ausente | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL deve apontar para o database postgres | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL deve exigir TLS com sslmode=require, verify-ca ou verify-full | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL deve usar postgresql:// | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não contém senha | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não pertence ao projeto canônico | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não pode sobrescrever host, porta, database, usuário ou sslmode na query string | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não é uma URI válida | `scripts/validate-canonical-db-url.mjs` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| eslint falhou (exit ${r.code}):\n${(r.stderr \|\| r.stdout).slice(0, 2000)} | `scripts/autofix/lib.mjs` |
| eslint não devolveu JSON (exit ${r.code}):\n${(r.stderr \|\| r.stdout).slice(0, 2000)} | `scripts/autofix/lib.mjs` |
| prettier --list-different falhou (exit ${r.code}):\n${r.stderr \|\| r.stdout} | `scripts/autofix/lib.mjs` |
| prettier falhou:\n${r.stderr \|\| r.stdout} | `scripts/autofix/lib.mjs` |
| ${wt} existe mas não é um worktree do autofix (branch  | `scripts/autofix/run.mjs` |
| ${wt} tem alterações não commitadas; resolva antes (git -C ${wt} status) | `scripts/autofix/run.mjs` |
| eslint --fix restrito falhou (exit ${r.code}): ${(r.stderr \|\| r.stdout).slice(0, 500)} | `scripts/autofix/run.mjs` |
| outra execução do autofix está ativa (${LOCK}) | `scripts/autofix/run.mjs` |
| tsc quebrou na linha de base:\n${baseTsc.raw.slice(0, 1500)} | `scripts/autofix/run.mjs` |
| ${metodo} ${caminho} -> ${r.status} | `scripts/ci/actions-kpi.mjs` |
| network disabled in fixture | `scripts/ci/branch-hygiene-runtime.unit.mjs` |
| PR sem headRefName | `scripts/ci/branch-podaveis.mjs` |
| a lista de PRs abertas não é um array | `scripts/ci/branch-podaveis.mjs` |
| a lista de PRs abertas veio cheia (${dados.length} >= limite ${limite}); pode haver PR que não veio | `scripts/ci/branch-podaveis.mjs` |
| argumento inválido: ${chave} | `scripts/ci/branch-podaveis.mjs` |
| falta --${obrigatorio} | `scripts/ci/branch-podaveis.mjs` |
| GitHub API ${method} ${path} → ${res.status}: ${text} | `scripts/ci/github-settings-guard.mjs` |
| gh mock não coberto: ${method} ${path} | `scripts/ci/issue-rotativa.unit.mjs` |
| loop sem teto: mock abortou após 150 chamadas | `scripts/ci/issue-rotativa.unit.mjs` |
| Argumento inválido: ${key ??  | `scripts/db/classify-migration-drift.mjs` |
| --max-pending inválido: ${args.get( | `scripts/db/derive-pending-migrations.mjs` |
| Argumento inválido: ${key ??  | `scripts/db/derive-pending-migrations.mjs` |
| --entrada exige o caminho do arquivo com as respostas do banco.sql | `scripts/inventario/gerar-banco.mjs` |
| CANONICAL_SUPABASE_REF=${ref} nao e o projeto canonico (${PROJETO_CANONICO}). | `scripts/inventario/gerar-banco.mjs` |
| DATABASE_URL deve usar postgresql:// | `scripts/inventario/gerar-banco.mjs` |
| DATABASE_URL nao aponta para o projeto canonico (${ref}). | `scripts/inventario/gerar-banco.mjs` |
| DATABASE_URL nao e uma URI valida | `scripts/inventario/gerar-banco.mjs` |
| Management API /functions respondeu HTTP ${res.status} | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco canonico: ${comuns} de ${esperadas.size} tabelas do  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco canonico: ledger com ${registros} registros e maior versao ${max};  | `scripts/inventario/gerar-banco.mjs` |
| a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql. | `scripts/inventario/gerar-banco.mjs` |
| entrada sem tabelas | `scripts/inventario/gerar-banco.mjs` |
| secao obrigatoria  | `scripts/inventario/gerar-banco.mjs` |
| sem --entrada e sem DATABASE_URL: nada para ler (veja o cabecalho do script). | `scripts/inventario/gerar-banco.mjs` |
| failed | `scripts/maintenance/lib.mjs` |
| missing_dependencies | `scripts/maintenance/lib.mjs` |
| skipped_busy | `scripts/maintenance/lib.mjs` |
| formatter fixture failed | `scripts/maintenance/maintenance.unit.mjs` |
| blocked_network_sandbox | `scripts/maintenance/run.mjs` |
| pending_patch | `scripts/maintenance/run.mjs` |
| Bearer ausente no header Authorization | `scripts/regras_negocio/test_generate.py` |
| chave obrigatória {secret_key} | `scripts/regras_negocio/test_generate.py` |
| header inválido: Bearer {bearer} | `scripts/regras_negocio/test_generate.py` |
| token obrigatório {access_token} | `scripts/regras_negocio/test_generate.py` |
| tsRequire: caminho deve ser absoluto (recebido:  | `scripts/simulacao/_lib/ts-require.cjs` |
| cron.job filtrado pelo RLS do pg_cron para este papel (sem BYPASSRLS): lista de jobs não verificável | `scripts/supabase_snapshot/snapshot.py` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema pgmq | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema storage | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| No Windows, defina DENO_BIN com o caminho do executável do deno — o fallback por npx não roda sem shell. | `scripts/training-images-local/edge-http-test.mjs` |
| storage local indisponível | `scripts/training-images-local/pipeline-e2e.ts` |
| );   banner.style.cssText =      | `src/main.tsx` |
| [BOOT] Variáveis Supabase ausentes — inicialização abortada. | `src/main.tsx` |
| Bridge instável | `src/components/admin/HealthTrendCard.tsx` |
| Empresa ativa não carregada. | `src/components/admissoes/AdmissoesKanban.tsx` |
| Candidato sem e-mail cadastrado e sem link de portal vigente. | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
|              className= | `src/components/admissoes/GestaoKits.tsx` |
| Erro de Segurança | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Erro no Upload | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Não foi possível excluir o documento agora. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| O arquivo está vazio ou corrompido. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| O arquivo é muito grande. O limite é de 10MB. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Tipo de arquivo não suportado. Use PDF, JPG ou PNG. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| useHighlight must be used within a HighlightProvider | `src/components/animate-ui/primitives/effects/highlight.tsx` |
| A avaliação ainda não reúne os dados mínimos para ser concluída. | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| A justificativa deve ter ao menos ${MIN_CARACTERES_JUSTIFICATIVA} caracteres. | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Decisão NÃO registrada: ${mensagemDeErro(erro)} | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Não foi possível atualizar a avaliação: ${mensagemDeErro(erro)} | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| O motivo do cancelamento deve ter ao menos ${MIN_CARACTERES_MOTIVO} caracteres. | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Potencial não validado: ${mensagemDeErro(erro)} | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Não foi possível exportar a trilha agora. | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| A operação não foi confirmada: o status retornado (${status \|\|  | `src/components/avaliacao/execucaoFeedback.ts` |
| O Potencial só pode ser validado com a avaliação do Gestor (obrigatória) concluída para este ciclo. | `src/components/avaliacao/servicoDemo.ts` |
| O armazenamento demonstrativo não confirmou a alteração. | `src/components/avaliacao/servicoDemo.ts` |
| justificativa_obrigatoria | `src/components/avaliacao/servicoDemo.ts` |
| perfil_nao_autorizado | `src/components/avaliacao/servicoDemo.ts` |
| transicao_invalida | `src/components/avaliacao/servicoDemo.ts` |
| Data do exame é obrigatória | `src/components/colaborador-detalhes/ASOTab.tsx` |
| Erro ao registrar ASO | `src/components/colaborador-detalhes/ASOTab.tsx` |
| Tipo é obrigatório | `src/components/colaborador-detalhes/ASOTab.tsx` |
| Erro ao adicionar anotação | `src/components/colaborador-detalhes/AnotacoesTab.tsx` |
| Título é obrigatório | `src/components/colaborador-detalhes/AnotacoesTab.tsx` |
| >             {erroSalvar}           </p>         )}         {carregando ? (           <Spinner />         ) : falhou ? (           <FalhaConsulta o= | `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx` |
| Erro ao salvar documento | `src/components/colaborador-detalhes/ColaboradorDocuments.tsx` |
| Nome do documento é obrigatório | `src/components/colaborador-detalhes/ColaboradorDocuments.tsx` |
| Agência é obrigatória | `src/components/colaborador-detalhes/ContasBancariasTab.tsx` |
| Conta é obrigatória | `src/components/colaborador-detalhes/ContasBancariasTab.tsx` |
| Erro ao adicionar conta | `src/components/colaborador-detalhes/ContasBancariasTab.tsx` |
| Nome do banco é obrigatório | `src/components/colaborador-detalhes/ContasBancariasTab.tsx` |
| Erro ao adicionar dependente | `src/components/colaborador-detalhes/DependentesTab.tsx` |
| Nome é obrigatório | `src/components/colaborador-detalhes/DependentesTab.tsx` |
| Parentesco é obrigatório | `src/components/colaborador-detalhes/DependentesTab.tsx` |
| Erro ao adicionar documento | `src/components/colaborador-detalhes/DocumentosPessoaisTab.tsx` |
| Tipo de documento é obrigatório | `src/components/colaborador-detalhes/DocumentosPessoaisTab.tsx` |
|  className= | `src/components/colaborador-detalhes/EditarJornadaDialog.tsx` |
| Apenas administradores e RH podem editar contatos de emergência (contêm telefone e e-mail). | `src/components/colaborador-detalhes/EmergenciaTab.tsx` |
| Informe pelo menos um telefone | `src/components/colaborador-detalhes/EmergenciaTab.tsx` |
| Nome é obrigatório | `src/components/colaborador-detalhes/EmergenciaTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/EstagiarioTab.tsx` |
| Instituição de ensino é obrigatória | `src/components/colaborador-detalhes/EstagiarioTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/EstrangeiroTab.tsx` |
| País de origem é obrigatório | `src/components/colaborador-detalhes/EstrangeiroTab.tsx` |
| Data de início é obrigatória | `src/components/colaborador-detalhes/ExperienciaTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/ExperienciaTab.tsx` |
| Escolaridade é obrigatória | `src/components/colaborador-detalhes/FormacaoTab.tsx` |
| Data e motivo são obrigatórios | `src/components/colaborador-detalhes/HistoricoContratosTab.tsx` |
| Data de vigência é obrigatória | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Erro ao registrar alteração | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Motivo é obrigatório | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Salário deve ser maior que zero | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/PCDTab.tsx` |
| Tipo de deficiência é obrigatório | `src/components/colaborador-detalhes/PCDTab.tsx` |
| Erro ao adicionar formação | `src/components/colaborador-detalhes/desenvolvimento/FormacaoQualificacoesCard.tsx` |
| Escolaridade é obrigatória | `src/components/colaborador-detalhes/desenvolvimento/FormacaoQualificacoesCard.tsx` |
| Erro ao inscrever em treinamento | `src/components/colaborador-detalhes/desenvolvimento/TreinamentosCard.tsx` |
| Erro ao adicionar anotação | `src/components/colaborador-detalhes/documentos/AnotacoesInternasCard.tsx` |
| Título é obrigatório | `src/components/colaborador-detalhes/documentos/AnotacoesInternasCard.tsx` |
| Arquivo não encontrado. | `src/components/colaborador-detalhes/documentos/DocumentosDigitaisCard.tsx` |
| Empresa não identificada. | `src/components/colaborador-detalhes/documentos/DocumentosDigitaisCard.tsx` |
| Nome do documento é obrigatório | `src/components/colaborador-detalhes/documentos/DocumentosDigitaisCard.tsx` |
| Arquivo não encontrado. | `src/components/colaborador-detalhes/documentos/DocumentosPessoaisCard.tsx` |
| Empresa não identificada. | `src/components/colaborador-detalhes/documentos/DocumentosPessoaisCard.tsx` |
| Tipo de documento é obrigatório | `src/components/colaborador-detalhes/documentos/DocumentosPessoaisCard.tsx` |
| ; import { useHistoricoColaborador } from  | `src/components/colaborador-detalhes/historico/HistoricoColaborador.tsx` |
| Data e motivo são obrigatórios | `src/components/colaborador-detalhes/historico/HistoryCreateContractDialog.tsx` |
| Data de vigência é obrigatória | `src/components/colaborador-detalhes/historico/HistoryCreateSalaryDialog.tsx` |
| Erro ao registrar alteração | `src/components/colaborador-detalhes/historico/HistoryCreateSalaryDialog.tsx` |
| Motivo é obrigatório | `src/components/colaborador-detalhes/historico/HistoryCreateSalaryDialog.tsx` |
| Salário deve ser maior que zero | `src/components/colaborador-detalhes/historico/HistoryCreateSalaryDialog.tsx` |
|  className= | `src/components/dashboard/EventTimeline.tsx` |
| O provedor não confirmou a entrega dos alertas. | `src/components/dashboard/MorningBriefing.tsx` |
| Selecione uma empresa antes de disparar alertas. | `src/components/dashboard/MorningBriefing.tsx` |
| Selecione uma empresa para carregar o briefing. | `src/components/dashboard/MorningBriefing.tsx` |
| Selecione uma empresa antes de disparar alertas. | `src/components/dashboard/SystemStatusCard.tsx` |
| Informe o nome do departamento | `src/components/departamentos/NovoDepartamentoDialog.tsx` |
| Não é possível inativar  | `src/components/departamentos/NovoDepartamentoDialog.tsx` |
| Salário base e data de desligamento são obrigatórios para o cálculo | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| Selecione o colaborador e a data de desligamento | `src/components/desligamentos/NovoDesligamentoDialog.tsx` |
| Não foi possível copiar os dados do evento. | `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx` |
| Informe o nome do sindicato | `src/components/ferias/FeriasColetivasTab.tsx` |
| Não foi possível baixar: ${e instanceof Error ? e.message : String(e)} | `src/components/ferias/FeriasColetivasTab.tsx` |
|  className= | `src/components/ferias/FeriasForm.tsx` |
| ; import { History, CheckCircle2, AlertTriangle, ShieldAlert } from  | `src/components/ferias/FeriasReconciliacaoHistoricoCard.tsx` |
| A configuração da empresa atual ainda não foi carregada. | `src/components/folha/CNABDialog.tsx` |
| Existem ${rubricasInvalidas.length} rubricas com divergências eSocial. Corrija-as antes de calcular. | `src/components/folha/CalculoFolhaWizard.tsx` |
| Folha não encontrada para essa competência | `src/components/folha/DistribuirHoleritesButton.tsx` |
| Selecione ao menos um canal | `src/components/folha/DistribuirHoleritesButton.tsx` |
| Colaborador, rubrica e valor positivo são obrigatórios. | `src/components/folha/LancamentosDialog.tsx` |
| Referência deve ser numérica (ex.: 10 para 10 horas). | `src/components/folha/LancamentosDialog.tsx` |
| Apenas administradores podem exportar o relatório contábil (contém CPF integral). | `src/components/folha/RelatorioContabilDialog.tsx` |
| Nenhum dado encontrado para esta folha. | `src/components/folha/RelatorioContabilDialog.tsx` |
| Divergência eSocial: ${errorMsg} | `src/components/folha/RubricasDialog.tsx` |
| Nenhuma rubrica foi alterada. Verifique se você tem permissão para editar esta rubrica. | `src/components/folha/RubricasDialog.tsx` |
| Arquivo de remessa ainda não disponível | `src/components/integracoes/ConfigPanels.tsx` |
| Erro ao salvar configuração | `src/components/integracoes/ConfigPanels.tsx` |
| Preencha código do banco, agência, conta, dígito da conta e convênio. | `src/components/integracoes/ConfigPanels.tsx` |
| URL do webhook deve usar https. | `src/components/integracoes/ConfigPanels.tsx` |
| URL do webhook inválida. | `src/components/integracoes/ConfigPanels.tsx` |
| URL do webhook não pode apontar para host local. | `src/components/integracoes/ConfigPanels.tsx` |
| ; import { Copy, Check, ShieldCheck, Loader2 } from  | `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx` |
| Não foi possível copiar automaticamente. Selecione e copie o link. | `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx` |
| Não foi possível gerar o link. | `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx` |
| ; import { Badge } from  | `src/components/medidas-disciplinares/MedidaContestacaoDialog.tsx` |
| Transição inválida: ${origem} → ${alvo} | `src/components/medidas-disciplinares/MedidasKanban.tsx` |
| Nada a exportar — gere a matriz salarial primeiro. | `src/components/pcs/PcsEquidadeTab.tsx` |
| ; import { Badge } from  | `src/components/ponto/AssinarEspelhoDialog.tsx` |
| Divergência detectada: hash não bate | `src/components/ponto/AssinarEspelhoDialog.tsx` |
| PIN deve ter de 4 a 6 dígitos | `src/components/ponto/DefinirPinQuiosqueDialog.tsx` |
| PINs não conferem | `src/components/ponto/DefinirPinQuiosqueDialog.tsx` |
| Data inicial não pode ser posterior à final | `src/components/ponto/GerarAEJDialog.tsx` |
| Falha ao gerar AEJ:  | `src/components/ponto/GerarAEJDialog.tsx` |
| Informe o período completo | `src/components/ponto/GerarAEJDialog.tsx` |
| Selecione uma empresa | `src/components/ponto/GerarAEJDialog.tsx` |
| Data inicial não pode ser posterior à final | `src/components/ponto/GerarAFDDialog.tsx` |
| Falha ao gerar AFD:  | `src/components/ponto/GerarAFDDialog.tsx` |
| Informe o período completo | `src/components/ponto/GerarAFDDialog.tsx` |
| Selecione uma empresa | `src/components/ponto/GerarAFDDialog.tsx` |
| ${aprovados} de ${ids.length} registros aprovados; ${ids.length - aprovados} ignorados (já aprovados ou sem permissão). | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| Nenhum dado para exportar | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| Nenhum registro foi aprovado: os selecionados já estavam aprovados ou você não tem permissão de RH nesta empresa. | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| Selecione uma empresa para aprovar registros. | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| Sessão expirada. Faça login novamente. | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| Arquivo excede 10MB | `src/components/ponto/ImportarAFDTDialog.tsx` |
| Empresa não selecionada | `src/components/ponto/ImportarAFDTDialog.tsx` |
| Selecione um arquivo .txt | `src/components/ponto/ImportarAFDTDialog.tsx` |
| Acesso à câmera é obrigatório para biometria. | `src/components/ponto/PontoClockRegister.tsx` |
| Colaborador ou empresa não identificados localmente | `src/components/ponto/PontoClockRegister.tsx` |
| Colaborador ou empresa não identificados para o upload biométrico | `src/components/ponto/PontoClockRegister.tsx` |
| Ponto registrado em modo OFFLINE. Será sincronizado quando a conexão voltar. | `src/components/ponto/PontoClockRegister.tsx` |
| ${inc.colaborador} não tem login vinculado; não é possível enviar a cobrança. | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| Registro de ponto sem empresa vinculada. | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| Sem permissão para aprovar este registro. | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| Sessão expirada. Entre novamente. | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| Empresa não identificada | `src/components/portal/PortalDocumentosTab.tsx` |
| Erro ao baixar arquivo | `src/components/portal/PortalDocumentosTab.tsx` |
| Selecione um arquivo e tipo | `src/components/portal/PortalDocumentosTab.tsx` |
| Erro ao atualizar dados | `src/components/portal/PortalMeusDadosTab.tsx` |
| Você precisa confirmar a leitura antes de assinar. | `src/components/portal/PortalRegimentoCard.tsx` |
| A campanha foi criada, mas nem todas as regras foram salvas. | `src/components/premiacoes/CampaignWizard.tsx` |
| Empresa não identificada. | `src/components/premiacoes/CampaignWizard.tsx` |
| Erro ao criar campanha. | `src/components/premiacoes/CampaignWizard.tsx` |
| Preencha nome, início e fim da campanha. | `src/components/premiacoes/CampaignWizard.tsx` |
| Toda regra precisa de um nome. | `src/components/premiacoes/CampaignWizard.tsx` |
| ${alvos.length - falhas} de ${alvos.length} aprovados; ${falhas} falharam. | `src/components/premiacoes/PagamentosTab.tsx` |
| Informe um valor válido para a folha. | `src/components/premiacoes/PagamentosTab.tsx` |
| Não foi possível excluir o cenário. | `src/components/premiacoes/RewardsSimulator.tsx` |
| Não foi possível salvar o cenário. | `src/components/premiacoes/RewardsSimulator.tsx` |
|            className={cn(              | `src/components/recrutamento/AnalyticsRecrutamento.tsx` |
|          className= | `src/components/recrutamento/CandidatosPainel.tsx` |
|          data-pipeline-erro         className= | `src/components/recrutamento/PipelineBoard.tsx` |
|          data-vagas-erro         className= | `src/components/recrutamento/VagasPainel.tsx` |
| empresa_id é obrigatório | `src/components/relatorios/reportScheduleContract.ts` |
| Nome do plano é obrigatório. | `src/components/settings/BeneficiosSettingsTab.tsx` |
| Plano não excluído: ele é obrigatório por lei, não pertence à empresa selecionada ou já foi removido. | `src/components/settings/BeneficiosSettingsTab.tsx` |
| Selecione uma empresa. | `src/components/settings/BeneficiosSettingsTab.tsx` |
| Valor inválido (entre 0 e 99.999,99). | `src/components/settings/BeneficiosSettingsTab.tsx` |
| Nome do campo é obrigatório. | `src/components/settings/CamposCustomizadosTab.tsx` |
| Seção inválida. | `src/components/settings/CamposCustomizadosTab.tsx` |
| Tipo de campo inválido. | `src/components/settings/CamposCustomizadosTab.tsx` |
| Chave deve conter apenas letras, números, _ . e - | `src/components/settings/ConfiguracoesGeraisTab.tsx` |
| Chave é obrigatória. | `src/components/settings/ConfiguracoesGeraisTab.tsx` |
| Informe o Anexo do Simples ou uma alíquota efetiva revisada. | `src/components/settings/EmpresaSettingsTab.tsx` |
| Revise RAT, FAP, Terceiros e Encargo efetivo antes de salvar. | `src/components/settings/EmpresaSettingsTab.tsx` |
| Endereço IP inválido. Use formato IPv4 (ex: 192.168.1.1) ou CIDR (ex: 10.0.0.0/24). | `src/components/settings/IPBlockingTab.tsx` |
| Erro ao criar configuração | `src/components/settings/InlineTabs.tsx` |
| Informe o nome de exibição. | `src/components/settings/InlineTabs.tsx` |
| Nenhuma empresa selecionada | `src/components/settings/InlineTabs.tsx` |
| O provedor não confirmou a entrega dos alertas. | `src/components/settings/SystemHealthTab.tsx` |
| Selecione uma empresa antes de disparar alertas. | `src/components/settings/SystemHealthTab.tsx` |
| Selecione uma empresa antes de gerar o backup. | `src/components/settings/SystemHealthTab.tsx` |
| Preencha título e responsável técnico | `src/components/sst/GerarLtcatOsButton.tsx` |
| Selecione uma empresa | `src/components/sst/GerarLtcatOsButton.tsx` |
| Empresa não selecionada | `src/components/sst/GerarPgrButton.tsx` |
| Falha ao gerar link | `src/components/sst/GerarPgrButton.tsx` |
| Informe o responsável técnico | `src/components/sst/GerarPgrButton.tsx` |
| Não foi possível copiar o código | `src/components/treinamentos/CertificadoCard.tsx` |
| Não foi possível copiar o código | `src/components/treinamentos/CertificadoDetalheDialog.tsx` |
|        className= | `src/components/treinamentos/InscricoesPainel.tsx` |
| Data/horário inválidos | `src/components/treinamentos/NovaTurmaDialog.tsx` |
|        className= | `src/components/treinamentos/TreinamentosCatalogo.tsx` |
|        className= | `src/components/treinamentos/TreinamentosTabela.tsx` |
| Erro ao desvincular curso | `src/components/treinamentos/TrilhaCursosSection.tsx` |
| Erro ao vincular | `src/components/treinamentos/TrilhaCursosSection.tsx` |
|        data-turmas-erro       className= | `src/components/treinamentos/TurmasPainel.tsx` |
|  className={cn(alertVariants({ variant }), className)} {...props} /> )); Alert.displayName =  | `src/components/ui/alert.tsx` |
| CEP não encontrado | `src/components/ui/cep-input.tsx` |
| Erro ao consultar CEP | `src/components/ui/cep-input.tsx` |
| CNPJ inválido | `src/components/ui/cnpj-input.tsx` |
| CNPJ não encontrado | `src/components/ui/cnpj-input.tsx` |
| Erro ao consultar CNPJ | `src/components/ui/cnpj-input.tsx` |
| useFormField should be used within <FormField> | `src/components/ui/form.tsx` |
| ;  // Custom UI (active) export * from  | `src/components/ui/index.ts` |
| useSidebar must be used within a SidebarProvider. | `src/components/ui/sidebar.tsx` |
| ; import { motion, AnimatePresence } from  | `src/components/ui/sync-error-state.tsx` |
| Ciclo detectado no fluxo! | `src/components/workflows/WorkflowDesigner.tsx` |
| Conexão já existe | `src/components/workflows/WorkflowDesigner.tsx` |
| Corrija os erros antes de salvar | `src/components/workflows/WorkflowDesigner.tsx` |
| Limite de 50 nós atingido | `src/components/workflows/WorkflowDesigner.tsx` |
| O fluxo contém um ciclo — aprovações precisam formar uma sequência sem retorno. | `src/components/workflows/ordenarEtapas.ts` |
| Senha fraca: ${pwCheck.errors.join( | `src/contexts/AuthContext.tsx` |
| … +661 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `admin` | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| `gestor` | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| `user` | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| `rh` | `src/components/ferias/FeriasTable.tsx` |
| `rh` | `src/components/integracoes/ConfigPanels.tsx` |
| `rh` | `src/components/layout/MobileQuickActions.tsx` |
| `gestor` | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| `rh` | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| `confirmado` | `src/components/ponto/PontoClockRegister.tsx` |
| `pendente` | `src/components/ponto/PontoClockRegister.tsx` |
| `gestor` | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `rh` | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `coordenador` | `src/components/settings/InlineTabs.tsx` |
| `supervisor` | `src/components/settings/InlineTabs.tsx` |
| `admin` | `src/components/settings/UserRolesTab.tsx` |
| `admin` | `src/contexts/AuthContext.tsx` |
| `role` | `src/contexts/AuthContext.tsx` |
| `admin` | `src/hooks/usePiiMask.ts` |
| `rh` | `src/hooks/usePiiMask.ts` |
| `assistant` | `src/pages/AssistenteIAPage.tsx` |
| `user` | `src/pages/AssistenteIAPage.tsx` |
| `admin` | `src/pages/AvaliacaoPage.tsx` |
| `gestor` | `src/pages/AvaliacaoPage.tsx` |
| `rh` | `src/pages/AvaliacaoPage.tsx` |
| `user` | `src/pages/AvaliacaoPage.tsx` |
| `rh` | `src/pages/CanalEticaPage.tsx` |
| `rh` | `src/pages/ComunicacaoInternaPage.tsx` |
| `rh` | `src/pages/ConveniosPage.tsx` |
| `rh` | `src/pages/DepartamentosPage.tsx` |
| `rh` | `src/pages/FeriasPage.tsx` |
| `admin` | `src/pages/FeriasProgramacaoPage.tsx` |
| `rh` | `src/pages/FeriasProgramacaoPage.tsx` |
| `rh` | `src/pages/PensoesPage.tsx` |
| `admin` | `src/pages/PremiacoesPage.tsx` |
| `rh` | `src/pages/PremiacoesPage.tsx` |
| `rh` | `src/pages/SegurosVidaPage.tsx` |
| `granted` | `src/services/pushNotificationService.ts` |
| `service_role` | `supabase/functions/external-db-bridge/access.ts` |
| `supabase_admin` | `supabase/functions/external-db-bridge/access.ts` |
| `true` | `supabase/functions/notificacao/index.ts` |
| `true` | `supabase/functions/reabrir-folha/index.ts` |
| `true` | `supabase/functions/relatorio/index.ts` |
| `admin` | `supabase/migrations/20260619205621_3a99bd41-5d32-4b65-ac90-6f6610ad707b.sql` |
| `admin` | `supabase/migrations/20260712222525_efdf4704-8024-4e4a-8fd4-414856e9b4fe.sql` |
| `admin` | `supabase/migrations/20260723100640_4128fdf3-5b37-4921-a5e6-9b7b981028e1.sql` |
| `rh` | `supabase/migrations/20260723100640_4128fdf3-5b37-4921-a5e6-9b7b981028e1.sql` |
| `admin` | `supabase/migrations/20260723112647_68130105-b66a-48de-b25a-5c3558e72745.sql` |
| `rh` | `supabase/migrations/20260723112647_68130105-b66a-48de-b25a-5c3558e72745.sql` |
| `admin` | `supabase/migrations/20260723120853_5f0b855d-6703-4cda-836a-d929e4729ee7.sql` |
| `admin` | `supabase/migrations/20260723150455_b5f5d45f-981e-4a16-987d-15a9eaf72c51.sql` |
| `rh` | `supabase/migrations/20260723150455_b5f5d45f-981e-4a16-987d-15a9eaf72c51.sql` |
| `admin` | `supabase/migrations/20260729152613_6aa8737b-f56d-4327-b3fe-a5364b28ea97.sql` |
| `gestor` | `supabase/migrations/20260729152613_6aa8737b-f56d-4327-b3fe-a5364b28ea97.sql` |
| `rh` | `supabase/migrations/20260729152613_6aa8737b-f56d-4327-b3fe-a5364b28ea97.sql` |
| `admin` | `supabase/migrations/20260830000001_plano100_e028_storage_buckets_privados.sql` |
| `gestor` | `supabase/migrations/20260830000001_plano100_e028_storage_buckets_privados.sql` |
| `rh` | `supabase/migrations/20260830000001_plano100_e028_storage_buckets_privados.sql` |
| `gestor` | `supabase/migrations/20260912190000_p0_identity_rls_authz.sql` |
| `rh` | `supabase/migrations/20260912190000_p0_identity_rls_authz.sql` |
| `gestor` | `supabase/migrations/20261113000000_remediate_rv04_missing_rpcs.sql` |
| `rh` | `supabase/migrations/20261113000000_remediate_rv04_missing_rpcs.sql` |
| `admin` | `supabase/rebaseline/20260831_storage_remediation.sql` |
| `gestor` | `supabase/rebaseline/20260831_storage_remediation.sql` |
| `rh` | `supabase/rebaseline/20260831_storage_remediation.sql` |

## K. Testes como especificação (9152 testes em 711 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `src/hooks/__tests__/useColaboradorDetalhes.test.ts` | 80 | useDependentes · calls listarDependentes with colaboradorId · returns dependentes from service · is disabled when colaboradorId is empty … |
| `src/schemas/esocial/__tests__/periodicosValidators.test.ts` | 80 | validarS1000 · returns valid=true for complete correct data · returns error when tpInsc is missing · returns error when tpInsc is invalid enum … |
| `src/services/__tests__/colaboradorDetalhesService.test.ts` | 80 | listarDependentes · returns dependentes for colaborador · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/tabelasReferenciaService.test.ts` | 80 | listarNacionalidades · returns records · queries nacionalidades table · returns empty array when data is null … |
| `src/utils/__tests__/rescisaoCalc.test.ts` | 80 | calcINSS — Tabela Progressiva 2026 · edge cases · salary = 0 → INSS = 0 · salary = -100 → INSS = 0 … |
| `src/components/__tests__/FeedbackAcoesRodape.test.tsx` | 76 | modo demonstração — experiência atual preservada · registro FICTÍCIO (mock-*) não renderiza NENHUM controle e não chama o serviço · registro REAL mostra as ações da etapa mesmo com a flag de modo real DESLIGADA · ações visíveis por STATUS — etapa  … |
| `src/services/__tests__/esocialService.test.ts` | 74 | getEventoDescricao · returns known event description for S-1000 · returns description for S-2200 · returns description for S-1200 … |
| `src/hooks/__tests__/useNovasTabelas.test.ts` | 73 | useBatidasPonto · is disabled and returns empty when no colaboradorId · calls batidasPontoService.listar with colaboradorId · returns batidas data … |
| `src/services/__tests__/workflowService.test.ts` | 72 | workflowService.listarDefinicoes · returns definitions without empresa filter · returns empty array when data is null · applies empresa_id filter when provided … |
| `src/lib/__tests__/masks.test.ts` | 71 | maskCPF · formats 11 digits as 000.000.000-00 · strips non-digits before formatting · slices at 14 characters … |
| `src/calculators/__tests__/beneficios.test.ts` | 65 | calcularDecimo13 · parcela 1 returns half the proportional value with no deductions · parcela 2 deducts INSS and IRRF · proportional: 6 months = 50% of salary … |
| `src/components/__tests__/AprovacaoGestor.test.ts` | 64 | situacaoAprovacao — espelho da função SQL · sem versão da avaliação do gestor ⇒ em_preparacao · com versão e SEM decisão ⇒ aguardando_gestor · decisão de OUTRA versão ⇒ volta a aguardar o gestor (aprovação INVALIDADA) … |
| `src/calculators/__tests__/scenarios.test.ts` | 62 | Simulação — INSS (progressivo 2026, teto R$ 8.475,55) · zero e negativos retornam 0 · NaN não propaga (robustez) · piso (salário mínimo 1518) => 113,85 … |
| `src/services/__tests__/afastamentoService.test.ts` | 62 | afastamentoService.listar · returns data and total from supabase · returns empty data when supabase returns null · filters by empresa_id from options.empresaId … |
| `src/components/__tests__/trilhaDerivacoes.test.ts` | 61 | normalizarEvento · lê a linha crua do audit_log (payload achatado) · lê o registro do RPC com o payload aninhado · não quebra com linha vazia e recusa payload que não é objeto … |
| `src/services/__tests__/cnabService.test.ts` | 56 | cnabService.getConfig · returns config when found · returns null when config not found · throws on DB error … |
| `src/components/__tests__/InlineTabs.test.tsx` | 54 | PreferenciasTab · renders Preferências de Interface title · renders Modo Escuro switch label · renders Salvar Alterações button … |
| `src/hooks/__tests__/useTabelasReferencia.test.ts` | 54 | useNacionalidades · calls listarNacionalidades · useTiposDesligamento · calls listarTiposDesligamento and returns data … |
| `src/services/__tests__/avaliacaoService.test.ts` | 50 | avaliacaoService.listarCiclos · returns ciclos without empresa filter · filters by empresa_id when provided · returns empty array when data is null … |
| `src/services/__tests__/premiacoesService.test.ts` | 49 | premiacoesService.listarCampanhas · returns campanhas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/components/__tests__/NineBoxConsolidacao.test.tsx` | 48 | consolidação — escala e validação das notas · aceita apenas notas dentro da escala 1–5 e isola o resto · nota fora da escala não classifica e é contada como problema de dado · consolidação — cenários de avaliação por colaborador … |
| `src/components/__tests__/OrganogramaNode.test.tsx` | 48 | OrganogramaNode · renders department name · shows colaborador count · pluralizes colaborador count correctly … |
| `src/services/__tests__/feriasService.test.ts` | 46 | feriasService.listSolicitacoes · returns data and count from supabase · returns empty data when supabase returns null · filters by empresa_id when provided … |
| `src/calculators/__tests__/tabelas.test.ts` | 44 | tabelas 2026 — integridade dos dados · salário mínimo · SALARIO_MINIMO_2026 é positivo · SALARIO_MINIMO_2026 vale R$ 1.621,00 … |
| `src/services/__tests__/catalogoCursoService.test.ts` | 44 | catalogoCursoService.listarCursos · returns cursos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/tabelas/__tests__/rhService.test.ts` | 44 | configAfastamentosService · obter calls from config_afastamentos · obter throws on error · salvar calls upsert … |
| `src/components/__tests__/LayoutGridSection.test.tsx` | 43 | Row · renders children · has flex class · applies flex-wrap when wrap=true … |
| `src/services/__tests__/recrutamentoService.test.ts` | 41 | recrutamentoService.listarVagas · returns vagas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/colaboradorService.test.ts` | 40 | colaboradorService.listar · returns data and total from supabase · returns empty data with total 0 when supabase returns null · adds or() filter when search is provided … |
| `src/services/__tests__/medidasDisciplinaresService.test.ts` | 40 | medidasDisciplinaresService.listar · returns all medidas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/calculators/__tests__/calculatorExtra.test.ts` | 39 | calcularAvisoPrevioIndenizado · 30 dias para menos de 1 ano de serviço · incrementa 3 dias por ano de serviço (1 ano → 33 dias) · incrementa 3 dias por ano de serviço (5 anos → 45 dias) … |
| `src/schemas/esocial/__tests__/helpers.test.ts` | 39 | required · adds no error for a non-empty string · adds error for empty string · adds error for null … |
| `src/schemas/esocial/__tests__/naoPeriodicosValidators.test.ts` | 39 | validarS2190 · returns valid for complete data · errors when cpfTrab is missing · errors when dtAdm is missing … |
| `src/services/__tests__/turnoService.test.ts` | 39 | turnoService.listarTurnos · returns all turnos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/trainingImages/__tests__/trainingImages.test.ts` | 39 | caminhos do bucket training-images · monta o caminho canônico por tipos de conteúdo · recusa identificadores que quebrariam o escopo do tenant · valida o caminho contra a empresa (isolamento multiempresa) … |
| `src/components/__tests__/PdiDerivacoes.test.tsx` | 37 | pdiComum — categoria de status · mapeia os status reais do banco · trata o status como texto livre (caixa/espaços/acento) · status vazio conta como pendente e desconhecido cai em andamento … |
| `src/lib/__tests__/organogramaTree.test.ts` | 37 | normalizeText · lowercases and strips accents · countTree · counts departamentos and colaboradores recursively … |
| `src/components/__tests__/AprovacaoLocal.test.ts` | 35 | chaveLocal / estado vazio · normaliza ids nulos e monta a chave colaborador x ciclo · estadoLocalVazio nao traz decisao nem historico · ler/gravar/limpar … |
| `src/components/__tests__/Motor360.test.tsx` | 35 | 360 · pesos aprovados · são exatamente Gestor 60 · Pares 25 · Auto 10 · Subordinados 5 · somam 100% e estão centralizados (nenhum número solto no motor) · 360 · cálculo ponderado … |
| `src/services/__tests__/canalContabilidadeService.test.ts` | 35 | canalContabilidadeService.listContatos · returns contacts ordered by nome · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/beneficioService.test.ts` | 34 | beneficioService.listar · returns data and total without filters · returns empty data when null · applies empresa_id filter when provided in filters … |
| `src/components/__tests__/PremiacoesComum.test.ts` | 33 | métricas por campanha · soma orçamento comprometido pelo aprovado e cai no calculado quando falta · conta participantes distintos e ignora repetição do mesmo colaborador · devolve percentuais nulos (sem divisão inválida) quando não há orçamento nem cálculo … |
| `src/components/__tests__/StatusFeedback.test.tsx` | 33 | status — estados e leitura · reconhece os três estados e isola qualquer outro valor · a coluna é texto livre: o código não assume o valor do banco · status — transições permitidas e proibidas … |
| `src/services/__tests__/integracaoService.test.ts` | 33 | cnabService.getConfig · returns config when found · returns null when no config exists · queries cnab_configuracoes with limit 1 … |
| `src/services/trainingImages/__tests__/migration.test.ts` | 33 | migration — bucket e Storage · cria o bucket privado com limite e MIME allowlist · leitura de objeto exige vínculo com a empresa do caminho · escrita de objeto exige admin E vínculo com a empresa … |
| `src/utils/importacao/__tests__/validators.test.ts` | 33 | validarCPF · returns true for valid CPF · returns false for CPFs with all same digits · returns false for CPF with wrong check digits … |
| `src/components/__tests__/AcoesFeedback.test.ts` | 32 | perfilOperador (app_role real: admin\|gestor\|rh\|user) · mapeia os papéis administrativos e operacionais · papel ausente/desconhecido não vira permissão · podeValidarPotencial — exclusivo do RH … |
| `src/pages/__tests__/OnboardingParidade.test.tsx` | 32 | PARIDADE — progresso, conclusão e contadores (mesma fixture) · percentual: a regra nova é idêntica à antiga em TODOS os registros · contadores do topo batem com o cálculo antigo da aba de Admissões · a divisão das abas (em andamento) bate com a régua antiga da Jornada … |
| `src/components/__tests__/FeedbacksDerivacoes.test.tsx` | 31 | feedbacksComum — tipo do feedback (texto livre) · normaliza os quatro tipos reais, aceitando caixa e rótulo por extenso · cai em gestor sem valor utilizável (nunca inventa categoria) · agrupa subordinado no chip de Gestor … |
| `src/lib/cursor.test.ts` | 31 | encodeCursor · encode/decodes string values correctly · encode/decodes numeric values correctly · encode/decodes null values correctly … |
| `src/services/__tests__/auditoriaService.test.ts` | 31 | auditoriaService.listarTrilha · usa a RPC unificada com tenant e filtros explícitos · aceita escopo global apenas como pedido explícito para a RPC autoritativa · rejeita limites fora do contrato antes de consultar o banco … |
| `src/components/__tests__/forms.test.tsx` | 30 | FormField · renders label when provided · renders input · renders error message … |
| `src/components/treinamentos/__tests__/treinamentosDerivacoes.test.ts` | 30 | texto, datas e horas · normaliza acentos e caixa · formata YYYY-MM-DD sem recuo de fuso · devolve — para data ausente ou inválida … |
| `src/services/__tests__/bancoHorasService.test.ts` | 30 | bancoHorasService · listarPorColaborador · queries banco_horas for the given colaboradorId · returns data from supabase … |
| `src/services/__tests__/comunicacaoService.test.ts` | 30 | comunicacaoService.listarComunicados · returns all comunicados without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/despesaService.test.ts` | 29 | despesaService — escritas e storage · criar: aplica defaults de status/tipo e retorna o registro · criar: lança quando insert não retorna registro · aprovar: exige empresaId … |
| `src/services/__tests__/lgpdService.test.ts` | 29 | lgpdService.listarConsentimentos · returns consentimentos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/pesquisaService.test.ts` | 29 | pesquisaService.listar · returns pesquisas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/whatsappService.test.ts` | 29 | whatsappService · getConfig · returns config data when found · returns null when no config found … |
| `src/utils/__tests__/format.test.ts` | 28 | format — resiliência a entradas inválidas · formatDate(%p) → fallback · formatCurrency(%p) → fallback · respeita fallback customizado … |
| `src/pages/__tests__/OnboardingJornada.test.tsx` | 27 | Jornada de Onboarding — card e estado (cobertura herdada) · shows loading spinner while fetching · shows empty state when no onboarding data · renders the collaborator header (name + cargo • departamento + % progress) … |
| `src/schemas/esocial/__tests__/sstValidators.test.ts` | 27 | validarS2210 · returns valid for complete data · errors when cpfTrab is missing · errors for invalid CPF … |
| `src/services/__tests__/admissaoService.test.ts` | 27 | admissaoService.listarAdmissoes · always scopes query by empresa_id (multi-tenant) · returns empty array when supabase returns null · filters by empresa_id when provided … |
| `src/services/__tests__/episService.test.ts` | 27 | episService.listar · returns EPIs without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/securityService.test.ts` | 27 | securityService.getBlockedIps · returns blocked IPs ordered by created_at desc · returns empty array when data is null · throws and logs error on DB failure … |
| `src/components/__tests__/FeedbackCanonico.test.ts` | 26 | campo — ausente ≠ não aplicável ≠ preenchido · distingue os três estados · texto de exibição usa o rótulo padronizado, sem inventar conteúdo · statusCanonico — nomenclaturas históricas … |
| `src/components/__tests__/NineBox360.test.tsx` | 26 | fase E · consolidação 360 dos feedbacks persistidos · agrupa por categoria e aplica os pesos aprovados (4,26) · mapeia os tipos para as quatro categorias (inclui variações) · sem gestor não classifica, mesmo com as demais categorias presentes … |
| `src/components/__tests__/NineBoxDerivacoes.test.tsx` | 26 | nineBoxComum — classificação (regra original preservada) · mantém os limiares do componente anterior · a tolerância a valor vazio saiu daqui: quem valida é  · nomeia os nove quadrantes com a leitura de posição … |
| `src/services/__tests__/batidasPontoService.test.ts` | 26 | batidasPontoService.listar · returns batidas for colaborador · returns empty array when data is null · filters by colaborador_id … |
| `src/components/__tests__/CriacaoFeedbackIntegracao.test.ts` | 25 | textoOuNulo · apara e converte vazio em nulo · assinaturaFeedback (identifica a TENTATIVA) · é estável e ignora a ordem das chaves … |
| `src/services/__tests__/contratoService.test.ts` | 25 | contratoService.listar · returns all contratos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/contratoTemplateService.test.ts` | 25 | contratoTemplateService.listar · returns templates list · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/edgeFunctionsService.test.ts` | 25 | edgeFunctionsService.dispararAlertasDP · calls invoke with  · uses genericBreaker · edgeFunctionsService.enviarRelatorioEmail … |
| `src/services/__tests__/horaExtraService.test.ts` | 25 | horaExtraService.listar · returns records without empresa filter · returns empty array when data is null · applies empresa_id filter when provided … |
| `src/services/__tests__/pontoService.test.ts` | 25 | pontoService.getSettings · returns settings for empresa · returns null when no settings found · throws on DB error … |
| `src/utils/__tests__/folhaCalc.test.ts` | 25 | Motor de Cálculo de Folha (folhaCalc) · deve processar uma folha simples corretamente · deve incluir horas extras e DSR no cálculo · deve calcular 13º salário quando solicitado … |
| `supabase/functions/external-db-bridge/validation.test.ts` | 25 | tabela: injeção rejeitada · tabela: nomes legítimos aceitos · denylist: tabelas sensíveis presentes · colunas: injeção/subquery rejeitada … |
| `src/components/treinamentos/__tests__/trilhasDerivacoes.test.ts` | 24 | título, nível e status · lê titulo ou nome (as duas colunas existentes) · traduz os três níveis reais e nunca inventa · distingue ativo=false de ativo ausente … |
| `src/hooks/__tests__/validators.test.ts` | 24 | required · rejeita null, undefined e string vazia · aceita valores presentes, incluindo 0 e false · isValidEmail … |
| `src/services/__tests__/avaliacaoCriacaoSegura.test.ts` | 24 | flag do Nine-Box desligada NÃO bloqueia a escrita de UUID real · criarFeedbackSeguro chama a RPC com IDs reais · finalizarFeedback chama a RPC com feedback real · finalizarFeedback sem auditoria NÃO é aceito como persistência confirmada … |
| `src/services/__tests__/rescisaoService.test.ts` | 24 | rescisaoService · validarTransicao · should block jumping more than one stage · should block homologation if status is not calculado … |
| `src/services/__tests__/vinculoService.test.ts` | 24 | vinculoService.contarPassagensPorColaboradores · retorna objeto vazio sem chamar o supabase quando não há ids · faz UMA única query .in() para N colaboradores (sem N+1) · 1 vínculo => quantidadePassagens 1, quantidadeRecontratacoes 0 … |
| `src/utils/__tests__/esocialXmlGenerator.test.ts` | 24 | gerarXmlESocial · returns valid XML declaration · wraps output in eSocial root element · uses testing environment by default (tpAmb=2) … |
| `src/components/__tests__/AuditoriaDerivacoes.test.tsx` | 23 | auditoria · normalização tolerante · aceita registro sem os campos opcionais · ignora data inválida sem quebrar · auditoria · títulos legíveis por módulo e ação … |
| `src/components/__tests__/CardProgramacao.test.tsx` | 23 | CardProgramacao · renders colaborador name · renders dias previstos · renders status badge for rascunho … |
| `src/components/__tests__/NineBoxElegibilidade.test.tsx` | 23 | etapa 1 · identificação de suspeita (isolada) · a PRIMEIRA ocorrência nunca é sinalizada; as repetições são · não muta a lista recebida (função pura) · avaliadores diferentes com as MESMAS notas não se sinalizam … |
| `src/components/__tests__/CNABDialog.test.tsx` | 22 | CNABDialog · renders Exportar Bancário trigger button · renders Pagamento de Salários dialog title · renders Código do Banco label … |
| `src/components/__tests__/CalculoFolhaWizard.test.tsx` | 22 | CalculoFolhaWizard · renders Assistente de Cálculo trigger button · renders Assistente de Folha dialog title · renders competencia in dialog header … |
| `src/hooks/__tests__/useBruteForceProtection.test.ts` | 22 | useBruteForceProtection · estado inicial · começa destravado e sem tentativas · superfície de rede … |
| `src/lib/__tests__/utils.test.ts` | 22 | merges class names · deduplicates tailwind classes (tw-merge) · filters falsy values · truncate … |
| `src/schemas/__tests__/validate.test.ts` | 22 | validateInput · rejeita payload vazio · aceita payload parcial válido (update) · rejeita valor fora de domínio mesmo em payload parcial … |
| `src/services/__tests__/faltasService.test.ts` | 22 | faltasService.listar · returns all faltas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/trainingImages/__tests__/pipeline.test.ts` | 22 | fluxo completo (provedor simulado) · gera, valida, sobe e marca succeeded · envia ao provedor o briefing reconstruído no servidor e os identificadores · concorrência e idempotência … |
| `src/utils/__tests__/safeUrl.test.ts` | 22 | isAllowedUrl · allows known supabase host · blocks non-canonical Supabase hosts · allows lovable.app subdomain … |
| `scripts/autofix/regras/dados.test.mjs` | 21 | tokenizador: comentário de bloco aninhado e dollar-quote aninhado · tokenizador: em E · CREATE POLICY  · DO que só VERIFICA (cita pg_class e  … |
| `src/components/__tests__/PortalDocumentosTab.test.tsx` | 21 | PortalDocumentosTab · renders Gestão de Documentos title · renders Enviar Novo button · shows loading spinner when loading … |
| `src/components/treinamentos/__tests__/turmasDerivacoes.test.ts` | 21 | turmasDerivacoes — datas · lê YYYY-MM-DD no fuso local sem recuar um dia · expõe horário apenas quando o timestamp tem hora · inicia a semana na segunda-feira e formata o intervalo … |
| `src/pages/__tests__/OrganogramaPage.test.tsx` | 21 | OrganogramaPage · shows a loading spinner while data is loading · shows the sync error state and allows retry · shows the empty state when there is no structure … |
| `src/schemas/esocial/__tests__/crossFieldValidators.test.ts` | 21 | cronologia de datas · S-2200 rejeita admissão anterior ao nascimento · S-2230 rejeita término de afastamento anterior ao início · S-2299 rejeita desligamento anterior à admissão … |
| `src/services/__tests__/notificacoesService.test.ts` | 21 | criarNotificacao · calls supabase.auth.getUser to get current user · inserts notification with provided fields · uses current user id when payload.user_id is not provided … |
| `src/utils/importacao/__tests__/columnMap.test.ts` | 21 | normalizeHeader · lowercases the header · trims surrounding whitespace · strips diacritics … |
| `src/calculators/__tests__/impostos.test.ts` | 20 | calcularINSS · returns 0 for salary of 0 · returns 0 for negative salary · returns 0 for NaN … |
| `src/components/__tests__/MFASetup.test.tsx` | 20 | MFASetup · shows loading spinner when loading · renders 2FA title · shows Desativado badge when no factors … |
| `src/components/__tests__/MetricCard.test.tsx` | 20 | MetricCard · renders title · renders string value directly · renders AnimatedNumber when rawValue is provided … |
| `src/components/recrutamento/__tests__/candidatosComum.test.ts` | 20 | candidatosComum — situações e contagens · classifica status finais e em processo sem confundir etapa com situação · conta todas as situações sobre o escopo recebido (não só a página) · badge de etapa usa o status final quando existir e a etapa real nos demais … |
| `src/hooks/__tests__/useGenericCrud.test.tsx` | 20 | useGenericCrud · initial state has correct defaults · respects custom initialPageSize · loads items from service after query resolves … |
| `src/services/__tests__/contratacaoService.test.ts` | 20 | contratacaoService.validarDocumento · updates admissao document status and logs audit · sets document flag false when status is rejeitado · throws for a document type the admission checklist does not send … |
| `src/services/__tests__/desligamentoService.test.ts` | 20 | desligamentoService · listar · should call select with colaborador join · should apply limit of 500 … |
| `src/services/__tests__/jornadaHorariosService.test.ts` | 20 | jornadaHorariosService.listar · returns horarios for jornada · returns empty array when data is null · filters by jornada_id … |
| `src/services/trainingImages/__tests__/guardrails.test.ts` | 20 | nenhuma conexão com a OpenAI nesta fase · não há endpoint, SDK ou chave da OpenAI no código do frontend · não há chamada de rede no módulo de provedor nem no serviço de solicitação · .env.example expõe apenas a flag de LEITURA, nunca uma chave de cliente … |
| `src/services/trainingImages/__tests__/openaiProvider.test.ts` | 20 | configuração e chave · sem chave não se declara configurado e não chama fetch · recusa parâmetros fora do contrato antes de qualquer chamada · requisição e resposta … |
| `src/components/__tests__/FeriasForm.test.tsx` | 19 | FeriasForm · não renderiza quando fechado · lista só colaboradores não desligados · envia a solicitação com datas e valores calculados e fecha o diálogo … |
| `src/components/__tests__/LayoutPrimitives.test.tsx` | 19 | PageContainer · renders children · renders title when provided · renders description when provided … |
| `src/components/__tests__/PendenciasAprovacao.test.tsx` | 19 | fila de aprovação — controles padronizados por vínculo · registro REAL com vínculo provado: Ver, Devolver e Aprovar habilitados (nesta ordem) · registro REAL SEM o vínculo: os controles continuam VISÍVEIS, porém desabilitados · registro REAL com vínculo não avaliável ( … |
| `src/components/__tests__/PontoClockRegister.test.tsx` | 19 | PontoClockRegister · renders Registrar Ponto title · renders Entrada button · renders Saída Almoço button … |
| `src/components/treinamentos/__tests__/TrainingCover.test.tsx` | 19 | TrainingCover — imagem real · exibe a URL válida com enquadramento cover e overlays de CSS · URL indisponível cai no fallback e não deixa a capa vazia · não usa URL externa quando não recebe imagem … |
| `src/services/__tests__/pontoOfflineService.test.ts` | 19 | pontoOfflineService.generateIntegrityHash · returns a non-empty string · is deterministic for the same input · differs for different inputs … |
| `src/services/tabelas/__tests__/viewsService.test.ts` | 19 | viewsService · alertasRH queries vw_alertas_rh and returns array · alertasRH distinguishes schema failure from an empty result · kpiTurnover queries vw_kpi_turnover … |
| `src/utils/__tests__/piiMask.test.ts` | 19 | maskCpfDisplay · returns empty string for null · returns empty string for undefined · masks 11-digit CPF showing only last 2 digits … |
| `src/utils/folha/__tests__/validadorFolha.test.ts` | 19 | validadorFolha.validarFolha · returns empty array when supabase returns null itens · returns empty array on DB error · returns no alerts for a healthy payroll item … |
| `scripts/tests/contexto-indice.test.mjs` | 18 | fonte recente sem erro continua disponível como ok · fonte recente com ${key} fica parcial · erros do snapshot são lidos mesmo sem manifest de saúde · relatório do snapshot sem erros não torna a fonte parcial … |
| `src/components/__tests__/ESocialNaoPeriodicos.test.tsx` | 18 | S2200Admissao · renders trabalhador name · renders Identificação do Trabalhador label · renders Dados da Admissão label … |
| `src/components/recrutamento/__tests__/analyticsComum.test.ts` | 18 | analyticsComum · usa a movimentação mais recente da base como referência · monta o funil com volume e retenção sobre a entrada · calcula a conversão entre etapas consecutivas … |
| `src/components/treinamentos/__tests__/certificadosDerivacoes.test.ts` | 18 | classificação de validade · preserva a regra atual: data nula = vitalício · não presume vitalício para data inválida · usa a janela de 30 dias já adotada pelo sistema … |
| `src/constants/__tests__/regimes.test.ts` | 18 | REGIMES_TRIBUTARIOS · defines all 4 regime types · each regime has required fields · simples_nacional does NOT collect INSS patronal … |
| `src/hooks/ferias/__tests__/useProgramacaoFerias.test.ts` | 18 | useProgramacaoFerias · uses ferias-programacao queryKey with ano and filters · is enabled when empresaId is present · returns data from query … |
| `src/services/__tests__/baseService.test.ts` | 18 | BaseService.listar · returns data and total from supabase · returns empty data with total 0 when supabase returns null · queries page 2 with correct range offset … |
| `src/services/trainingImages/__tests__/briefing.test.ts` | 18 | briefing por assunto · panificação → padaria, fermentação e pães · segurança do trabalho → proteção e ambiente sinalizado · programação/tecnologia → software e ambiente técnico … |
| `src/utils/__tests__/uploadValidation.test.ts` | 18 | validateUploadFile · accepts a valid PDF file · accepts a valid JPEG image · throws when file exceeds size limit … |
| `scripts/tests/inventario-banco.test.mjs` | 17 | banco.sql tem as secoes esperadas e cada uma devolve a coluna j · banco.sql so le: nenhum comando de escrita e nada do command do cron · banco.sql: nome de tabela entra escapado na regex de citada_no_banco · banco.sql: count(*) exato so sem RLS no caminho (tabela sem RLS ou papel que ignora RLS) … |
| `src/components/__tests__/DesligamentoDetailSheetCalculo.test.tsx` | 17 | DesligamentoDetailSheet — parâmetros do cálculo da rescisão · a tela oferece os parâmetros que o motor aceita · manda ao motor os parâmetros escolhidos na tela, não defaults fixos · o payload carrega TODOS os campos do motor, inclusive os das modalidades … |
| `src/components/__tests__/ESocialAlteracaoComponents.test.tsx` | 17 | S2205AlteracaoCadastral · renders trabalhador name · renders CPF · renders data de alteração … |
| `src/components/__tests__/GestaoRegistrosPonto.test.tsx` | 17 | GestaoRegistrosPonto · renders Controle de Ponto title · renders Filtros Avançados button · renders search input … |
| `src/components/__tests__/RubricasDialog.test.tsx` | 17 | RubricasDialog · renders Rubricas trigger button · renders Gestão de Rubricas dialog title · renders Nova Rubrica button … |
| `src/components/treinamentos/__tests__/catalogoDerivacoes.test.ts` | 17 | modalidade · mapeia valores reais para o rótulo do sistema · não inventa modalidade ausente e preserva texto desconhecido · filtros do catálogo … |
| `src/hooks/__tests__/useDesenvolvimentoColaborador.test.ts` | 17 | useMetasColaborador · calls avaliacaoService.listarMetas with empresaId and colaboradorId · is disabled when no colaboradorId · usePDIsColaborador … |
| `src/hooks/__tests__/useMoreGenericCrudHooks.test.ts` | 17 | useWebhooksAvancados · exposes webhooks as alias for items · passes webhookService to useGenericCrud with empresa_id filter · useWebhookLogs … |
| `src/hooks/__tests__/useNotificacoes.test.ts` | 17 | useNotificacoes · returns empty notificacoes initially · naoLidas count is 0 when all notificacoes are read · naoLidas counts unread notificacoes … |
| `src/hooks/__tests__/usePcs.test.ts` | 17 | usePcsPlanos · lista planos da empresa atual · criar semeia os fatores da metodologia padrão no plano novo · atualizar delega ao service e toasta sucesso … |
| `src/pages/__tests__/adminCatEdicao.test.ts` | 17 | podeEditarCat · permite editar CAT pendente sem protocolo nem envio · bloqueia status %s · bloqueia quando já há protocolo ou data de envio … |
| `src/services/__tests__/avaliacaoAprovacaoService.test.ts` | 17 | avaliação — RPCs reais de aprovação do gestor · enviar: chama  · enviar: recusa identificador fictício ANTES da rede · aprovar: envia decisão + justificativa + idempotência para a RPC … |
| `src/services/tabelas/__tests__/adminService.test.ts` | 17 | logEnvioRelatoriosService · listar queries log_envio_relatorios · listar with empresaId filters via relatorios_agendados first · listar with empresaId returns [] when the empresa has no agendamentos … |
| `src/services/tabelas/__tests__/documentosService.test.ts` | 17 | documentoTemplatesService · listar queries documento_templates · listar returns [] when data is null · criar calls insert on documento_templates … |
| `src/utils/__tests__/cursorPagination.test.ts` | 17 | cursorPagination · encodeCursor/decodeCursor round-trip · round-trip: ${c.column}=${c.value} · numeric value is preserved as number … |
| `src/utils/__tests__/dateLocal.test.ts` | 17 | dateLocal · formata YYYY-MM-DD com zero-padding no fuso local · não sofre shift de UTC quando a hora local é próxima da meia-noite · retorna string vazia para entrada inválida (contrato defensivo) … |
| `src/utils/importacao/__tests__/parser.test.ts` | 17 | validators · valida CPFs corretos e rejeita inválidos · normalizarCPF remove máscara e preenche zeros · parseDate lida com dd/mm/yyyy, ISO e serial Excel … |
| `supabase/functions/calcular-rescisao/motor.test.ts` | 17 | sem justa causa: multa FGTS fora do líquido (GRRF) · aviso proporcional Lei 12.506: 6 anos → 48 dias · termino_contrato empregador → indenização art. 479 (50% dos dias restantes) · termino_contrato empregado → indenização art. 480 nos descontos, sem multa … |
| `src/calculators/__tests__/trabalhista-base.test.ts` | 16 | calcularHorasExtras (trabalhista-base) · returns 0 for 0 hours · returns 0 for negative hours · 50% adicional: 1 hour = (salary/jornada) * 1.5 … |
| `src/components/__tests__/PageContainer.test.tsx` | 16 | PageContainer · renders children · renders title when provided · does not render h1 when title is omitted … |
| `src/components/colaborador-detalhes/__tests__/EditarJornadaDialog.test.tsx` | 16 | EditarJornadaDialog — escala do dia · não renderiza a seção de escala sem colaboradorId · mostra carregando antes da escala do dia chegar · em falha de consulta mostra erro honesto, não  … |
| `src/components/colaboradores/__tests__/RecontratarColaboradorDialog.test.tsx` | 16 | RecontratarColaboradorDialog · mostra skeleton enquanto o resumo de vínculos carrega · não inventa  · mostra estado vazio honesto quando não há vínculo anterior … |
| `src/contexts/__tests__/AuthContext.test.tsx` | 16 | useAuth · throws when used outside AuthProvider · provides initial user=null · loading is false after initialization completes … |
| `src/hooks/__tests__/useGenericCrudHooks.test.ts` | 16 | useCargos · passes cargoService to useGenericCrud · exposes cargos as alias for items · criar injects empresa_id from empresaAtual … |
| `src/hooks/__tests__/useToast.test.ts` | 16 | useToast reducer · ADD_TOAST · adds a toast to an empty state · prepends the newest toast (newest first) … |
| `src/schemas/esocial/__tests__/rubricaValidator.test.ts` | 16 | validarRubricaESocial · returns valid for unknown codigo with correct required fields · errors when codigo is missing · errors when descricao is missing … |
| `src/services/__tests__/backupService.test.ts` | 16 | exportarBackupCSV · returns blob, fileName and stats when data is present · fileName includes date from formatDateLocalISO · stats.tabelas equals the number of tables passed … |
| `src/services/__tests__/contabilidadeService.test.ts` | 16 | contabilidadeService.listLancamentos · returns lancamentos ordered by data_lancamento desc · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/exportService.test.ts` | 16 | validateExportData · returns true for valid data with required fields · throws when data is empty array · throws when data is null/undefined … |
| `src/services/__tests__/folhaService.test.ts` | 16 | folhaService.list · returns folhas from supabase · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/intervaloService.test.ts` | 16 | intervaloService.listar · returns intervalos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/tabelas/__tests__/beneficiosService.test.ts` | 16 | beneficiariosPlanoService · listar queries beneficiarios_plano · listar returns [] when data is null · criar calls insert … |
| `src/services/tabelas/__tests__/folhaService.test.ts` | 16 | esocialLotesService · listar queries esocial_lotes · listar returns [] when data is null · criar calls insert on esocial_lotes … |
| `src/utils/__tests__/passwordPolicy.test.ts` | 16 | validatePassword · returns valid for a strong password · rejects passwords shorter than 8 chars · rejects passwords longer than 128 chars … |
| `src/calculators/__tests__/auditHelper.test.ts` | 15 | signCalculation · returns a hex string · returns the same hash for identical data · returns different hashes for different data … |
| `src/components/__tests__/ESocialEventComponents.test.tsx` | 15 | S2200Admissao (NaoPeriodicos) · renders trabalhador name · renders CPF · renders admissao date … |
| `src/components/__tests__/TrilhaAuditoriaDesligamentos.test.tsx` | 15 | TrilhaAuditoriaDesligamentos — coluna de ações uniforme · renderiza um  · usa um único container horizontal (flex-nowrap, items-center, justify-end) em TODOS os eventos · coloca o selo  … |
| `src/components/recrutamento/__tests__/CandidatosPainel.test.tsx` | 15 | CandidatosPainel — indicadores e tabela · mostra as cinco contagens reais e oito linhas na primeira página · usa os indicadores como filtros e não perde a sincronização · mostra avatar (iniciais), origem, vaga, etapa, experiência, pretensão e avaliação reais … |
| `src/components/treinamentos/__tests__/inscricoesDerivacoes.test.ts` | 15 | montarInscricoes · faz join de colaborador, curso e certificado sem inventar dados · preserva o status original e não exibe underscore no rótulo · usa Não informado quando datas não existem e nunca transforma status em progresso … |
| `src/hooks/__tests__/useEmpresas.test.ts` | 15 | useEmpresas · returns expected shape · returns loadingEmpresas=true initially · loads todasEmpresas when isAdmin=true … |
| `src/hooks/__tests__/useExecutiveDashboard.test.ts` | 15 | useExecutiveKPIs · is disabled when no empresaId · returns data when empresaId provided · returns totalAtivos=0 when no employees … |
| `src/hooks/__tests__/useGrupo.test.tsx` | 15 | useGrupo · initial state: isLoading=true, empty arrays · returns all empresas after query resolves · empresasAtivas only includes ativa=true entries … |
| `src/lib/__tests__/queryClient.test.ts` | 15 | queryClient · is a QueryClient instance · has staleTime of 5 minutes · has gcTime of 30 minutes … |
| `src/services/folha/__tests__/calculoLoteService.test.ts` | 15 | calculoLoteService.processarLote · usa somente relações existentes e lê jornada do colaborador canônico · aplica eventos variáveis da competência via rubrica e dependentes de IRRF · grava no cabeçalho os totais somados dos itens, só com a folha aberta … |
| `src/utils/__tests__/sanitizeHtml.test.ts` | 15 | sanitizeHtml — baseline hardened profile · strips <script> entirely · preserves safe anchors (http, mailto, tel, hash) · forces rel= … |
| `src/components/__tests__/AfastamentoForm.test.tsx` | 14 | AfastamentoForm · renders Colaborador label · renders Motivo do Afastamento label · renders Data de Início label … |
| `src/components/__tests__/CampaignWizard.test.tsx` | 14 | CampaignWizard · renders dialog title · renders dialog description · renders Nome da Campanha label on step 1 … |
| `src/components/__tests__/ESocialDesligamentoCDP.test.tsx` | 14 | S2299Desligamento · renders CPF do trabalhador · renders data do desligamento · renders motivo do desligamento … |
| `src/components/__tests__/EmprestimosTable.test.tsx` | 14 | EmprestimosTable · shows empty state when no emprestimos · renders Colaborador header · renders Instituição header … |
| `src/components/__tests__/ExecucaoFeedback.test.ts` | 14 | resolverDestinoAcao — escolha POR REGISTRO · UUID real usa o serviço real mesmo com serviço demonstrativo disponível · %s usa o serviço demonstrativo · registro demonstrativo sem serviço local fica indisponível (não cai na RPC) … |
| `src/components/__tests__/OrganogramaToolbar.test.tsx` | 14 | OrganogramaToolbar · destaca  · mantém os ícones e os rótulos das duas ações · dispara as ações de expandir e recolher … |
| `src/components/__tests__/SidebarFooter.test.tsx` | 14 | SidebarFooter — expanded · renders user initials · renders user name · renders user email … |
| `src/components/__tests__/destinosDossie.test.ts` | 14 | destinoPendencia · ajuste de ponto vai para Jornada > Ponto · onboarding atrasado vai para Profissional > Desenvolvimento, não Trabalho · ASO vencido fica no dossiê, em Profissional > ASO … |
| `src/components/__tests__/layout.test.tsx` | 14 | PageHeader · renders title · renders description when provided · does not render description when omitted … |
| `src/components/__tests__/trilhaReveal.test.ts` | 14 | trilhaReveal — preset do Organograma · reusa curva e deslocamento do Organograma (só o ritmo é local) · usa a calibração local de ritmo (700ms por bloco, 150ms de passo) · o passo é menor que a duração: há SOBREPOSIÇÃO entre os eventos … |
| `src/components/colaborador-detalhes/__tests__/SSTResumoTab.test.tsx` | 14 | SSTResumoTab · mostra skeleton enquanto qualquer consulta carrega, sem estado vazio · sem nenhum registro mostra o vazio honesto, não conformidade · consulta ainda não resolvida (hook desabilitado) não vira  … |
| `src/lib/__tests__/circuitBreaker.test.ts` | 14 | CircuitBreaker · starts in CLOSED state · executes fn and returns its result when CLOSED · propagates errors thrown by fn when CLOSED … |
| `src/lib/__tests__/retry.test.ts` | 14 | retryWithIdempotency · retorna na primeira tentativa sem retry · repassa idempotencyKey no resultado · faz retry em erro 5xx e devolve o sucesso seguinte … |
| `src/services/__tests__/documentoService.test.ts` | 14 | documentoService.listarDocumentos · returns documents without filters · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/timelineService.test.ts` | 14 | listarHistoricoCargoTimeline · queries historico_cargo by colaborador_id only, ordered by data_alteracao · propaga o erro do PostgREST em vez de devolver lista vazia · devolve [] quando data vem nulo … |
| `src/services/trainingImages/__tests__/allowlist.test.ts` | 14 | allowlist temporária de geração de imagem · aceita empresa e curso exatamente autorizados · aceita o UUID de seed do curso (sem bits de variante RFC) · normaliza espaços e caixa … |
| `src/utils/__tests__/comunicadoFeriasColetivasPDF.test.ts` | 14 | gerarComunicadoMTE · returns a Blob · returns Uint8Array bytes · returns a hash string … |
| `src/utils/folha/__tests__/pontoIntegracaoUtils.test.ts` | 14 | pontoIntegracaoUtils.intervalToDecimal · returns 0 for null · returns 0 for undefined · returns 0 for empty string … |
| `src/components/__tests__/AuditoriaFeedback.test.tsx` | 13 | auditoria — diff de campos · detecta somente os campos que mudaram · ignora campos de ruído (updated_at) e ordena o resultado · campo criado do zero também aparece … |
| `src/components/__tests__/DeclaracoesTable.test.tsx` | 13 | DctfTable · renders table headers · shows empty state when no data · renders competencias … |
| `src/components/__tests__/DesligamentoBadges.test.tsx` | 13 | StatusBadge · renders Pendente for pendente status · renders Em Andamento for em_andamento · renders Concluído for concluido … |
| `src/components/__tests__/DetalhesAdmissaoDialog.test.tsx` | 13 | DetalhesAdmissaoDialog · returns null when admissao is null · renders colaborador name in dialog title · renders etapa badge … |
| `src/components/__tests__/ESocialPeriodicos.test.tsx` | 13 | S1200Remuneracao · renders Trabalhador label · renders Período Apuração label · renders perApur value … |
| `src/components/__tests__/ESocialSSTandTSVTermino.test.tsx` | 13 | S2210SST · renders CPF do trabalhador · renders nome do trabalhador · renders data do acidente … |
| `src/components/__tests__/ESocialTSVComponents.test.tsx` | 13 | S2300TSVInicio · renders trabalhador name · renders CPF · renders data de início … |
| `src/components/__tests__/EntityPageContainer.test.tsx` | 13 | EntityPageContainer · renders page title and description · shows TableSkeleton when isLoading=true · shows SyncErrorState when error is present … |
| `src/components/__tests__/MetasEtiquetas.test.tsx` | 13 | metasComum — tom do TIPO da meta · mapeia cada tipo real para o tom da sua família de cor · trata o tipo como texto livre: caixa/espaços não mudam o tom · joga o composto  … |
| `src/components/__tests__/NewLoanDialog.test.tsx` | 13 | NewLoanDialog · renders Novo Empréstimo trigger button · renders Registrar Empréstimo Consignado title · renders Compliance L10.820 badge … |
| `src/components/__tests__/desligamento-badges.test.tsx` | 13 | StatusBadge · renders  · renders  · renders  … |
| `src/components/recrutamento/__tests__/PipelineBoard.test.tsx` | 13 | PipelineBoard — cinco etapas e cards ricos · renderiza as cinco colunas com a contagem e o card completo · abre o dossiê pelo card e pelo menu de ações · move a etapa pelo menu do card sem perder as opções … |
| `src/components/treinamentos/__tests__/AgendaSemanal.test.tsx` | 13 | AgendaSemanal — minicards · renderiza o evento da semana como minicard com horário e local · mostra os dias sem turma com texto discreto e não cria navegação fictícia · abre o calendário no mês correspondente ao evento da semana exibida … |
| `src/hooks/__tests__/useProximosEventos.test.ts` | 13 | useProximosEventos · returns an empty list when nothing is upcoming · includes a future ASO expiration and a future document expiration, sorted by date · ignores expired/past dates … |
| `src/services/__tests__/empresaService.test.ts` | 13 | empresaService.listar · returns data and total from supabase · returns empty data with total 0 when supabase returns null · adds or() filter when search is provided … |
| `src/services/__tests__/encryptionService.test.ts` | 13 | validateCPF · aceita CPF válido (com e sem máscara) · rejeita dígito verificador errado · rejeita tamanho errado e sequências repetidas … |
| `src/services/__tests__/historicoContratoService.test.ts` | 13 | historicoContratoService.listar · returns historico for given colaboradorId · returns empty array when data is null · filters by colaborador_id … |
| `src/services/__tests__/pushNotificationService.test.ts` | 13 | pushNotificationService.isSupported · returns false when serviceWorker is absent · returns false when PushManager is absent · pushNotificationService.getSubscription … |
| `src/utils/__tests__/feriasPDF.test.ts` | 13 | feriasPDF.gerarRecibo · creates a jsPDF document · saves the PDF file · includes colaborador name in text calls … |
| `src/calculators/__tests__/rescisao.test.ts` | 12 | calcularRescisao · returns all expected top-level keys · saldoSalario is proportional to days worked · sem_justa_causa has aviso previo > 0 … |
| `src/components/__tests__/AppPagination.test.tsx` | 12 | AppPagination · mostra a página atual em verde-lima sólido com 28 × 28 px · não renderiza o seletor sem handler de troca de quantidade · renderiza  … |
| `src/components/__tests__/DashboardWidgets.test.tsx` | 12 | QuickActionsGrid · renders Ações Rápidas title · renders Novo Colaborador action · renders Calcular Folha action … |
| `src/components/__tests__/DesligamentoStatusBadge.test.tsx` | 12 | StatusBadge · renders Pendente for pendente status · renders Em Andamento for em_andamento status · renders Concluído for concluido status … |
| `src/components/__tests__/ESocialPagamentosAndSST.test.tsx` | 12 | S1210Pagamentos · renders Rendimentos Pagos label · renders payment dates · renders perApur for competência … |
| `src/components/__tests__/ESocialSemDadosFicticios.test.tsx` | 12 | eSocial sem dados fictícios · conciliação não exibe valores monetários · conciliação não renderiza tabela de rubricas · conciliação não agenda timers ao montar (sem atualização simulada) … |
| `src/components/__tests__/EscritaOperacional.test.ts` | 12 | escritaOperacional.idFicticio · reconhece identificadores de demonstração · não trata vazio/nulo como fictício · escritaOperacional.camposFicticios … |
| `src/components/__tests__/FolhaESocialSync.test.tsx` | 12 | FolhaESocialSync · renders Integração eSocial title · renders refresh button · renders Progresso Geral de Transmissão label … |
| `src/components/__tests__/MedidasDisciplinares.test.tsx` | 12 | MedidasKPIs · renders Total Registros label · renders all KPI labels · renders stat values … |
| `src/components/__tests__/MobileQuickActions.test.tsx` | 12 | MobileQuickActions · renders nothing when open=false · renders Ações Rápidas heading when open=true · renders all 10 quick action labels … |
| `src/components/__tests__/NovaAdmissaoDialog.test.tsx` | 12 | NovaAdmissaoDialog · renders Nova Admissão trigger button by default · renders Nova Admissão dialog title · renders Nome completo label … |
| `src/components/__tests__/NovoDepartamentoDialog.test.tsx` | 12 | NovoDepartamentoDialog · renders Novo Departamento title when no departamento prop · renders Editar Departamento title when departamento provided · renders description text … |
| `src/components/__tests__/NovoDesligamentoDialog.test.tsx` | 12 | NovoDesligamentoDialog · renders Novo Desligamento title · renders dialog description · renders Colaborador * label … |
| `src/components/__tests__/desligamentosDerivacoes.test.ts` | 12 | construirSerieMensal — tipos do enum real · cada tipo do enum cai na própria faixa; só falecimento e desconhecido vão para Outros · as chaves inventadas pela branch antiga caem em Outros, não em faixa nomeada · agrupa pela competência da data, inclusive no dia 1º (sem day-shift de UTC) … |
| `src/components/colaborador-detalhes/__tests__/CamposCustomizadosTab.test.tsx` | 12 | CamposCustomizadosTab · mostra carregando enquanto as consultas não respondem · mostra falha de consulta sem inventar ausência de dados · mostra estado vazio honesto quando a empresa não definiu campos … |
| `src/components/recrutamento/__tests__/vagasComum.test.ts` | 12 | vagasComum — contadores, identidade e datas · conta todas/abertas/fechadas pelos status reais · resolve a identidade por departamento e especialidade de dados · preserva YYYY-MM-DD no fuso local e retorna null para data inválida … |
| `src/components/treinamentos/__tests__/MaisTurmasCard.test.tsx` | 12 | MaisTurmasCard · renderiza ícone de grupo, título e descrição da referência · usa borda tracejada, raio de 12px e altura da referência (sem largura fixa) · não apresenta botão quando não existe fluxo real de criação … |
| `src/hooks/__tests__/useCalcular13Salario.test.tsx` | 12 | useCalcular13Salario · initial state: loading=false, resultado=null · exposes calcular function · sets loading=true while calculating … |
| `src/hooks/__tests__/useGenericCrud.test.ts` | 12 | useGenericCrud · passes queryKey and queryFn to useQuery · exposes items from query data · exposes total from query data … |
| `src/hooks/__tests__/useLocalStorage.test.ts` | 12 | useLocalStorage · returns initial value when key does not exist · returns stored value when key exists · stores value and updates state … |
| `src/hooks/__tests__/useMediaQuery.test.ts` | 12 | useMediaQuery · returns initial match state · returns false when query does not match · updates when media query changes … |
| `src/hooks/__tests__/useServerValidation.test.ts` | 12 | useServerValidation · returns handleServerError function · shows generic toast for unknown error · handles VALIDATION_ERROR with field errors … |
| `src/integrations/supabase/__tests__/clientBridge.test.ts` | 12 | client.ts — callBridge via query builder · select serializa action/table/filters/order/limit no body do bridge · filtro com valor  · ilike vazio e string  … |
| `src/services/__tests__/authService.test.ts` | 12 | authService.forgotPassword · returns success when supabase auth succeeds · throws when supabase auth returns error · throws with fallback message when error has no message … |
| `src/services/__tests__/contratacaoService.xss.test.ts` | 12 | contratacaoService.gerarTemplateContrato — regressão XSS · escapa payload malicioso em admissao.nome: %s · escapa payload em admissao.cargo e admissao.departamento · escapa payload dentro de metadata.endereco (input do candidato) … |
| `src/services/__tests__/controleAcessoService.test.ts` | 12 | controleAcessoService.listar · returns all records without filter · returns empty array when data is null · applies empresa_id filter when provided … |
| `src/services/__tests__/onboardingJornadaService.test.ts` | 12 | listarKits · filtra por empresa_id e por ativo quando não inclui inativos · mantém o recorte de empresa e dispensa o filtro de ativo no modo gerenciador · normaliza  … |
| `src/services/__tests__/pontosService.test.ts` | 12 | pontosService facade · exposes registrar from pontoService · exposes getSettings from pontoService · exposes buscarRegistroHoje from pontoService … |
| `src/services/__tests__/webhookService.test.ts` | 12 | webhookService · listar · returns paginated records when found · applies empresa_id filter when provided … |
| `src/utils/importacao/__tests__/excelDownload.test.ts` | 12 | XLSX_MIME · is the correct OOXML MIME type · downloadWorkbook · calls writeBuffer and creates object URL … |
| `scripts/tests/contexto-publicacao.test.mjs` | 11 | cada upload fornece um ID e cada download usa destino explícito sem ocultar falhas · produtores independentes falham de verdade e o publisher ainda aceita as fontes disponíveis · falha fatal de ${failed} mantém sua versão anterior e publica as duas fontes saudáveis · publisher ${previousBranch ?  … |
| `src/components/__tests__/AnimatedNumber.test.tsx` | 11 | AnimatedNumber · renders 0 initially when not in view · renders initial 0 even when format prop is provided · applies custom className to span … |
| `src/components/__tests__/EmprestimosFinanceiros.test.tsx` | 11 | EmprestimosTable · renders table headers · renders colaborador names · renders instituicao or dash for null … |
| `src/components/__tests__/ExameFormDialog.test.tsx` | 11 | ExameFormDialog · renders trigger button with  · renders dialog content with title · renders all colaborador options in select … |
| `src/components/__tests__/GerarPgrButton.test.tsx` | 11 | GerarPgrButton · renders trigger button with  · renders dialog title · renders Responsável Técnico label … |
| `src/components/__tests__/GestaoPontoAnalytics.test.tsx` | 11 | GestaoPontoAnalytics · renders Painel de Gestão Estratégica title · renders subtitle text · renders IA Monitorando badge … |
| `src/components/__tests__/MedidaContestacaoDialog.test.tsx` | 11 | MedidaContestacaoDialog · returns null when medida is null · does not render dialog content when open is false · renders dialog when open is true with medida … |
| `src/components/__tests__/MobileBottomNav.test.tsx` | 11 | MobileBottomNav · renders nav with aria-label · renders Home link · renders Equipe link … |
| `src/components/__tests__/MorningBriefing.test.tsx` | 11 | MorningBriefing · separa o cache por empresa e não consulta sem tenant selecionado · shows skeleton when loading · renders error state when error occurs … |
| `src/components/__tests__/PontoInconsistencyPanel.test.tsx` | 11 | PontoInconsistencyPanel · renders without crash when registros is empty · shows Insights de Inteligência when inconsistency detected · shows Resolução Assistida Ativa badge when inconsistencies exist … |
| `src/components/__tests__/QuickActionsGrid.test.tsx` | 11 | QuickActionsGrid · renders Ações Rápidas heading · renders Novo Colaborador action · renders Lançar Ponto action … |
| `src/components/integracoes/__tests__/ConfigPanels.test.tsx` | 11 | CnabConfigPanel · Salvar Configurações grava os dados editados e invalida a configuração · não salva sem os campos obrigatórios · Salvar Configurações fica desabilitado enquanto a config carrega … |
| `src/components/recrutamento/__tests__/CandidatoDetalhesDialog.test.tsx` | 11 | CandidatoDetalhesDialog · mostra identificação, cargo, departamento e etapa atual · destaca SOMENTE a etapa efetiva do candidato no indicador · não inventa contato ausente (nem  … |
| `src/components/recrutamento/__tests__/pipelineEtapas.test.ts` | 11 | pipelineEtapas — configuração e leitura do board · define as cinco etapas na ordem do processo com tokens distintos · normaliza o vocabulário REAL do banco e isola o desconhecido em  · resolve a etapa visual pelos aliases do banco … |
| `src/components/treinamentos/__tests__/CertificadoCard.test.tsx` | 11 | CertificadoCard — bloco Emissão / Validade / Código · usa três colunas proporcionais com labels, valores e complemento alinhados · exibe emissão e validade reais no formato dd/MM/yyyy · mostra o aviso âmbar de certificado a vencer … |
| `src/components/treinamentos/__tests__/TurmaCard.test.tsx` | 11 | TurmaCard — composição compacta · coloca título e categoria DENTRO do cabeçalho da imagem · sem inscritos reais não inventa barra/percentual · com inscritos reais calcula e exibe ocupação + barra … |
| `src/contexts/__tests__/NotificationContext.test.tsx` | 11 | useNotification · throws when used outside provider · provides notifications from useNotificacoes · provides unreadCount from naoLidas … |
| `src/hooks/__tests__/useBackGesture.test.ts` | 11 | useBackGesture · navigates back on left-edge swipe right · does not navigate when swipe starts away from left edge · does not navigate when horizontal distance is too small … |
| `src/hooks/__tests__/useHistoricoColaborador.test.ts` | 11 | useHistoricoColaborador · merges events from every source and sorts them from most to least recent · preserves rich fields instead of flattening them into a single description string · includes audit entries as a filterable  … |
| `src/services/__tests__/bancoHorasConfigService.test.ts` | 11 | bancoHorasConfigService.buscar · returns config for empresa · returns null when no config exists · filters by empresa_id … |
| `src/services/__tests__/colaboradorService.recontratacao.test.ts` | 11 | colaboradorService.recontratar · exige empresaId (isolamento de tenant) · exige data_admissao · atualiza o MESMO colaborador.id (status ativo, data_desligamento null) e cria vínculo tipo  … |
| `src/services/__tests__/pontoMonitorService.test.ts` | 11 | pontoMonitorService.logEvent · inserts event into ponto_auditoria · includes usuario_id from auth.getUser · swallows DB errors silently (no throw) … |
| `src/utils/__tests__/regrasSolicitacaoFerias.test.ts` | 11 | resumirUsoPorPeriodo · soma gozo, abono e partes; rejeitadas/canceladas contam só como parte · validarSaldoFerias · aceita 30 dias sem abono e 20 + 10 de abono … |
| `src/utils/__tests__/safeError.test.ts` | 11 | safeErrorMessage · returns fallback for null/undefined error · returns custom fallback when specified · returns user-friendly message for duplicate key error … |
| `src/utils/__tests__/secureJson.test.ts` | 11 | secureJsonParse · parses simple valid JSON · parses JSON arrays · strips __proto__ keys to prevent prototype pollution … |
| `src/components/__tests__/AfastamentoTable.test.tsx` | 10 | AfastamentoTable · renders Colaborador table header · renders Tipo / CID table header · renders Período table header … |
| `src/components/__tests__/Breadcrumbs.test.tsx` | 10 | Breadcrumbs · returns null when path has only one segment · renders breadcrumb for two-segment path · shows  … |
| `src/components/__tests__/ColaboradorDocuments.test.tsx` | 10 | ColaboradorDocuments · renders Gestão de Documentos Digitais heading · renders Novo Documento button · renders Adicionar Novo Documento dialog title … |
| `src/components/__tests__/DarfTab.test.tsx` | 10 | DarfTab · renders DARF title · renders IRRF label · does not render non-payroll taxes (PIS/COFINS, CSLL) … |
| `src/components/__tests__/DesempenhoBarrasProgresso.test.tsx` | 10 | barra de progresso — paridade com  · a régua do módulo é, número por número, a do card de referência · props da barra: 0 → pct%, com o stagger por índice · normaliza o percentual (limites 0–100 e valor inválido) … |
| `src/components/__tests__/ESocialAuditDialog.test.tsx` | 10 | ESocialAuditDialog · renders honest dialog title when open (sem alegar IA) · renders description with the number of eventos checked · shows results immediately, without fake progress bar … |
| `src/components/__tests__/EdicaoFeedbackDemo.test.ts` | 10 | edição de feedback cancelado na demonstração · reconhece todas as grafias de cancelamento · cancelado permanece cancelado após reler o armazenamento (F5/novo login) · cancelamento demonstrativo grava status + motivo e confirma a releitura local … |
| `src/components/__tests__/EmpresaSettingsTab.test.tsx` | 10 | EmpresaSettingsTab · shows spinner when loading · renders Dados da Empresa title · renders form labels … |
| `src/components/__tests__/EpiCatalogoTable.test.tsx` | 10 | EpiCatalogoTable · renders table headers · renders EPI names · renders CA badge when ca exists … |
| `src/components/__tests__/FeriasReconciliacaoCard.test.tsx` | 10 | FeriasReconciliacaoCard · renders Reconciliação Férias ↔ Folha title · shows empty state when no divergences · shows skeleton when loading … |
| `src/components/__tests__/FeriasReconciliacaoHistoricoCard.test.tsx` | 10 | FeriasReconciliacaoHistoricoCard · renders Reconciliação Automática — Histórico title · shows empty state when no logs · shows skeleton when loading … |
| `src/components/__tests__/MedidasTimeline.test.tsx` | 10 | MedidasTimeline · returns null when medidas is empty · renders medida descricao · renders colaborador name … |
| `src/components/__tests__/Notifications.test.tsx` | 10 | NotificationItem · renders Notificações header · shows empty state when no notifications · renders notification titles … |
| `src/components/__tests__/PapeisAvaliacao.test.ts` | 10 | normalização da lista de papéis · aceita a lista do  · capacidades da conta admin+gestor (a conta de homologação) · mantém o admin E o gestor — um não anula o outro … |
| `src/components/__tests__/PontoAuditTimeline.test.tsx` | 10 | PontoAuditTimeline · renders Trilha de Auditoria title · renders search input · shows empty state when no logs … |
| `src/components/__tests__/PontoTodayCard.test.tsx` | 10 | PontoTodayCard · renders Hoje title · shows empty state when no registro · renders Progresso da Jornada when registro present … |
| `src/components/__tests__/RejeitarDialog.test.tsx` | 10 | RejeitarDialog · renders nothing when open=false · renders title  · renders  … |
| `src/components/__tests__/RelatoriosAgendadosTab.test.tsx` | 10 | RelatoriosAgendadosTab · renders Relatórios Agendados heading · renders Agendar Novo button · shows empty state when no agendamentos … |
| `src/components/__tests__/RelatoriosExportTab.test.tsx` | 10 | RelatoriosExportTab · renders report titles · renders report descriptions · shows CSV button label when exportFormat is csv … |
| `src/components/__tests__/RewardsSimulator.test.tsx` | 10 | RewardsSimulator · renderiza as quatro regiões do redesenho · mantém os cinco parâmetros do simulador · exibe os quatro KPIs de resultado … |
| `src/components/__tests__/SSTEPIsTab.test.tsx` | 10 | SSTEPIsTab · shows empty state when no EPIs · renders EPI nome when EPIs provided · renders EPI CA number … |
| `src/components/treinamentos/__tests__/InscricoesPainel.test.tsx` | 10 | InscricoesPainel · renderiza as oito inscrições, com nomes, cursos, departamentos e categorias · mostra status humano e não exibe o código técnico · mostra Não informado quando não existe progresso real … |
| `src/constants/__tests__/rubricas.test.ts` | 10 | RUBRICAS_PADRAO · is a non-empty array · has no duplicate codigos · each rubrica has required fields … |
| `src/hooks/__tests__/useDocumentOCR.test.ts` | 10 | useDocumentOCR · starts with isProcessing false · returns processDocument function · sets isProcessing true during processing … |
| `src/hooks/__tests__/useFeriasAprovacao.test.ts` | 10 | useFeriasAprovacao · starts with isLoading=false · aprovarGestor calls feriasService.aprovarGestor with id and userId · aprovarGestor shows success toast … |
| `src/hooks/__tests__/useHorasExtras.test.ts` | 10 | useHorasExtras · returns initial solicitacoes empty array · calls horaExtraService.listar with empresaId · returns solicitacoes from service … |
| `src/hooks/__tests__/usePendenciasColaborador.test.ts` | 10 | usePendenciasColaborador · sem nada vencido nem pendente, não devolve pendência alguma · ajuste de ponto só conta quando o status é  · ASO vencido é severidade alta e cita a NR-7 … |
| `src/hooks/__tests__/useRealTimeSubscription.test.tsx` | 10 | useRealTimeSubscription · does NOT subscribe when empresaId is undefined · does NOT subscribe when empresaId is empty string · creates a channel when empresaId is provided … |
| `src/hooks/__tests__/useSystemHealth.test.ts` | 10 | useSystemHealth · returns initial status as online · returns initial latency as null · sets latency after health check … |
| `src/services/__tests__/folhaPagamentoService.test.ts` | 10 | folhaPagamentoService · assinarHolerite · should call upsert with correct data and return hash · fecharFolha … |
| `src/services/__tests__/loggerService.test.ts` | 10 | loggerService · should buffer info logs and not call supabase rpc immediately · should flush error logs immediately via rpc · should flush warn logs immediately via rpc for security audit … |
| `src/services/tabelas/__tests__/pontoService.test.ts` | 10 | ajustesPontoService · listar queries ajustes_ponto · listar returns [] when data is null · criar calls insert on ajustes_ponto … |
| `src/test/securityHeadersParity.test.ts` | 10 | paridade de security headers vercel.json x nginx.conf · nginx.conf serve exatamente os headers globais do vercel.json · vercel.json aplica os headers em produção · não usa  … |
| `src/utils/__tests__/avisoFeriasPDF.test.ts` | 10 | gerarAvisoFeriasPDF · returns a Blob · returns a Uint8Array bytes · returns a sha256 hash string … |
| … +411 linhas — lista completa em `context.json` | | |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `close` | `public/sw-custom.js` |
| `assinar` | `supabase/functions/assinaturaDigital/index.ts` |
| `verificar` | `supabase/functions/assinaturaDigital/index.ts` |
| `listar` | `supabase/functions/auditoria/index.ts` |
| `registrar` | `supabase/functions/auditoria/index.ts` |
| `callback` | `supabase/functions/auth-gov-br/index.ts` |
| `get_auth_url` | `supabase/functions/auth-gov-br/index.ts` |
| `ping` | `supabase/functions/integracao/index.ts` |
| `status` | `supabase/functions/integracao/index.ts` |
| `criar` | `supabase/functions/pix-lote/index.ts` |
| `string` | `supabase/functions/tabelas-dominio/index.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `invoke(` | `src/components/folha/DistribuirHoleritesButton.tsx` |
| `invoke(` | `src/components/folha/MetricasFolhaDashboard.tsx` |
| `invoke(` | `src/components/integracoes/ConfigPanels.tsx` |
| `invoke(` | `src/components/ponto/GerarAEJDialog.tsx` |
| `invoke(` | `src/components/ponto/GerarAFDDialog.tsx` |
| `invoke(` | `src/components/ponto/ImportarAFDTDialog.tsx` |
| `invoke(` | `src/components/sst/GerarLtcatOsButton.tsx` |
| `invoke(` | `src/components/sst/GerarPgrButton.tsx` |
| `invoke(` | `src/components/ui/cep-input.tsx` |
| `invoke(` | `src/components/ui/cnpj-input.tsx` |
| `invoke(` | `src/hooks/useCalcular13Salario.ts` |
| `invoke(` | `src/hooks/useDocumentOCR.ts` |
| `invoke(` | `src/hooks/useSystemHealth.ts` |
| `invoke(` | `src/lib/retry.ts` |
| `invoke(` | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| `invoke(` | `src/pages/AuthCallbackPage.tsx` |
| `invoke(` | `src/pages/ContratacaoPage.tsx` |
| `invoke(` | `src/pages/LoginPage.tsx` |
| `notify_admins` | `src/schemas/tableColumns.ts` |
| `notify_user_on_approval` | `src/schemas/tableColumns.ts` |
| `notify_user_on_rejection` | `src/schemas/tableColumns.ts` |
| `invoke(` | `src/services/contratacaoService.ts` |
| `invoke(` | `src/services/contratoTemplateService.ts` |
| `invoke(` | `src/services/edgeFunctionsService.ts` |
| `invoke(` | `src/services/esocialService.ts` |
| `invoke(` | `src/services/folhaPagamentoService.ts` |
| `invoke(` | `src/services/pontoOfflineService.ts` |
| `invoke(` | `src/services/rescisaoService.ts` |
| `invoke(` | `src/services/whatsappService.ts` |
| `sendEmail` | `supabase/functions/_shared/outboundDelivery.ts` |
| `sendWhatsappEvolution` | `supabase/functions/_shared/outboundDelivery.ts` |
| `sendEmail` | `supabase/functions/distribuir-holerites/index.ts` |
| `sendWhatsappEvolution` | `supabase/functions/distribuir-holerites/index.ts` |
| `sendEmail` | `supabase/functions/enviar-email-admissao/index.ts` |
| `sendEmail` | `supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `sendWhatsappEvolution` | `supabase/functions/whatsapp-send/index.ts` |
| `notify_admins` | `supabase/migrations/20251231131249_a44794d3-9ff9-45af-bdf9-68bc1af6d101.sql` |
| `notify_user_on_approval` | `supabase/migrations/20251231131249_a44794d3-9ff9-45af-bdf9-68bc1af6d101.sql` |
| `notify_user_on_rejection` | `supabase/migrations/20251231131249_a44794d3-9ff9-45af-bdf9-68bc1af6d101.sql` |
| `notify` | `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql` |
| `notify` | `supabase/rollback/20261027090000_ninebox_reconciliacao_incremental_rollback.sql` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| true apenas em DEV | `capacitor.config.ts` |
| apenas para src/**. `lint:edge` roda com --max-warnings=0 sobre | `eslint.config.js` |
| separada); sem este override, ligar a regra globalmente reprovaria | `eslint.config.js` |
| `no-explicit-any`; manter a regra aqui importaria ~108 + ~23 warnings | `eslint.config.js` |
| sincronizam altura/medidas com ResizeObserver); a regra de primeira | `eslint.config.js` |
| VITE_DEV_PORT         — porta do Vite local (default 4173; deve coincidir | `playwright.config.ts` |
| Origin/Referer para o deployment Vercel canônico da allowlist (somente | `vite.config.ts` |
| regra do time: só subir, nunca baixar (ratchet). | `vitest.config.ts` |
| Se ambos falharem retorna null → quem chamou deve handlear. | `public/sw-custom.js` |
| // A navegação NÃO pode ser stale-while-revalidate: o HTML servido do cache | `public/sw-custom.js` |
| responde antes dela. A regra `no-store` do vercel.json vale para | `public/sw-custom.js` |
| Gzipbomb-safe fetch wrapper: lê apenas os primeiros 4MB antes de entregar ao SW. | `public/sw-custom.js` |
| intocada quando está dentro do limite — nunca reconstrói um novo Response | `public/sw-custom.js` |
| cacheada — o SW apenas observa a resposta passar. | `public/sw-custom.js` |
| Clickjacking defense-in-depth: só quebra o frame em produção e apenas | `src/main.tsx` |
| * 'true' somente se o provider Google estiver habilitado no Supabase Auth. */ | `src/vite-env.d.ts` |
| Opção 2: Desconto Simplificado | `src/calculators/impostos.ts` |
| CLT Art. 477 §8°: multa de um salário mensal quando o empregador não quita as verbas rescisórias | `src/calculators/rescisao.ts` |
| no prazo legal (10 dias corridos para aviso prévio trabalhado; 1° dia útil para demissão imediata). | `src/calculators/rescisao.ts` |
| apenas o FGTS. Exceção do Anexo IV (art. 18, §5º-C): CPP e RAT/FAP são | `src/calculators/tabelas.ts` |
| (edge não pode importar de src/). | `src/calculators/tabelas.ts` |
| 'pending-challenge' = enrolled but aal1 session — must complete TOTP before access | `src/components/AdminRoute.tsx` |
| Must complete TOTP challenge — do NOT grant access until aal2 is reached. | `src/components/AdminRoute.tsx` |
| 'pending-challenge' = enrolled TOTP but session still at aal1 — TOTP required | `src/components/ProtectedRoute.tsx` |
| Enrolled TOTP but session is still at aal1 — must complete challenge. | `src/components/ProtectedRoute.tsx` |
| * Tokens semânticos apenas — cores de status ficam confinadas ao sparkline | `src/components/admin/HealthTrendCard.tsx` |
| Limite máximo de eventos por chamada (espelha o teto da RPC search_audit_unified). | `src/components/admin/UnifiedAuditSection.tsx` |
| Regra única de "S-2200 já transmitido" — a mesma que o board do Kanban usa. | `src/components/admissoes/AdmissoesDashboard.tsx` |
| * Registro mínimo que este dashboard lê (admissão real ou fictícia). */ | `src/components/admissoes/AdmissoesDashboard.tsx` |
| regra: `status_esocial = 'enviado'`, protocolo ou data de transmissão) — aqui | `src/components/admissoes/AdmissoesDashboard.tsx` |
| * Mesma régua de prazo que o card usa: `atrasada` quando a data prevista já | `src/components/admissoes/AdmissoesDashboard.tsx` |
| (232px de card para 112px de donut + 6 nomes completos): é um limite físico | `src/components/admissoes/AdmissoesDashboard.tsx` |
| que ficam a validação do documento e o reenvio do link de contratação. O ASO | `src/components/admissoes/AdmissoesDashboard.tsx` |
| Partição exata de `emAndamento` pela régua de prazo: todo processo cai em | `src/components/admissoes/AdmissoesDashboard.tsx` |
| disso deve existir no board antes do primeiro clique. | `src/components/admissoes/AdmissoesKanban.tsx` |
| * REGRA DE IDENTIDADE: só permanecem fiéis ao sistema as CORES (tokens de | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| * Texto curto de prazo a partir de `data_prevista` (usa a mesma régua `diasAteHoje`). */ | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| * A tabela real (`workflows_historico`) guarda apenas `usuario_id` — um UUID — e | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| glow. O destaque deve vir do CONTEÚDO, não do fundo. | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| • documentos / validacao / pendente — coleta, conferência e destrave do | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| O timer do destaque não pode sobreviver ao modal (ele desmonta ao fechar). | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| ao checklist, e é isso que habilita a validação do documento enviado. A ação | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| * REGRA DE IDENTIDADE: só permanecem fiéis ao sistema as CORES (tokens de | `src/components/admissoes/GestaoCandidatos.tsx` |
| * Toda a matemática (prazo, progresso, iniciais) vem de `admissoesDerivacoes.ts` | `src/components/admissoes/GestaoCandidatos.tsx` |
| quebrava no espaço ("Docs Pendentes", "Em Validação", "Aguardando Exame", | `src/components/admissoes/GestaoCandidatos.tsx` |
| * Prazo com o texto auxiliar do estado. Estados críticos ganham destaque: | `src/components/admissoes/GestaoCandidatos.tsx` |
| atraso na variante vibrante da área, vencimento em <= 7 dias em âmbar. | `src/components/admissoes/GestaoCandidatos.tsx` |
| então a última pílula termina no limite direito da área útil. | `src/components/admissoes/GestaoCandidatos.tsx` |
| Estado VISUAL (só do indicador): muda na hora e dirige apenas o `transform`. | `src/components/admissoes/GestaoCandidatos.tsx` |
| busca/filtro/ordenação e um resumo com contagens reais — nenhuma regra de | `src/components/admissoes/GestaoKits.tsx` |
| negócio nova, nenhuma navegação falsa e NENHUM dado inventado. | `src/components/admissoes/GestaoKits.tsx` |
| * LIMITE HONESTO (sem tocar em backend/banco): o registro real | `src/components/admissoes/GestaoKits.tsx` |
| (`public.onboarding_kits`) tem apenas `nome`, `itens`, `ativo` e `created_at`. | `src/components/admissoes/GestaoKits.tsx` |
| O serviço LANÇA em falha de query/permissão justamente para `isError` chegar | `src/components/admissoes/GestaoKits.tsx` |
| dos `itens`. É determinístico (mesmo kit → mesmo ícone E mesma cor), usa apenas | `src/components/admissoes/GestaoKits.tsx` |
| usando apenas dados reais (nome do kit + departamentos reais da empresa). | `src/components/admissoes/GestaoKits.tsx` |
| inferido pelo nome (mesma regra do filtro) ou, na falta dele, a data real de | `src/components/admissoes/GestaoKits.tsx` |
| Subtítulo: SOMENTE dado real (departamento inferido pelo nome ou data de | `src/components/admissoes/GestaoKits.tsx` |
| 6. prazo                       (data_prevista, no canto direito do rodapé) | `src/components/admissoes/KanbanCard.tsx` |
| RODAPÉ — responsável (esquerda) + prazo (direita) */} | `src/components/admissoes/KanbanCard.tsx` |
| o CRUD mínimo sobre a tabela EXISTENTE (nenhuma tabela nova): | `src/components/admissoes/KitOnboardingDialog.tsx` |
| (mesmo service/regra da criação — nada de um segundo caminho de escrita). | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| tarefa como legenda e o prazo + responsável numa faixa de | `src/components/admissoes/OnboardingCard.tsx` |
| números via `onboardingDerivacoes.ts` — nenhuma regra de negócio é duplicada. | `src/components/admissoes/OnboardingCard.tsx` |
| prazo da próxima tarefa, contadores). Nenhum texto é inventado. | `src/components/admissoes/OnboardingCard.tsx` |
| METADADOS LATERAIS — prazo e responsável desceram para uma linha | `src/components/admissoes/OnboardingCard.tsx` |
| * Classificação de prazo de uma admissão em andamento (mesma régua do card). */ | `src/components/admissoes/admissoesDashboardModais.tsx` |
| * Rótulo, selo e tinta de cada classificação de prazo. */ | `src/components/admissoes/admissoesDashboardModais.tsx` |
| prazo/pendências (o que cobrar), "Próximas Admissões" quer o progresso, e | `src/components/admissoes/admissoesDashboardModais.tsx` |
| "SLA & Alertas" quer a classificação de prazo e a próxima ação. | `src/components/admissoes/admissoesDashboardModais.tsx` |
| prioritário, qual é a gravidade, qual é o prazo de referência, em que etapa | `src/components/admissoes/admissoesDashboardModais.tsx` |
| (quantidade, motivo, gravidade, prazo, etapa, responsável, ação recomendada e | `src/components/admissoes/admissoesDashboardModais.tsx` |
| e somente quando — existe destino real no sistema. | `src/components/admissoes/admissoesDashboardModais.tsx` |
| todos os processos de cada grupo com etapa, prazo, tempo restante/atraso, | `src/components/admissoes/admissoesDashboardModais.tsx` |
| (aba "Dashboard"): prazo, progresso e iniciais do avatar. A aba "Gestão de | `src/components/admissoes/admissoesDerivacoes.ts` |
| * Registro mínimo que as telas do módulo leem (admissão real ou fictícia). */ | `src/components/admissoes/admissoesDerivacoes.ts` |
| então mudá-los não pode mexer em nenhuma outra. | `src/components/admissoes/kanbanComum.ts` |
| (Validação) e `violet` (Exame) saem de `--chart-2`/`--chart-4`; `aqua` | `src/components/admissoes/kanbanComum.ts` |
| `teal` (Validação) e `violet` (Exame) saem de `--chart-2`/`--chart-4`; `aqua` | `src/components/admissoes/kanbanComum.ts` |
| `--chart-2` = ciano/teal (pedido da referência para "Validação"). | `src/components/admissoes/kanbanComum.ts` |
| Validação, Exame, Contrato), depois as demais do fluxo real e os dois estados | `src/components/admissoes/kanbanComum.ts` |
| * Coluna de uma etapa — `undefined` para etapa fora do board (não deve ocorrer). */ | `src/components/admissoes/kanbanComum.ts` |
| (texto de marco, classe de cor, tint de prazo). A matemática fica em | `src/components/admissoes/onboardingComum.ts` |
| reordena não deve repintar os avatares). | `src/components/admissoes/onboardingComum.ts` |
| * Tinta do rótulo de prazo por tom (`TomPrazo`). */ | `src/components/admissoes/onboardingComum.ts` |
| * Fundo do selo de prazo por tom (véu translúcido curto). */ | `src/components/admissoes/onboardingComum.ts` |
| admissionAL (prazo da admissão, checklist de documentos, progresso por etapa). | `src/components/admissoes/onboardingDerivacoes.ts` |
| mede risco por prazo de tarefa. Misturar as duas réguas num arquivo só | `src/components/admissoes/onboardingDerivacoes.ts` |
| * Dias corridos somados ao `created_at` para achar o prazo da tarefa. */ | `src/components/admissoes/onboardingDerivacoes.ts` |
| * Prazo de uma tarefa = `created_at` + `prazo_dias`. Devolve `null` quando a | `src/components/admissoes/onboardingDerivacoes.ts` |
| *   1. PRAZO (`created_at + prazo_dias`) mais próximo primeiro; | `src/components/admissoes/onboardingDerivacoes.ts` |
| 2. tarefa sem prazo calculável vai para o FIM; | `src/components/admissoes/onboardingDerivacoes.ts` |
| uma segunda regra em outro lugar. Não usa `Array.sort` mutável (copia). | `src/components/admissoes/onboardingDerivacoes.ts` |
| determinística: sempre a de prazo mais próximo. | `src/components/admissoes/onboardingDerivacoes.ts` |
| * Pendentes com prazo já vencido — o "em risco/atrasada" dos status pills. */ | `src/components/admissoes/onboardingDerivacoes.ts` |
| * Rótulo humano do prazo: `Atrasado 3d` / `Hoje, 16:00` / `Amanhã, 09:00` / | `src/components/admissoes/onboardingDerivacoes.ts` |
| "hoje/amanhã"). `null` quando não há prazo calculável. | `src/components/admissoes/onboardingDerivacoes.ts` |
| 3. `atrasado`           — o prazo da PRÓXIMA ação já venceu (= há pendência | `src/components/admissoes/onboardingDerivacoes.ts` |
| vencida; como a próxima ação é a de prazo mais | `src/components/admissoes/onboardingDerivacoes.ts` |
| * Antecedência (em dias) que caracteriza "em risco" antes do vencimento. */ | `src/components/admissoes/onboardingDerivacoes.ts` |
| REGRA EXPLÍCITA (PENDÊNCIA 5): admissão cancelada = jornada ENCERRADA sem | `src/components/admissoes/onboardingDerivacoes.ts` |
| 1. Validação de Tamanho | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| 2. Validação de Tipo MIME | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Atenção: Mesma doença (CID) em 60 dias soma-se para o limite de 15 dias. | `src/components/afastamentos/AfastamentoForm.tsx` |
| rolável esse desconto é somado DE NOVO pelo scroll nativo (o | `src/components/animate-ui/primitives/effects/highlight.tsx` |
| (metas/PDIs com prazo vencido e ainda não concluídos, ou feedbacks com | `src/components/avaliacao/AlertasDesempenho.tsx` |
| `AnimatedNumber` é alterado: este card apenas não delega mais o disparo. | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| fica só o glifo, na cor da sua família (`corIcone` é apenas a cor agora) e um | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| espera apenas o que FALTA desse tempo: se o card já entrou muito antes de | `src/components/avaliacao/AnaliticosDesempenho.tsx` |
| * É aqui (e somente aqui) que o conteúdo técnico aparece: payload anterior/novo | `src/components/avaliacao/AuditoriaDetalheDialog.tsx` |
| timeline mostra apenas texto legível — nenhum JSON bruto nas linhas. | `src/components/avaliacao/AuditoriaDetalheDialog.tsx` |
| desabilitadas com o motivo quando a regra não permite). | `src/components/avaliacao/CartaoFeedbackCanonico.tsx` |
| * REGRA ABSOLUTA: nenhum controle desaparece por causa do ciclo, do status ou | `src/components/avaliacao/CartaoFeedbackCanonico.tsx` |
| * Mostra a prévia dos textos (somente na fila e para a avaliação do gestor). */ | `src/components/avaliacao/CartaoFeedbackCanonico.tsx` |
| alteram nenhuma regra de negócio: são só os três estados que o componente já | `src/components/avaliacao/CicloAtivoPanel.tsx` |
| listagem. Em vez de duplicar texto, validação e animação em cada superfície, | `src/components/avaliacao/DialogoDevolucao.tsx` |
| * A validação local (mínimo de caracteres) é a mesma da RPC; a gravação é | `src/components/avaliacao/DialogoDevolucao.tsx` |
| * Mensagem REAL do erro (RPC/validação/rede) para o aviso ao usuário. */ | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| * Contrato mínimo do serviço usado pelo rodapé (o serviço real satisfaz por | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| • `aguardando_gestor` — fila de aprovação: SOMENTE Aprovar/Devolver, para o | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| • `rh`                — etapa de validação: SOMENTE "Validar Potencial" | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| * Validação de Potencial é EXCLUSIVA do RH (nem o admin valida). */ | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| ─── APROVAÇÃO FORMAL — a MESMA regra/instância derivada pela fila ─────── */ | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Controle legado visível apenas na etapa em que ele existia (aprovada). | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Inicialização preguiçosa no formato que a regra `react-hooks/refs` aceita | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| * DECISÃO — a MESMA regra do servidor: | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| VITRINE: a validação local entra no MESMO estado que a fila/Nine-Box leem. | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| ── REGRA ÚNICA DE AÇÕES POR ETAPA (nunca todas ao mesmo tempo) ────────── | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| Ações do STATUS — SOMENTE na etapa `avaliacoes` e SOMENTE as que a | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| DECISÃO DA APROVAÇÃO — devolução exige justificativa (mesmo mínimo da | `src/components/avaliacao/FeedbackAcoesRodape.tsx` |
| * Modelo canônico (caminho normal da aba) OU registro apenas derivado | `src/components/avaliacao/FeedbackDetalheDialog.tsx` |
| * SOMENTE PRÉVIA LOCAL (DEV): serviço e papel simulados repassados ao rodapé. | `src/components/avaliacao/FeedbackDetalheDialog.tsx` |
| registro apenas derivado (chamadores antigos/testes). O diálogo normaliza | `src/components/avaliacao/FeedbackDetalheDialog.tsx` |
| * Existe filtro fora do padrão? Derivado SOMENTE dos props — a ORDENAÇÃO e o | `src/components/avaliacao/FeedbacksFiltros.tsx` |
| concluídos no ciclo selecionado e o prazo é a leitura de `ciclo.data_fim`. | `src/components/avaliacao/FeedbacksFocoBanner.tsx` |
| * Leitura do prazo do ciclo ("Próximo prazo em 3 dias."). */ | `src/components/avaliacao/FeedbacksFocoBanner.tsx` |
| * Ação real: liga o filtro "somente pendentes" da própria aba. */ | `src/components/avaliacao/FeedbacksFocoBanner.tsx` |
| "Novo Feedback" lista SOMENTE IDs reais — nunca `mock-*` (que a guarda de | `src/components/avaliacao/FeedbacksTab.tsx` |
| `admin` não anula `gestor` (envio × decisão × validação do Potencial). | `src/components/avaliacao/FeedbacksTab.tsx` |
| (armazenamento local da vitrine). Muda apenas o TEXTO do aviso do rodapé — | `src/components/avaliacao/FeedbacksTab.tsx` |
| * ETAPA do modal aberto — decide o CONJUNTO de ações do rodapé (regra única): | `src/components/avaliacao/FeedbacksTab.tsx` |
| como padding superior da coluna lateral (apenas no layout de duas colunas — | `src/components/avaliacao/FeedbacksTimeline.tsx` |
| para o novo recorte. NÃO deve vir dos ids do resultado. | `src/components/avaliacao/FeedbacksTimeline.tsx` |
| Mostra somente eventos existentes, em ordem cronológica crescente. | `src/components/avaliacao/HistoricoFeedbackDialog.tsx` |
| progresso, imediatamente ABAIXO do painel de prazo e à DIREITA do donut). | `src/components/avaliacao/IndicadorEvolucao.tsx` |
| aumentar a altura do card — a distância até o painel de prazo (8 px) é do | `src/components/avaliacao/IndicadorEvolucao.tsx` |
| subpainel de PRAZO (calendário + leitura contextual + data) e, quando o | `src/components/avaliacao/MetaCard.tsx` |
| ── Região C: donut do percentual real + subpainel de prazo ──────── */} | `src/components/avaliacao/MetaCard.tsx` |
| Subpainel do prazo: superfície interna própria (mais escura que o | `src/components/avaliacao/MetaCard.tsx` |
| * Existe filtro fora do padrão? Derivado SOMENTE dos props já recebidos — | `src/components/avaliacao/MetasFiltros.tsx` |
| da meta (a relação `colaborador` da consulta de metas traz apenas o nome). | `src/components/avaliacao/MetasOKRsTab.tsx` |
| * Situação/prazo/responsável/departamento derivados UMA vez por carga. */ | `src/components/avaliacao/MetasOKRsTab.tsx` |
| página usa devolve apenas `id, nome_completo, cpf, email, status, | `src/components/avaliacao/NineBoxFiltros.tsx` |
| potencial) entra apenas como AVISO, porque é ausência de dado, não risco. | `src/components/avaliacao/NineBoxFocoBanner.tsx` |
| * Aprovados pelo gestor aguardando a validação do Potencial pelo RH. */ | `src/components/avaliacao/NineBoxFocoBanner.tsx` |
| O rótulo "Potencial" já tem `x/y/rotate` no `style` — o `animate` não pode | `src/components/avaliacao/NineBoxMatriz.tsx` |
| * A regra de classificação e as decisões de integridade estão documentadas em | `src/components/avaliacao/NineBoxTab.tsx` |
| (`desempenho_aprovado`/`potencial_aprovado`) é a fonte oficial; a validação | `src/components/avaliacao/NineBoxTab.tsx` |
| gestor + validação do Potencial vigentes, o colaborador não é classificado. | `src/components/avaliacao/NineBoxTab.tsx` |
| podem ser classificados antes de aprovação + validação; as fixtures | `src/components/avaliacao/NineBoxTab.tsx` |
| isolamento por `empresa_id`). O diálogo apenas coleta os campos reais da | `src/components/avaliacao/NovoCicloDialog.tsx` |
| IDENTIFICAÇÃO TEMPORÁRIA DE ORIGEM — SOMENTE HOMOLOGAÇÃO LOCAL. | `src/components/avaliacao/OrigemHomologacao.tsx` |
| D · prazo          — data + dias restantes/em atraso; | `src/components/avaliacao/PdiCard.tsx` |
| E · status         — badge do status REAL do plano + situação do prazo | `src/components/avaliacao/PdiCard.tsx` |
| prazo — o card não vira uma superfície de alerta inteira. | `src/components/avaliacao/PdiCard.tsx` |
| * Faixa lateral: cor semântica da situação do prazo, em intensidade discreta. */ | `src/components/avaliacao/PdiCard.tsx` |
| Faixa lateral esquerda — semântica do prazo, discreta. */} | `src/components/avaliacao/PdiCard.tsx` |
| ── D · Prazo ────────────────────────────────────────────────── */} | `src/components/avaliacao/PdiCard.tsx` |
| ── E · Status (do plano) + situação do prazo (complementar) ─── */} | `src/components/avaliacao/PdiCard.tsx` |
| colaborador, competência foco, ação de desenvolvimento, prazo, status, | `src/components/avaliacao/PdiDetalheDialog.tsx` |
| (prazo) + "Limpar filtros" (contextual) + "Ordenar por"; | `src/components/avaliacao/PdiFiltros.tsx` |
| Guarda o recorte de PRAZO (vencido / dentro do prazo), calculado pela regra | `src/components/avaliacao/PdiFiltros.tsx` |
| "Mais filtros" — recorte de prazo, o único adicional que os campos | `src/components/avaliacao/PdiFiltros.tsx` |
| usa apenas duas regras comprováveis: | `src/components/avaliacao/PdiFocoBanner.tsx` |
| • prazo vencido e plano não concluído (`estaAtrasado`, a MESMA regra que o | `src/components/avaliacao/PdiFocoBanner.tsx` |
| não tem regra de estagnação aprovada). Sem nenhum PDI em atenção o componente | `src/components/avaliacao/PdiFocoBanner.tsx` |
| * Quantos estão com prazo vencido. */ | `src/components/avaliacao/PdiFocoBanner.tsx` |
| * Quantos estão com status pendente (e prazo não vencido). */ | `src/components/avaliacao/PdiFocoBanner.tsx` |
| do dono do plano — a consulta de PDIs traz apenas o nome). Busca, filtros, | `src/components/avaliacao/PdiTab.tsx` |
| escrita, nenhuma mudança de permissão ou de isolamento por empresa. | `src/components/avaliacao/PdiTab.tsx` |
| * Categoria/prazo/cargo/departamento/foto derivados UMA vez por carga. */ | `src/components/avaliacao/PdiTab.tsx` |
| * Busca + Status + Competência + Colaborador + Prazo (antes da atenção). */ | `src/components/avaliacao/PdiTab.tsx` |
| * CONTROLES (regra ÚNICA em `getFeedbackActions`, nunca duplicada aqui): | `src/components/avaliacao/PendenciasAprovacao.tsx` |
| servidor). RH/admin NÃO recebem Aprovar/Devolver: a fila fica somente | `src/components/avaliacao/PendenciasAprovacao.tsx` |
| Devolução exige justificativa (mínimo de 10 caracteres, igual à RPC). | `src/components/avaliacao/PendenciasAprovacao.tsx` |
| O JSON técnico continua acessível — agora apenas no diálogo de detalhes. | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| A consulta NÃO mudou: mesmas 5 tabelas, mesma ordenação, mesmo limite. Os | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| * Colaboradores já carregados pela página — usados SOMENTE para resolver | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| * A regra é uma só, aplicada dia a dia na ordem da listagem: | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| DEPOIS do prazo de cada item (atraso + duração, gravado em | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `data-cascata-prazo`) antes de forçar o estado final. É o que garante que | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| * O atraso e o PRAZO (`data-cascata-prazo`, timestamp absoluto) são capturados | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| um cronograma novo. O prazo é o que permite à rede de segurança agir item a | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| 1. ao desmontar, nenhum timer pendente continua vivo (o dia não pode | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| ele volta ABERTO (mesma regra de `diasApresentados`), sem estado órfão. | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `data-cascata-prazo` daquele item (atraso + duração, capturados na montagem): | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| • item antes do prazo → ignorado (a animação dele ainda vai acontecer); | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| 1. vencido o próprio prazo (+ `MARGEM_REDE_SEGURANCA`); | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| * Como o prazo é do próprio item, é impossível revelar algo antes da hora — o | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| impossível algo ficar escondido. Sem `!important`, sem regra global. | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| * Texto real com "Ver mais" quando excede o limite. Não cria conteúdo: apenas | `src/components/avaliacao/TextoExpansivel.tsx` |
| * Ação de exclusão visível apenas para quem tem autorização administrativa. */ | `src/components/avaliacao/TodosCiclosTable.tsx` |
| Agora o status é identificado APENAS pelo ponto colorido ao | `src/components/avaliacao/TodosCiclosTable.tsx` |
| 3. QUAL a situação da validação de Potencial (sem validação / validada / | `src/components/avaliacao/acoesFeedback.ts` |
| * ⚠️ `disponivel: true` NÃO é autorização: significa apenas que a interface | `src/components/avaliacao/acoesFeedback.ts` |
| papel, empresa e versão do registro. A regra de transição vem de | `src/components/avaliacao/acoesFeedback.ts` |
| * A validação de Potencial é EXCLUSIVA do RH — espelha, no front, a função | `src/components/avaliacao/acoesFeedback.ts` |
| * Vínculo mínimo de um colaborador — o que basta para provar a responsabilidade. */ | `src/components/avaliacao/acoesFeedback.ts` |
| * Por que o controle NÃO pode ser oferecido (texto da camada pura). */ | `src/components/avaliacao/acoesFeedback.ts` |
| * `admin`+`gestor` não pode virar só `admin_rh`: quem é o GESTOR RESPONSÁVEL | `src/components/avaliacao/acoesFeedback.ts` |
| * Ações do fluxo para o status atual, na ordem em que a interface deve | `src/components/avaliacao/acoesFeedback.ts` |
| * `true` somente com o vínculo comprovado (ver `ehGestorResponsavel`). */ | `src/components/avaliacao/acoesFeedback.ts` |
| ─── situação da validação de Potencial ──────────────────────────────────── */ | `src/components/avaliacao/acoesFeedback.ts` |
| * Situação da validação vigente. A VERSÃO é comparada com a canônica vinda do | `src/components/avaliacao/acoesFeedback.ts` |
| banco (`vw_feedbacks_360_versao`): se o feedback mudou depois da validação, a | `src/components/avaliacao/acoesFeedback.ts` |
| validação vira DESATUALIZADA. O `statusAtual` (opcional) reforça a mesma | `src/components/avaliacao/acoesFeedback.ts` |
| regra: registro que saiu de "concluído" — reaberto ou cancelado — NUNCA pode | `src/components/avaliacao/acoesFeedback.ts` |
| que se abre"; a escala sozinha pareceria apenas um zoom. | `src/components/avaliacao/animacaoFeedbacks.ts` |
| empresa). `disponivel: true` não é permissão; | `src/components/avaliacao/aprovacaoGestor.ts` |
| conhece os segundos; a categoria do feedback aparece somente na COLUNA de | `src/components/avaliacao/aprovacaoGestor.ts` |
| ─── Regra de situação (espelho exato de `public.situacao_aprovacao`) ────── */ | `src/components/avaliacao/aprovacaoGestor.ts` |
| a. `aprovado` + validação do RH → `concluida_validada`; | `src/components/avaliacao/aprovacaoGestor.ts` |
| • com validação vigente do RH → `concluida_validada`; | `src/components/avaliacao/aprovacaoGestor.ts` |
| * Decidir (aprovar/devolver): SOMENTE o gestor — o RH não substitui (RPC §5). */ | `src/components/avaliacao/aprovacaoGestor.ts` |
| * Mínimo de caracteres da devolução (igual ao `length(v_just) < 10` do SQL). */ | `src/components/avaliacao/aprovacaoGestor.ts` |
| * Justificativa é OBRIGATÓRIA na devolução (regra do fluxo aprovado). */ | `src/components/avaliacao/aprovacaoGestor.ts` |
| * ESCOPO ADMINISTRATIVO apenas para ENCAMINHAMENTO/CONCLUSÃO do registro. | `src/components/avaliacao/aprovacaoGestor.ts` |
| * Papéis efetivos da conta; usados apenas para autorizar a conclusão. */ | `src/components/avaliacao/aprovacaoGestor.ts` |
| regra sobre a lista já carregada — nenhuma fixture nova e nenhuma gravação. | `src/components/avaliacao/aprovacaoGestor.ts` |
| somente de LEITURA e evita que o card resuma o conjunto no último registro. | `src/components/avaliacao/aprovacaoGestor.ts` |
| * Versão da AVALIAÇÃO DO GESTOR — âncora da VALIDAÇÃO do Potencial pelo RH. | `src/components/avaliacao/aprovacaoGestor.ts` |
| do Nine-Box (`consolidarNineBox360`). Comparar a validação com a versão do | `src/components/avaliacao/aprovacaoGestor.ts` |
| * REGRA ÚNICA: o mesmo estado que a fila, o contador e o modal consomem. */ | `src/components/avaliacao/aprovacaoGestor.ts` |
| • MESMAS REGRAS do servidor: a validação do Potencial só vale depois da | `src/components/avaliacao/aprovacaoLocal.ts` |
| validação anterior. | `src/components/avaliacao/aprovacaoLocal.ts` |
| * Validação do Potencial (espelho de `feedbacks_360_validacoes_potencial`). */ | `src/components/avaliacao/aprovacaoLocal.ts` |
| * `colaboradorId::cicloId` → validação vigente do RH (na versão aprovada). */ | `src/components/avaliacao/aprovacaoLocal.ts` |
| * Limpa SOMENTE o armazenamento da vitrine (mocks permanecem intactos). */ | `src/components/avaliacao/aprovacaoLocal.ts` |
| Nova decisão invalida a validação anterior do Potencial (mesma régua do | `src/components/avaliacao/aprovacaoLocal.ts` |
| servidor: a validação vale para a versão aprovada vigente). | `src/components/avaliacao/aprovacaoLocal.ts` |
| gestor) e a validação do Potencial também — como o servidor faz quando a | `src/components/avaliacao/aprovacaoLocal.ts` |
| * RH VALIDA O POTENCIAL na vitrine — SOMENTE depois da aprovação do gestor e | `src/components/avaliacao/aprovacaoLocal.ts` |
| • `versaoValidacao` = versão da AVALIAÇÃO DO GESTOR (âncora da validação, | `src/components/avaliacao/aprovacaoLocal.ts` |
| * Versão da avaliação do GESTOR — âncora da validação do RH. */ | `src/components/avaliacao/aprovacaoLocal.ts` |
| * Regra (a mesma do motor oficial): | `src/components/avaliacao/aprovacaoLocal.ts` |
| registro novo ou reaberto passa a exigir aprovação + validação. | `src/components/avaliacao/aprovacaoLocal.ts` |
| comparação legada decisão × validação. | `src/components/avaliacao/aprovacaoLocal.ts` |
| • a escrita NÃO pode ser feita pelo app separadamente do `UPDATE` de status: | `src/components/avaliacao/auditoriaFeedback.ts` |
| * Recorta apenas os campos que mudaram — é isso que vai para a trilha. | `src/components/avaliacao/auditoriaFeedback.ts` |
| * ── IDEMPOTÊNCIA (regra do plano) ─────────────────────────────────────────── | `src/components/avaliacao/criacaoFeedback.ts` |
| ─── Validação de payload (espelho leve do formulário + da RPC) ───────────── */ | `src/components/avaliacao/criacaoFeedback.ts` |
| * Confere o MÍNIMO que a RPC exige. Não substitui a validação do formulário | `src/components/avaliacao/criacaoFeedback.ts` |
| funções leem SOMENTE campos que já existem nas tabelas reais lidas por | `src/components/avaliacao/desempenhoComum.ts` |
| * Progresso (%) de uma meta. Mesma regra da área: atual ÷ objetivo. Quando não | `src/components/avaliacao/desempenhoComum.ts` |
| * Item em atraso: tem prazo vencido e ainda não está concluído. */ | `src/components/avaliacao/desempenhoComum.ts` |
| * As faixas intermediárias apenas repetem o mesmo acabamento (par | `src/components/avaliacao/desempenhoComum.ts` |
| * Regra do módulo: TODOS os controles executam a ação que prometem, nos DOIS | `src/components/avaliacao/desempenhoDemoStore.ts` |
| arquivos de mock — as fixtures continuam intocadas e são apenas a BASE. | `src/components/avaliacao/desempenhoDemoStore.ts` |
| * Reinicializa SOMENTE o que foi alterado na vitrine (criados, patches e | `src/components/avaliacao/desempenhoDemoStore.ts` |
| exclusões) e PRESERVA a trilha — é o "reinicializar apenas os dados alterados | `src/components/avaliacao/desempenhoDemoStore.ts` |
| * CANCELADO É SOMENTE LEITURA. A edição demonstrativa não pode “reabrir por | `src/components/avaliacao/desempenhoDemoStore.ts` |
| EDIÇÃO DE FEEDBACK — REGRA ÚNICA DE STATUS. | `src/components/avaliacao/edicaoFeedback.ts` |
| * Feedback `cancelado` é SOMENTE LEITURA. A única forma de voltar a editá-lo é | `src/components/avaliacao/edicaoFeedback.ts` |
| * A regra vive aqui para ser consumida em TODAS as camadas do cliente: | `src/components/avaliacao/edicaoFeedback.ts` |
| partir de qualquer tela (formulário de feedback, ações de status, validação | `src/components/avaliacao/escritaOperacional.ts` |
| • não decide permissão (papel/empresa são validados no banco); | `src/components/avaliacao/escritaOperacional.ts` |
| A demonstração é apenas de VISUALIZAÇÃO: ela não bloqueia gravações reais. | `src/components/avaliacao/escritaOperacional.ts` |
| Quem protege o banco é a regra de ID FICTÍCIO (`mock-*`), checada logo | `src/components/avaliacao/escritaOperacional.ts` |
| depende SOMENTE do registro: | `src/components/avaliacao/execucaoFeedback.ts` |
| regra recusaria — e, quando recusa, o controle permanece VISÍVEL e | `src/components/avaliacao/feedbackCanonico.ts` |
| * Por que a decisão NÃO pode ser executada (texto pronto; `null` = pode). */ | `src/components/avaliacao/feedbackCanonico.ts` |
| ─── Ações: UMA regra para lista, fila e modal ───────────────────────────── */ | `src/components/avaliacao/feedbackCanonico.ts` |
| * Por que não pode (texto exibido no `title` do controle). */ | `src/components/avaliacao/feedbackCanonico.ts` |
| * Cancelado é SOMENTE LEITURA até reabertura administrativa. */ | `src/components/avaliacao/feedbackCanonico.ts` |
| * HABILITAÇÃO (regra ÚNICA, a MESMA do servidor — `pode_aprovar_colaborador` | `src/components/avaliacao/feedbackCanonico.ts` |
| ENCAMINHAMENTO (RH/admin) — visível apenas para quem pode encaminhar E na | `src/components/avaliacao/feedbackCanonico.ts` |
| VALIDAÇÃO DO POTENCIAL (RH) — controle LEGADO. O fluxo atual termina na | `src/components/avaliacao/feedbackCanonico.ts` |
| apenas ele mesmo; na fila consolidada contém gestor/par/auto/subordinado. | `src/components/avaliacao/feedbackCanonico.ts` |
| aqui inventa dado: todas as funções leem SOMENTE campos que já existem em | `src/components/avaliacao/feedbacksComum.ts` |
| (prazo) e nos `pdis` (competência em foco do avaliado). | `src/components/avaliacao/feedbacksComum.ts` |
| * Prazo do ciclo do feedback, formatado (dd/mm/aaaa) ou `—`. */ | `src/components/avaliacao/feedbacksComum.ts` |
| * Prazo do ciclo do feedback (`data_fim`), formatado. */ | `src/components/avaliacao/feedbacksComum.ts` |
| * Leitura do prazo do ciclo para o banner ("Próximo prazo em 3 dias."). */ | `src/components/avaliacao/feedbacksComum.ts` |
| METAS & OKRs — derivações da aba (situação, prazo, ordem e filtros). | `src/components/avaliacao/metasComum.ts` |
| exibem. Nada aqui inventa dado: TODAS as funções leem somente campos que já | `src/components/avaliacao/metasComum.ts` |
| 2. `atrasada`  → prazo vencido e ainda não concluída — é EXATAMENTE o | `src/components/avaliacao/metasComum.ts` |
| `estaAtrasado()` compartilhado (`data_limite`/`prazo` < agora); | `src/components/avaliacao/metasComum.ts` |
| ritmo esperado para o prazo já decorrido (`progressoMeta` < | `src/components/avaliacao/metasComum.ts` |
| meta sem andamento (`pausado`/`bloqueado`). É a única regra nova e é | `src/components/avaliacao/metasComum.ts` |
| histórico de progresso. O campo é lido apenas se existir | `src/components/avaliacao/metasComum.ts` |
| `listarMetas` seleciona somente `nome_completo` na relação `colaborador`. | `src/components/avaliacao/metasComum.ts` |
| * Dias até o prazo: 0 = hoje, positivo = restantes, negativo = em atraso. */ | `src/components/avaliacao/metasComum.ts` |
| * Prazo formatado (dd/mm/aaaa) ou `—` quando não há data. */ | `src/components/avaliacao/metasComum.ts` |
| * Recorte MÍNIMO de `colaboradores` que a resolução de departamento usa. A | `src/components/avaliacao/metasComum.ts` |
| seja: nenhuma etiqueta de rascunho existe e nenhuma regra nova é criada aqui | `src/components/avaliacao/metasComum.ts` |
| Compostos como "okr - equipe" caem em OKR — a MESMA regra do ícone e do | `src/components/avaliacao/metasComum.ts` |
| * Tinta da linha de prazo (a leitura contextual muda com a situação). */ | `src/components/avaliacao/metasComum.ts` |
| * Instante do prazo, no fim do dia. Aceita `data_limite` (coluna real) e | `src/components/avaliacao/metasComum.ts` |
| * ── REGRAS DE NEGÓCIO APLICADAS ──────────────────────────────────────────── | `src/components/avaliacao/motorAvaliacao360.ts` |
| • POTENCIAL = 100% gestor, com VALIDAÇÃO OBRIGATÓRIA do RH vinculada à versão | `src/components/avaliacao/motorAvaliacao360.ts` |
| … +881 linhas — lista completa em `context.json` | |
