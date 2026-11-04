# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `173dc0cac0` · branch `main` · 2026-11-04 13:17 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

_Nenhum arquivo em `manual/`. Copie `manual/TEMPLATE-regras-de-negocio.md` para `manual/regras.md` e preencha._

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real em `06`)

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `user_empresas` | Usuários podem ver suas associações | SELECT | public | permissive | `("user_id" = "auth"."uid"())` |  |
| `fila_notificacoes` | Usuários podem ver suas próprias notificações | SELECT | public | permissive | `("auth"."uid"() = "user_id")` |  |
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
| `rate_limit_logs` | Admins can view rate limit logs | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `blocked_ips` | Admins can manage blocked IPs | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `ip_whitelist` | Admins can manage IP whitelist | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `rate_limit_config` | Admins can manage rate limit config | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `user_sessions` | Users can view own sessions | SELECT | authenticated | permissive | `user_id = auth.uid() OR public.is_admin(auth.uid())` |  |
| `user_sessions` | Users can manage own sessions | ALL | authenticated | permissive | `user_id = auth.uid()` |  |
| `user_mfa` | Users can manage own MFA | ALL | authenticated | permissive | `user_id = auth.uid()` |  |
| `login_attempts` | Admins can view login attempts | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `verification_tokens` | Users can manage own tokens | ALL | authenticated | permissive | `user_id = auth.uid()` |  |
| `security_alerts` | Admins can view security alerts | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `security_alerts` | Admins can update security alerts | UPDATE | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `password_policies` | All can read password policies | SELECT | authenticated | permissive | `true` |  |
| `password_policies` | Admins can manage password policies | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `password_history` | Users can view own password history | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `webauthn_credentials` | Users can view their own credentials | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `webauthn_credentials` | Users can update their own credentials | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `webauthn_challenges` | Allow all operations on challenges | ALL | public | permissive | `true` | `true` |
| `role_permissions` | Usuários autenticados podem visualizar role_permissions | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `geo_allowed_countries` | Admins can manage geo_allowed_countries | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `geo_blocking_config` | Admins can manage geo_blocking_config | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `geo_blocked_attempts` | Admins can view geo_blocked_attempts | SELECT | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `password_reset_requests` | Admins can manage password_reset_requests | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `password_reset_requests` | Users can view their own requests | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `password_reset_requests` | Users can create their own requests | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `password_reset_config` | Admins can manage password_reset_config | ALL | authenticated | permissive | `public.is_admin(auth.uid())` |  |
| `saved_filters` | Users manage own filters | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `storage.objects` | Auth users upload contratacao | ALL | authenticated | permissive | `bucket_id = 'contratacao'` | `bucket_id = 'contratacao'` |
| `notificacoes` | Users can manage scoped notifications | ALL | authenticated | permissive | `public.is_admin(auth.uid()) OR user_id = auth.uid() OR ( empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid(), empresa_id) )` | `public.is_admin(auth.uid()) OR user_id = auth.uid() OR ( empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid(), empresa_id) )` |
| `periodos_aquisitivos` | Users can manage periodos by empresa | ALL | authenticated | permissive | `public.is_admin(auth.uid()) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = periodos_aquisitivos.colaborador_id AND c.empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid(), c.empresa_id) )` | `public.is_admin(auth.uid()) OR EXISTS ( SELECT 1 FROM public.colaboradores c WHERE c.id = periodos_aquisitivos.colaborador_id AND c.empresa_id IS NOT NULL AND public.user_belongs_to_empresa(auth.uid(), c.empresa_id) )` |
| `tipos_admissao` | Read tipos_admissao | SELECT | authenticated | permissive | `true` |  |
| `tipos_estabilidade` | Read tipos_estabilidade | SELECT | authenticated | permissive | `true` |  |
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
| `comunicados` | empresa_comunicados | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `turnos` | empresa_turnos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `escalas_trabalho` | empresa_escalas_trabalho | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `workflows_definicoes` | empresa_workflows_def | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `workflows_execucoes` | empresa_workflows_exec | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `despesas` | empresa_despesas | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `controle_acesso` | empresa_controle_acesso | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `lgpd_consentimentos` | empresa_lgpd_consentimentos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `ciclos_avaliacao` | ciclos_avaliacao_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `ciclos_avaliacao` | ciclos_avaliacao_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `ciclos_avaliacao` | ciclos_avaliacao_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `metas_okrs` | metas_okrs_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `metas_okrs` | metas_okrs_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `metas_okrs` | metas_okrs_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `feedbacks_360` | feedbacks_360_select | SELECT | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `feedbacks_360` | feedbacks_360_update | UPDATE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
| `feedbacks_360` | feedbacks_360_delete | DELETE | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |  |
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
| `ciclos_avaliacao` | ciclos_avaliacao_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `metas_okrs` | metas_okrs_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `feedbacks_360` | feedbacks_360_insert | INSERT | authenticated | permissive |  | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
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
| `convenios` | tenant_convenios | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `dados_estagiario` | tenant_dados_estagiario | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `dctfweb_declaracoes` | tenant_dctfweb_declaracoes | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
| `departamentos` | tenant_departamentos | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
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
| `seguros_vida` | tenant_seguros_vida | ALL | authenticated | permissive | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` | `empresa_id IN (SELECT public.get_user_empresas(auth.uid()))` |
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
| … +793 linhas — lista completa em `context.json` | | | | | | |

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
| … +4289 linhas — lista completa em `context.json` | | |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
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
| tr_monitor_timeout | AFTER UPDATE OF STATUS | `fila_processamento` | `check_processamento_timeout` | `NEW.status = 'failed'` |
| trg_colab_cpf_hash | BEFORE INSERT OR UPDATE OF CPF | `colaboradores` | `fn_colab_cpf_hash` |  |
| ferias_status_transition | BEFORE UPDATE OF STATUS | `ferias` | `trg_ferias_status_transition` |  |
| faltas_status_transition | BEFORE UPDATE OF STATUS | `faltas` | `trg_faltas_status_transition` |  |
| ajuste_ponto_status_transition | BEFORE UPDATE OF STATUS | `solicitacoes_ajuste_ponto` | `trg_ajuste_ponto_status_transition` |  |
| ciclos_status_transition | BEFORE UPDATE OF STATUS | `ciclos_avaliacao` | `trg_ciclos_status_transition` |  |
| desligamentos_status_transition | BEFORE UPDATE OF STATUS | `desligamentos` | `trg_desligamentos_status_transition` |  |
| pdis_status_transition | BEFORE UPDATE OF STATUS | `pdis` | `trg_pdis_status_transition` |  |
| pesquisas_status_transition | BEFORE UPDATE OF STATUS | `pesquisas` | `trg_pesquisas_status_transition` |  |
| vagas_status_transition | BEFORE UPDATE OF STATUS | `vagas` | `trg_vagas_status_transition` |  |
| trg_despesas_log | AFTER INSERT OR UPDATE OF STATUS | `despesas` | `log_despesa_status_change` |  |
| tr_asos_auto_marcar_agendamento | AFTER UPDATE OF STATUS | `asos` | `asos_auto_marcar_agendamento_realizado` |  |
| trg_audit_log_mask_sensitive | BEFORE INSERT | `audit_log` | `mask_sensitive_audit_data` |  |
| trg_periodos_aquisitivos_recalc_dias | BEFORE INSERT OR UPDATE OF FALTAS_PERIODO | `periodos_aquisitivos` | `trg_periodos_aquisitivos_recalc_dias` |  |
| ferias_bloquear_gozo_sem_pagamento | BEFORE UPDATE OF STATUS | `ferias` | `trg_ferias_bloquear_gozo_sem_pagamento` |  |
| trg_audit_default_source | BEFORE INSERT | `audit_log_unified` | `audit_log_unified_default_source` |  |
| trg_pensoes_set_empresa | BEFORE INSERT OR UPDATE OF COLABORADOR_ID | `pensoes` | `fn_pensoes_set_empresa` |  |
| trg_documentos_afastamento_validacao | BEFORE UPDATE OF VALIDADO | `documentos_afastamento` | `fn_documentos_afastamento_validacao` |  |
| trg_colaborador_sync_cargo_texto | BEFORE INSERT OR UPDATE OF CARGO_ID | `colaboradores` | `fn_colaborador_sync_cargo_texto` |  |
| tr_enforce_report_schedule_authorship | BEFORE INSERT OR UPDATE | `relatorios_agendados` | `enforce_report_schedule_authorship` |  |
| trg_pcs_planos_audit | BEFORE INSERT OR UPDATE | `pcs_planos` | `pcs_set_audit_fields` |  |
| trg_pcs_validate_factor | BEFORE INSERT OR UPDATE | `pcs_fatores` | `pcs_validate_factor` |  |
| trg_pcs_recalc_pontos | BEFORE INSERT OR UPDATE | `pcs_avaliacoes_cargo` | `pcs_recalc_pontos` |  |
| tr_protect_esocial_transport_fields | BEFORE UPDATE | `esocial_eventos` | `protect_esocial_transport_fields` |  |
| trg_provisao_auditoria_empresa | BEFORE INSERT | `provisao_auditoria` | `provisao_auditoria_set_empresa` |  |
| trg_documentos_sync_empresa_id | BEFORE INSERT OR UPDATE OF COLABORADOR_ID | `documentos` | `documentos_sync_empresa_id` |  |
| trg_lgpd_retencao_logs_updated_at | BEFORE UPDATE | `lgpd_retencao_logs` | `update_updated_at_column` |  |
| trg_contas_bancarias_encrypt | BEFORE INSERT OR UPDATE | `contas_bancarias` | `encrypt_contas_bancarias_fields` |  |
| trg_pix_itens_encrypt | BEFORE INSERT OR UPDATE | `pix_itens` | `encrypt_pix_itens_fields` |  |
| trg_faltas_sync_faltas_periodo | AFTER INSERT OR UPDATE OR DELETE | `faltas` | `fn_faltas_sync_faltas_periodo` |  |
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
| detect_status_anomaly | AFTER INSERT | `audit_log` | `trg_detect_status_anomaly` |  |
| dp_audit_log_integrity_check | BEFORE INSERT | `dp_audit_log` | `dp_audit_log_prevent_future` |  |
| dp_audit_log_no_delete | BEFORE DELETE | `dp_audit_log` | `dp_audit_log_immutable` |  |
| dp_audit_log_no_update | BEFORE UPDATE | `dp_audit_log` | `dp_audit_log_immutable` |  |
| dp_data_catalog_audit | AFTER INSERT OR DELETE OR UPDATE | `dp_data_catalog` | `dp_track_pii_access` |  |
| dp_data_catalog_updated_at | BEFORE UPDATE | `dp_data_catalog` | `dp_set_updated_at` |  |
| dp_retention_updated_at | BEFORE UPDATE | `dp_retention_policy` | `dp_set_updated_at` |  |
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
| trg_catalogo_infracoes_updated_at | BEFORE UPDATE | `catalogo_infracoes` | `tg_catalogo_infracoes_updated_at` |  |
| trg_clinicas_horarios_upd | BEFORE UPDATE | `clinicas_partners_horarios` | `update_updated_at_column` |  |
| trg_clinicas_partners_upd | BEFORE UPDATE | `clinicas_partners` | `update_updated_at_column` |  |
| trg_clinicas_servicos_upd | BEFORE UPDATE | `clinicas_partners_servicos` | `update_updated_at_column` |  |
| trg_conformidade_ponto_logs_append_only | BEFORE DELETE OR UPDATE | `conformidade_ponto_logs` | `audit_log_append_only` |  |
| trg_conformidade_ponto_logs_no_delete | BEFORE DELETE | `conformidade_ponto_logs` | `audit_log_append_only` |  |
| trg_conformidade_ponto_logs_no_update | BEFORE UPDATE | `conformidade_ponto_logs` | `audit_log_append_only` |  |
| trg_consolidar_batidas | AFTER INSERT OR UPDATE | `batidas_ponto` | `fn_consolidar_batidas` |  |
| trg_contab_contatos_updated | BEFORE UPDATE | `contabilidade_contatos` | `update_updated_at_column` |  |
| trg_contab_threads_updated | BEFORE UPDATE | `contabilidade_threads` | `update_updated_at_column` |  |
| trg_contrato_templates_updated | BEFORE UPDATE | `contrato_templates` | `update_updated_at_column` |  |
| trg_contrato_token_auditar | AFTER INSERT OR UPDATE | `contrato_assinatura_tokens` | `trg_contrato_token_auditar` |  |
| trg_contratos_gerados_updated | BEFORE UPDATE | `contratos_gerados` | `update_updated_at_column` |  |
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
| trg_ferias_reconciliacao_alert | AFTER INSERT | `ferias_reconciliacao_logs` | `trg_ferias_reconciliacao_alert` |  |
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
| trg_fwd_audit_unified | AFTER INSERT | `ponto_auditoria_fraude` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `premiacoes_auditoria` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `provisao_auditoria` | `fwd_to_audit_unified` |  |
| trg_fwd_audit_unified | AFTER INSERT | `trilha_auditoria_ponto` | `fwd_to_audit_unified` |  |
| trg_gerar_qr_extintor | BEFORE INSERT | `sst_extintores` | `gerar_qr_extintor` |  |
| trg_holerite_dist_updated | BEFORE UPDATE | `holerite_distribuicoes` | `update_updated_at_column` |  |
| trg_impedir_alteracao_batida_periodo_fechado_upd | BEFORE UPDATE | `batidas_ponto` | `impedir_alteracao_batida_em_periodo_fechado` |  |
| trg_impedir_alteracao_cnab_transmitida | BEFORE UPDATE | `cnab_remessas` | `impedir_alteracao_cnab_transmitida` |  |
| trg_impedir_alteracao_desligamento_homologado | BEFORE UPDATE | `desligamentos` | `impedir_alteracao_desligamento_homologado` |  |
| trg_impedir_alteracao_esocial_transmitido | BEFORE UPDATE | `esocial_eventos` | `impedir_alteracao_esocial_transmitido` |  |
| trg_impedir_alteracao_ferias_concluidas | BEFORE UPDATE | `ferias` | `impedir_alteracao_ferias_concluidas` |  |
| trg_impedir_alteracao_folha_fechada | BEFORE UPDATE | `folhas_pagamento` | `impedir_alteracao_folha_fechada` |  |
| trg_impedir_alteracao_holerite_assinado | BEFORE UPDATE | `holerites` | `impedir_alteracao_holerite_assinado` |  |
| trg_impedir_alteracao_periodo_ponto_fechado | BEFORE UPDATE | `periodos_ponto` | `impedir_alteracao_periodo_ponto_fechado` |  |
| trg_impedir_delete_batida_periodo_fechado | BEFORE DELETE | `batidas_ponto` | `impedir_alteracao_batida_em_periodo_fechado` |  |
| trg_integracao_logs_no_delete | BEFORE DELETE | `integracao_logs` | `audit_log_append_only` |  |
| trg_integracao_logs_no_update | BEFORE UPDATE | `integracao_logs` | `audit_log_append_only` |  |
| trg_log_envio_relatorios_no_delete | BEFORE DELETE | `log_envio_relatorios` | `audit_log_append_only` |  |
| trg_log_envio_relatorios_no_update | BEFORE UPDATE | `log_envio_relatorios` | `audit_log_append_only` |  |
| trg_logs_integracoes_no_delete | BEFORE DELETE | `logs_integracoes` | `audit_log_append_only` |  |
| trg_logs_integracoes_no_update | BEFORE UPDATE | `logs_integracoes` | `audit_log_append_only` |  |
| … +134 linhas — lista completa em `context.json` | | | | |

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
| `set_own_default_empresa` | Autenticação obrigatória | `supabase/migrations/20260911200000_p0_bridge_membership_authorization.sql` |
| `set_own_default_empresa` | Empresa não vinculada ao usuário autenticado | `supabase/migrations/20260911200000_p0_bridge_membership_authorization.sql` |
| `admin_associar_usuario_empresa` | Apenas administradores podem associar usuários a empresas | `supabase/migrations/20260911200000_p0_bridge_membership_authorization.sql` |
| `dp_mig_set_search_path` | requires routine % | `supabase/migrations/20260912150000_p0_secdef_search_path.sql` |
| `claim_due_report_schedules` | invalid report schedule claim arguments | `supabase/migrations/20260912192000_p0_report_schedule_claims.sql` |
| `replace_monthly_provisions` | invalid monthly provision replacement arguments | `supabase/migrations/20260912193000_p1_atomic_provisions_contract.sql` |
| `replace_monthly_provisions` | invalid monthly provision row | `supabase/migrations/20260912193000_p1_atomic_provisions_contract.sql` |
| `replace_monthly_provisions` | monthly provision collaborator is outside the company | `supabase/migrations/20260912193000_p1_atomic_provisions_contract.sql` |
| `replace_monthly_provisions` | monthly provision replacement row count mismatch | `supabase/migrations/20260912193000_p1_atomic_provisions_contract.sql` |
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
| `decrypt_dados_bancarios_tenant` | Acesso negado. | `supabase/migrations/20261019000000_qa3_db_fixes.sql` |
| `decrypt_dados_bancarios_tenant` | Acesso negado. | `supabase/migrations/20261019000000_qa3_db_fixes.sql` |
| `ponto_espelhos_assinados_guard_update` | Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %. | `supabase/migrations/20261023000000_qa_r3_fixes.sql` |
| `ponto_espelhos_assinados_guard_delete` | Espelhos de ponto assinados são append-only (Portaria MTP 671/21). DELETE não é permitido. | `supabase/migrations/20261027120000_qa_r5_fixes.sql` |
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
| `programacao_ferias_aprovar_rh` | Apenas RH/Admin pode aprovar | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_aprovar_rh` | Programação precisa estar aprovada pelo gestor. Status atual: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_converter` | Programação não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_converter` | Sem permissão de escopo | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_converter` | Apenas RH/Admin pode converter | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_converter` | Só é possível converter após aprovação do RH (status atual: %) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_converter` | Programação já convertida | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_mover` | mês inválido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_mover` | Programação não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_mover` | Sem permissão de escopo | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_mover` | Não é possível mover programação no status % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_rejeitar` | Programação não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_rejeitar` | Sem permissão de escopo | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_rejeitar` | Sem permissão | `supabase/rebaseline/20260831_corrected_public.sql` |
| `programacao_ferias_rejeitar` | Programação já finalizada: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_afastamento_encerrado` | Afastamentos encerrados/aprovados não podem ser deletados (prova previdenciária INSS - retenção mínima 20 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_aso_emitido` | ASOs emitidos não podem ser deletados (NR-7: retenção mínima 20 anos após desligamento). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_cat_transmitida` | CATs transmitidas não podem ser deletadas (prova previdenciária INSS - retenção mínima 20 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_cnab_transmitida` | Remessas CNAB transmitidas não podem ser deletadas (rastreabilidade financeira - retenção mínima 5 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_desligamento_homologado` | Desligamentos homologados não podem ser deletados (retenção fiscal/trabalhista mínima 5 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_documento_assinado` | Documentos assinados digitalmente não podem ser deletados (validade jurídica MP 2.200-2/2001 - retenção mínima 5 anos após término do vínculo). Use status=cancelado. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_epi_entrega_assinada` | Entregas de EPI assinadas não podem ser deletadas (NR-6: prova de fornecimento em ações trabalhistas - retenção mínima 5 anos após desligamento). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_esocial_transmitido` | Eventos eSocial transmitidos ao governo não podem ser deletados (exigência legal - use evento S-3000 de exclusão). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_ferias_concluidas` | Férias em gozo/pagas/concluídas não podem ser deletadas (rastreabilidade CLT - retenção mínima 5 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_folha_fechada` | Folhas fechadas não podem ser deletadas (exigência fiscal/contábil - retenção mínima 5 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_holerite_assinado` | Holerites assinados não podem ser deletados (exigência fiscal - retenção mínima 5 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_medida_aplicada` | Medidas disciplinares aplicadas não podem ser deletadas (prova trabalhista - retenção mínima 5 anos). Use status=anulada. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_periodo_ponto_fechado` | Períodos de ponto fechados não podem ser deletados (Portaria 671 MTP - retenção mínima 5 anos). | `supabase/rebaseline/20260831_corrected_public.sql` |
| `proibir_delete_ponto` | Registros de ponto não podem ser deletados por exigência legal (Portaria 671). Use o fluxo de ajuste auditado. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `purge_audit_log_old` | Retenção mínima de 30 dias por compliance | `supabase/rebaseline/20260831_corrected_public.sql` |
| `purge_audit_log_old` | Apenas administradores podem purgar audit_log | `supabase/rebaseline/20260831_corrected_public.sql` |
| `reconciliar_afdt` | Importação não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `reconciliar_afdt` | Sem permissão nesta empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `record_pii_access` | AUTH_REQUIRED | `supabase/rebaseline/20260831_corrected_public.sql` |
| `record_pii_access` | TENANT_FORBIDDEN | `supabase/rebaseline/20260831_corrected_public.sql` |
| `record_pii_access` | INVALID_TABLE | `supabase/rebaseline/20260831_corrected_public.sql` |
| `record_pii_access` | INVALID_ACTION | `supabase/rebaseline/20260831_corrected_public.sql` |
| `record_pii_access` | INVALID_COUNT | `supabase/rebaseline/20260831_corrected_public.sql` |
| `record_pii_access` | INVALID_RECORD_ID | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_auditoria` | nao autenticado | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_auditoria` | tabela invalida | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_auditoria` | acao invalida: % | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_auditoria` | empresa fora do escopo do usuario | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_comunicado_ferias_coletivas` | Autenticação obrigatória | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_comunicado_ferias_coletivas` | Férias coletivas não encontradas | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_comunicado_ferias_coletivas` | Sem acesso a essa empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_comunicado_ferias_coletivas` | Apenas RH ou Admin podem gerar comunicados | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_pagamento_ferias` | AUTH_REQUIRED | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_pagamento_ferias` | FERIAS_NOT_FOUND | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_pagamento_ferias` | FORBIDDEN | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_pagamento_ferias` | PAGAMENTO_JA_CONFIRMADO | `supabase/rebaseline/20260831_corrected_public.sql` |
| `registrar_pagamento_ferias` | VALOR_INVALIDO | `supabase/rebaseline/20260831_corrected_public.sql` |
| `rejeitar_despesa` | Motivo da rejeição é obrigatório | `supabase/rebaseline/20260831_corrected_public.sql` |
| `rejeitar_despesa` | Despesa não encontrada ou não pode ser rejeitada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `resolve_security_alert` | Apenas administradores podem resolver alertas | `supabase/rebaseline/20260831_corrected_public.sql` |
| `resolve_security_alert` | Alerta não encontrado ou já resolvido | `supabase/rebaseline/20260831_corrected_public.sql` |
| `resolver_divergencia_afdt` | Divergência não encontrada | `supabase/rebaseline/20260831_corrected_public.sql` |
| `resolver_divergencia_afdt` | Sem permissão para esta empresa | `supabase/rebaseline/20260831_corrected_public.sql` |
| `revogar_espelho_ponto` | Apenas administradores podem revogar assinaturas | `supabase/rebaseline/20260831_corrected_public.sql` |
| `revogar_espelho_ponto` | Motivo obrigatório (mín. 5 caracteres) | `supabase/rebaseline/20260831_corrected_public.sql` |
| `seal_enforce` | Selo de integridade inválido para %: o código enviado não confere com o conteúdo do registro. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `seal_enforce` | Registro selado de % não pode ser alterado: algum campo protegido pelo selo de integridade foi modificado. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `seal_enforce` | O selo de integridade de % não pode ser substituído manualmente. | `supabase/rebaseline/20260831_corrected_public.sql` |
| `sec_verify_seals_admin` | Acesso restrito a administradores. | `supabase/rebaseline/20260831_corrected_public.sql` |
| … +49 linhas — lista completa em `context.json` | | |

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
| `afd_geracoes` | `status` | **livre (sem enum/CHECK)** | `gerado` |

### E.2 Mapas de transição declarados no código

- **transition** (`src/components/layout/PageTransition.tsx`):
  ```ts
  type: 'tween', ease: resolved.ease, duration: resolved.duration,
  ```
- **nextStageMap** (`src/components/premiacoes/RewardsApprovalHub.tsx`):
  ```ts
  calculado: 'revisando', revisando: 'aprovado_gestor', aprovado_gestor: 'aprovado_rh', aprovado_rh: 'aprovado_financeiro',
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
| `type` | `all` | compara | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx` |
| `type` | `anotacao` | compara, escreve | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `type` | `aprovador` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx`<br>`src/pages/WorkflowsPage.tsx` |
| `type` | `cardinal` | escreve | `src/hooks/useTranslation.ts` |
| `type` | `chore` | escreve | `release.config.js` |
| `type` | `ci` | escreve | `release.config.js` |
| `type` | `cpf` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `creation` | compara, escreve | `src/components/esocial/ESocialTimeline.tsx` |
| `type` | `critical` | compara, escreve | `src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `ctps` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `delay` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `docs` | escreve | `release.config.js` |
| `type` | `email` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `end` | compara, escreve | `src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `entrevista` | compara, escreve | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `type` | `event` | escreve | `supabase/functions/_shared/sentry.ts` |
| `type` | `feat` | escreve | `release.config.js` |
| `type` | `fix` | escreve | `release.config.js` |
| `type` | `foto` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `gateway_and` | compara, escreve | `src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `gateway_xor` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `image_url` | escreve | `supabase/functions/OCR/index.ts`<br>`supabase/functions/process-document-ocr/index.ts`<br>`supabase/functions/validar-biometria/index.ts` |
| `type` | `info` | compara, escreve | `src/components/esocial/ESocialAIInsights.tsx`<br>`src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `json_object` | escreve | `supabase/functions/process-document-ocr/index.ts` |
| `type` | `literal` | compara | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `type` | `magiclink` | escreve | `src/pages/AuthCallbackPage.tsx`<br>`supabase/functions/auth-gov-br/index.ts` |
| `type` | `module` | escreve | `vite.config.pwa.ts` |
| `type` | `oxc` | escreve | `vite.config.ts` |
| `type` | `perf` | escreve | `release.config.js` |
| `type` | `refactor` | escreve | `release.config.js` |
| `type` | `residencia` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `rg` | escreve | `src/pages/ContratacaoPage.tsx` |
| `type` | `server` | escreve | `src/hooks/useServerValidation.ts` |
| `type` | `spring` | escreve | `src/components/dashboard/WorkforceHealthScore.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>`src/components/layout/MobileBottomNav.tsx`<br>`src/components/layout/MobileQuickActions.tsx`<br>`src/components/onboarding/GuidedTour.tsx`<br>… +4 |
| `type` | `start` | compara, escreve | `src/components/workflows/WorkflowDesigner.tsx`<br>`src/components/workflows/ordenarEtapas.ts`<br>`src/pages/WorkflowsPage.tsx` |
| `type` | `string` | compara | `supabase/functions/tabelas-dominio/index.ts` |
| `type` | `style` | escreve | `release.config.js` |
| `type` | `success` | compara, escreve | `src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `test` | escreve | `release.config.js` |
| `type` | `teste` | compara, escreve | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `type` | `text` | escreve | `supabase/functions/OCR/index.ts`<br>`supabase/functions/process-document-ocr/index.ts`<br>`supabase/functions/validar-biometria/index.ts` |
| `type` | `transmission` | escreve | `src/components/esocial/ESocialTimeline.tsx` |
| `type` | `tween` | escreve | `src/components/layout/PageTransition.tsx` |
| `type` | `warning` | compara, escreve | `src/components/esocial/ESocialAIInsights.tsx`<br>`src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/ferias/FeriasInsights.tsx`<br>`src/components/folha/FolhaValidationAlerts.tsx` |
| `type` | `webhook` | compara, escreve | `src/components/workflows/NodeInspector.tsx`<br>`src/components/workflows/WorkflowDesigner.tsx` |
| `type` | `window` | escreve | `public/sw-custom.js` |
| `tipo` | `13_salario` | escreve | `supabase/functions/calcular-provisoes/index.ts` |
| `tipo` | `Contrato` | compara | `src/components/portal/PortalDocumentosTab.tsx` |
| `tipo` | `LTCAT` | compara | `src/components/sst/SSTProgramasTab.tsx` |
| `tipo` | `Manual` | escreve | `src/services/backupService.ts` |
| `tipo` | `Outros` | escreve | `src/components/colaborador-detalhes/ColaboradorDocuments.tsx` |
| `tipo` | `PCMSO` | compara | `src/components/sst/SSTProgramasTab.tsx` |
| `tipo` | `PGR` | compara, escreve, filtra | `src/components/sst/GerarPgrButton.tsx`<br>`src/components/sst/SSTProgramasTab.tsx`<br>`supabase/functions/gerar-pgr/index.ts` |
| `tipo` | `PO_QUIMICO_ABC` | escreve | `src/pages/AdminExtintoresPage.tsx` |
| `tipo` | `PPP` | compara | `src/components/sst/SSTProgramasTab.tsx` |
| `tipo` | `S-1000` | compara | `src/utils/esocialXmlGenerator.ts`<br>`supabase/functions/enviar-esocial/index.ts` |
| `tipo` | `S-2200` | compara | `src/utils/esocialXmlGenerator.ts`<br>`supabase/functions/enviar-esocial/index.ts` |
| `tipo` | `TODAS` | compara | `supabase/functions/gerar-guias/index.ts` |
| `tipo` | `absenteismo` | escreve | `supabase/functions/alertas-preditivos/index.ts` |
| `tipo` | `acesso` | escreve | `src/pages/LGPDPage.tsx` |
| `tipo` | `acidente_grave` | compara | `src/components/sst/SSTIncidentesTab.tsx` |
| `tipo` | `acidente_leve` | compara | `src/components/sst/SSTIncidentesTab.tsx` |
| `tipo` | `acordo` | compara | `src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `acordo_mutuo` | compara | `src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `admissoes` | escreve | `src/pages/DashboardPage.tsx` |
| `tipo` | `advertencia_escrita` | compara, escreve | `src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx` |
| `tipo` | `advertencia_verbal` | compara, escreve | `src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx` |
| `tipo` | `afastamentos` | escreve | `src/pages/DashboardPage.tsx` |
| `tipo` | `afastamentos_ativos` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `aleatoria` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `alimentacao` | escreve | `src/pages/BeneficioFormPage.tsx` |
| `tipo` | `alimenticia` | escreve | `src/pages/PensoesPage.tsx` |
| `tipo` | `alta` | compara | `src/components/dashboard/analytics/widgets.tsx` |
| `tipo` | `assinaturas` | compara, escreve | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/pages/DashboardExecutivoPage.tsx`<br>`src/pages/DashboardPage.tsx` |
| `tipo` | `atestado_medico` | compara | `src/pages/FaltasPage.tsx` |
| `tipo` | `auditoria` | compara | `supabase/functions/relatorio/index.ts` |
| `tipo` | `aviso` | escreve | `src/pages/ComunicacaoInternaPage.tsx` |
| `tipo` | `clima` | escreve | `src/pages/PesquisasClimaPage.tsx` |
| `tipo` | `cnpj` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `colaboradores` | compara | `supabase/functions/relatorio/index.ts` |
| `tipo` | `com_justa_causa` | compara | `src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `comprovante_endereco` | escreve | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `tipo` | `contrato_assinado` | escreve | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `tipo` | `contrato_vencendo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `cpf` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `credito` | compara, escreve, filtra | `src/pages/BancoHorasPage.tsx`<br>`src/pages/DashboardPage.tsx`<br>`src/pages/PontoPage.tsx`<br>`src/services/bancoHorasService.ts`<br>`supabase/functions/processar-ponto/index.ts` |
| `tipo` | `ctps` | escreve | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `tipo` | `culpa_reciproca` | compara | `src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `darf` | escreve | `src/services/edgeFunctionsService.ts` |
| `tipo` | `debito` | compara | `src/pages/BancoHorasPage.tsx` |
| `tipo` | `dependente` | escreve | `src/pages/PlanosSaudePage.tsx` |
| `tipo` | `desconto` | compara, escreve | `src/components/folha/LancamentosDialog.tsx`<br>`src/constants/rubricas.ts`<br>`src/pages/RubricasPage.tsx`<br>`src/services/folha/calculoLoteService.ts`<br>`src/services/folhaPagamentoService.ts`<br>… +2 |
| `tipo` | `desconto_excessivo` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `divergencia_esocial` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `documento_vencendo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `documentos_pessoais` | escreve | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `tipo` | `email` | compara, escreve | `supabase/functions/enviar-email-admissao/index.ts`<br>`supabase/functions/notificacao/index.ts`<br>`supabase/functions/pix-lote/index.ts`<br>`supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `tipo` | `empresa` | compara, escreve | `src/hooks/useFeriados.ts`<br>`src/pages/FeriadosPage.tsx`<br>`src/services/rescisaoService.ts` |
| `tipo` | `entrada` | compara, escreve | `src/components/ponto/PontoClockRegister.tsx`<br>`src/hooks/usePonto.ts`<br>`src/hooks/usePontoOffline.ts`<br>`src/pages/ControleAcessoPage.tsx`<br>`src/pages/PontoKioskPage.tsx`<br>… +5 |
| `tipo` | `evp` | compara | `supabase/functions/pix-lote/index.ts` |
| `tipo` | `exame` | escreve | `src/components/dashboard/MorningBriefing.tsx` |
| `tipo` | `exame_admissional` | escreve | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `tipo` | `excessive_overtime` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `falecimento` | compara | `src/pages/CalculadoraRescisaoPage.tsx` |
| `tipo` | `falta_informacao` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `fatigue_risk` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `ferias` | compara, escreve | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/hooks/usePendencias.ts`<br>`src/pages/DashboardExecutivoPage.tsx`<br>`src/pages/DashboardPage.tsx`<br>`src/pages/ProvisoesPage.tsx`<br>… +3 |
| `tipo` | `ferias_aprovada` | escreve | `src/hooks/useFeriasAprovacao.ts` |
| `tipo` | `ferias_proximas` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `ferias_rejeitada` | escreve | `src/hooks/useFeriasAprovacao.ts` |
| `tipo` | `ferias_vencendo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `fgts` | compara, escreve | `src/pages/ObrigacoesFiscaisPage.tsx` |
| `tipo` | `fim_contrato` | compara | `src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `fixo` | escreve | `src/components/workflows/WorkflowDesigner.tsx` |
| `tipo` | `folha` | compara | `supabase/functions/relatorio/index.ts` |
| `tipo` | `folha_resumo` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `forgotten_out` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `geral` | escreve | `src/components/colaborador-detalhes/AnotacoesTab.tsx` |
| `tipo` | `holerite_disponivel` | escreve | `supabase/functions/distribuir-holerites/index.ts` |
| `tipo` | `indicadores_dp` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `informativa` | compara, escreve | `src/constants/rubricas.ts`<br>`src/schemas/esocial/rubricaValidator.ts` |
| `tipo` | `informativo` | compara | `src/pages/RubricasPage.tsx` |
| `tipo` | `injustificada` | compara, escreve | `src/pages/FaltasPage.tsx` |
| `tipo` | `justa_causa` | compara, escreve | `src/components/desligamentos/TurnoverChart.tsx`<br>`src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/pages/CalculadoraRescisaoPage.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>… +1 |
| `tipo` | `justificada` | compara | `src/pages/FaltasPage.tsx` |
| `tipo` | `liquido_negativo` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `lista_colaboradores` | compara | `supabase/functions/enviar-relatorio/index.ts` |
| `tipo` | `ltcat` | escreve | `src/components/sst/GerarLtcatOsButton.tsx` |
| `tipo` | `media` | compara | `src/components/dashboard/analytics/widgets.tsx` |
| `tipo` | `mensal` | escreve, filtra | `src/components/folha/FolhaDashboard.tsx`<br>`src/hooks/useCalculoFolha.ts`<br>`src/pages/FolhaPagamentoPage.tsx`<br>`src/services/folha/calculoLoteService.ts` |
| `tipo` | `os` | compara, escreve | `src/components/sst/GerarLtcatOsButton.tsx`<br>`supabase/functions/gerar-ltcat-os/index.ts` |
| `tipo` | `padrao` | escreve | `src/pages/JornadasPage.tsx` |
| `tipo` | `pedido_demissao` | compara | `src/components/desligamentos/TurnoverChart.tsx`<br>`src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `periodo_aquisitivo` | compara, escreve, filtra | `src/hooks/useNotificacoes.ts` |
| `tipo` | `ponto` | compara, escreve | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/pages/DashboardExecutivoPage.tsx`<br>`src/pages/DashboardPage.tsx`<br>`supabase/functions/relatorio/index.ts` |
| `tipo` | `ponto_aprovado` | compara | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/NotificationsDialog.tsx` |
| `tipo` | `ponto_recusado` | compara | `src/components/dashboard/analytics/NotificationsDialog.tsx` |
| `tipo` | `premiacao_critica` | escreve | `src/services/premiacoesService.ts` |
| `tipo` | `provento` | compara, escreve | `src/components/folha/RelatorioContabilDialog.tsx`<br>`src/components/folha/RubricasDialog.tsx`<br>`src/constants/rubricas.ts`<br>`src/pages/RubricasPage.tsx`<br>`src/services/folha/calculoLoteService.ts`<br>… +3 |
| `tipo` | `push` | compara, escreve | `supabase/functions/notificacao/index.ts`<br>`supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `tipo` | `quase_acidente` | compara, escreve | `src/components/sst/SSTIncidentesTab.tsx`<br>`src/pages/SSTPage.tsx` |
| `tipo` | `reembolso` | escreve | `src/pages/DespesasPage.tsx` |
| `tipo` | `remoto` | compara | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `tipo` | `retorno_almoco` | compara, escreve | `src/components/ponto/PontoClockRegister.tsx`<br>`supabase/functions/processar-ponto-offline/index.ts` |
| `tipo` | `saida` | compara, escreve | `src/components/ponto/PontoClockRegister.tsx`<br>`src/pages/ControleAcessoPage.tsx`<br>`supabase/functions/processar-ponto/index.ts` |
| `tipo` | `saida_almoco` | escreve | `src/components/ponto/PontoClockRegister.tsx` |
| `tipo` | `saude` | escreve | `src/pages/PlanosSaudePage.tsx` |
| `tipo` | `selecao` | compara | `src/components/settings/CamposCustomizadosTab.tsx` |
| `tipo` | `sem_batida` | compara | `src/pages/AdminPontoDivergenciasPage.tsx` |
| `tipo` | `sem_colaborador` | compara | `src/pages/AdminPontoDivergenciasPage.tsx` |
| `tipo` | `sem_justa_causa` | compara, escreve | `src/calculators/rescisao.ts`<br>`src/components/desligamentos/NovoDesligamentoDialog.tsx`<br>`src/components/desligamentos/TurnoverChart.tsx`<br>`src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>… +1 |
| `tipo` | `short_break` | compara, escreve | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `tipo` | `sucesso` | escreve | `src/services/notificacoesService.ts` |
| `tipo` | `suspensao` | compara, escreve | `src/components/medidas-disciplinares/MedidasGravityScale.tsx`<br>`src/components/medidas-disciplinares/MedidasTable.tsx`<br>`src/pages/MedidasDisciplinaresPage.tsx`<br>`supabase/functions/gerar-medida-disciplinar-pdf/index.ts` |
| `tipo` | `telefone` | compara | `src/components/recrutamento/CandidatoTimeline.tsx`<br>`supabase/functions/pix-lote/index.ts` |
| `tipo` | `termino_contrato` | compara | `src/pages/CalculadoraRescisaoPage.tsx`<br>`src/utils/rescisaoCalc.ts`<br>`supabase/functions/calcular-rescisao/motor.ts` |
| `tipo` | `texto` | escreve | `src/components/settings/CamposCustomizadosTab.tsx` |
| `tipo` | `todos` | escreve | `src/pages/ObrigacoesFiscaisPage.tsx` |
| `tipo` | `transporte` | compara | `src/services/calculoBeneficiosService.ts` |
| `tipo` | `turnover` | compara, escreve | `supabase/functions/alertas-preditivos/index.ts` |
| `tipo` | `variacao_salarial` | escreve | `src/utils/folha/validadorFolha.ts` |
| `tipo` | `vida` | filtra | `src/services/calculoBeneficiosService.ts` |
| `tipo` | `whatsapp` | escreve | `src/services/contratacaoService.ts` |
| `status` | `ARQUIVADO` | compara | `src/pages/AdminRegimentoInternoPage.tsx` |
| `status` | `Ativo` | escreve | `supabase/functions/sincronizar-bitrix/index.ts` |
| `status` | `CHANNEL_ERROR` | compara | `src/hooks/useRealTimeSubscription.ts` |
| `status` | `CONCLUIDO` | compara, escreve, filtra | `src/pages/ProvisoesPage.tsx`<br>`supabase/functions/calcular-provisoes/index.ts` |
| `status` | `ERRO` | compara | `src/pages/ProvisoesPage.tsx` |
| `status` | `Estado` | escreve | `src/i18n/index.ts` |
| `status` | `PROCESSANDO` | compara, escreve | `src/pages/ProvisoesPage.tsx`<br>`supabase/functions/calcular-provisoes/index.ts` |
| `status` | `PUBLICADO` | compara, filtra | `src/components/portal/PortalRegimentoCard.tsx`<br>`src/pages/AdminRegimentoInternoPage.tsx` |
| `status` | `RASCUNHO` | compara, escreve | `src/pages/AdminRegimentoInternoPage.tsx` |
| `status` | `SUBSCRIBED` | compara | `src/hooks/useRealTimeSubscription.ts` |
| `status` | `Status` | escreve | `src/i18n/index.ts` |
| `status` | `aberta` | compara, escreve, filtra | `src/hooks/useCalculoFolha.ts`<br>`src/pages/RecrutamentoPage.tsx`<br>`src/services/folha/calculoLoteService.ts`<br>`src/services/folhaPagamentoService.ts`<br>`supabase/functions/fechar-folha/index.ts`<br>… +1 |
| `status` | `aberto` | compara, escreve | `src/components/ferias/GerenciamentoPeriodos.tsx`<br>`src/pages/ComunicacaoInternaPage.tsx`<br>`src/pages/SegurosVidaPage.tsx`<br>`src/services/cnabService.ts` |
| `status` | `accepted` | compara, escreve | `src/components/folha/FolhaESocialSync.tsx`<br>`supabase/functions/alertas-dp/deliveryStatus.ts`<br>`supabase/functions/enviar-relatorio/index.ts` |
| `status` | `active` | escreve | `supabase/functions/webhook/contract_test.ts` |
| `status` | `adquirido` | filtra | `src/hooks/useNotificacoes.ts` |
| `status` | `afastado` | compara, filtra | `supabase/functions/enviar-relatorio/index.ts`<br>`supabase/functions/metricas/index.ts` |
| `status` | `agendada` | compara | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `status` | `agendado` | compara | `src/pages/AdminAgendamentoExamesPage.tsx` |
| `status` | `aguardando_inss` | compara, escreve | `src/pages/AfastamentosPage.tsx`<br>`src/services/afastamentoService.ts` |
| `status` | `all` | compara | `src/hooks/ferias/useProgramacaoFerias.ts`<br>`src/pages/ColaboradoresPage.tsx`<br>`src/services/colaboradorService.ts`<br>`src/services/feriasService.ts` |
| `status` | `aprovada` | compara, escreve, filtra | `src/components/dashboard/MorningBriefing.tsx`<br>`src/components/ferias/CalendarioFerias.tsx`<br>`src/components/ferias/FeriasDashboard.tsx`<br>`src/components/portal/PortalOverviewTab.tsx`<br>`src/hooks/useNotificacoes.ts`<br>… +4 |
| `status` | `aprovado` | compara, escreve, filtra | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/components/descontos/AdiantamentosTable.tsx`<br>`src/components/ferias/FeriasAuditTimeline.tsx`<br>`src/components/ferias/FeriasWorkflowStepper.tsx`<br>… +13 |
| `status` | `aprovado_financeiro` | compara | `src/services/premiacoesService.ts` |
| `status` | `aprovado_gestor` | compara | `src/components/ferias/programacao/CardProgramacao.tsx`<br>`src/pages/FeriasProgramacaoPage.tsx` |
| `status` | `aprovado_parcial` | compara | `supabase/functions/pix-lote/index.ts` |
| `status` | `aprovado_rh` | compara | `src/components/ferias/programacao/CardProgramacao.tsx`<br>`src/pages/FeriasProgramacaoPage.tsx` |
| `status` | `arquivada` | escreve | `supabase/functions/gerar-ltcat-os/index.ts` |
| `status` | `arquivado` | compara, escreve | `src/pages/CanalContabilidadePage.tsx`<br>`supabase/functions/gerar-ltcat-os/index.ts`<br>`supabase/functions/gerar-pgr/index.ts` |
| `status` | `assinada` | compara, escreve | `src/pages/AdminEpisFichasPage.tsx` |
| `status` | `assinado` | compara, escreve | `src/components/contratos/ContratosVencendoPanel.tsx`<br>`src/components/portal/PortalDocumentosTab.tsx`<br>`src/hooks/useAssinaturas.ts`<br>`src/pages/ContratosGeradosPage.tsx` |
| `status` | `ativa` | compara, escreve, filtra | `src/pages/PesquisasClimaPage.tsx`<br>`supabase/functions/gerar-ltcat-os/index.ts` |
| `status` | `ativo` | compara, escreve, filtra | `src/components/dashboard/MorningBriefing.tsx`<br>`src/components/descontos/EmprestimosTable.tsx`<br>`src/components/descontos/FinancialSummaryCards.tsx`<br>`src/components/desligamentos/NovoDesligamentoDialog.tsx`<br>`src/components/folha/LancamentosDialog.tsx`<br>… +48 |
| `status` | `calculada` | compara, escreve | `src/services/folhaPagamentoService.ts`<br>`supabase/functions/calcular-folha/index.ts`<br>`supabase/functions/fechar-folha/index.ts` |
| `status` | `calculado` | compara, escreve | `src/pages/PremiacoesPage.tsx`<br>`src/services/rescisaoService.ts` |
| `status` | `cancelada` | compara, escreve | `src/components/ferias/CalendarioFerias.tsx`<br>`src/components/ferias/FeriasAuditTimeline.tsx`<br>`src/services/feriasService.ts` |
| `status` | `cancelado` | compara, filtra | `src/components/contratos/ContratosVencendoPanel.tsx`<br>`src/pages/DashboardPage.tsx`<br>`src/pages/PassivoTrabalhistaPage.tsx` |
| `status` | `completed` | compara, filtra | `supabase/functions/_shared/idempotency.ts` |
| `status` | `completo` | escreve | `src/services/backupService.ts` |
| `status` | `concluida` | compara, escreve | `src/components/ferias/CalendarioFerias.tsx`<br>`src/pages/LGPDPage.tsx`<br>`src/pages/PassivoTrabalhistaPage.tsx`<br>`src/pages/WorkflowsPage.tsx` |
| `status` | `concluido` | compara, escreve | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>`src/components/ferias/GerenciamentoPeriodos.tsx`<br>`src/components/sst/SSTIncidentesTab.tsx`<br>… +2 |
| `status` | `configurando` | escreve | `src/pages/IntegracoesPage.tsx` |
| `status` | `convertido` | compara | `src/pages/FeriasProgramacaoPage.tsx` |
| `status` | `descontada` | escreve | `src/pages/FaltasPage.tsx` |
| `status` | `desligado` | compara | `src/services/colaboradorService.ts`<br>`supabase/functions/metricas/index.ts` |
| `status` | `divergente` | escreve | `src/components/esocial/ESocialConciliacao.tsx` |
| `status` | `duplicado` | compara | `src/pages/ImportacaoPage.tsx` |
| `status` | `em_analise` | compara, escreve | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/pages/SegurosVidaPage.tsx` |
| `status` | `em_andamento` | compara, escreve | `src/components/admissoes/DetalhesAdmissaoDialog.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>`src/hooks/useAdmissaoWorkflow.ts`<br>`src/pages/WorkflowsPage.tsx`<br>`src/services/workflowService.ts` |
| `status` | `em_gozo` | compara | `src/components/ferias/CalendarioFerias.tsx`<br>`src/pages/FeriasPage.tsx` |
| `status` | `em_investigacao` | compara | `src/components/sst/SSTIncidentesTab.tsx` |
| `status` | `emitido_clinica` | compara | `src/pages/AdminAsoWorkflowPage.tsx` |
| `status` | `encerrada` | compara | `src/pages/PesquisasClimaPage.tsx` |
| `status` | `encerrado` | compara, escreve | `src/pages/AfastamentosPage.tsx`<br>`src/services/contratoService.ts` |
| `status` | `enfileirado` | compara, escreve | `supabase/functions/distribuir-holerites/index.ts` |
| `status` | `entregue` | compara | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `status` | `enviado` | compara, escreve, filtra | `src/components/admissao/AdmissaoChecklist.tsx`<br>`src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/esocial/ESocialTimeline.tsx`<br>`src/components/esocial/tabs.tsx`<br>`src/components/folha/DistribuirHoleritesButton.tsx`<br>… +13 |
| `status` | `erro` | compara, escreve | `src/components/dashboard/MorningBriefing.tsx`<br>`src/components/esocial/ESocialAuditDialog.tsx`<br>`src/components/esocial/ESocialTimeline.tsx`<br>`src/components/folha/FolhaESocialSync.tsx`<br>`src/pages/ESocialPage.tsx`<br>… +8 |
| `status` | `error` | compara, escreve | `src/components/folha/FolhaESocialSync.tsx`<br>`src/pages/ContratacaoPage.tsx`<br>`supabase/functions/external-db-bridge/index.ts` |
| `status` | `excellent` | escreve | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `status` | `excluido` | compara, escreve, filtra | `src/pages/PlanosSaudePage.tsx`<br>`src/services/calculoBeneficiosService.ts`<br>`src/services/tabelas/beneficiosService.ts` |
| `status` | `expirado` | compara | `src/hooks/useAssinaturas.ts` |
| `status` | `fail` | compara, escreve | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| `status` | `failed` | escreve | `supabase/functions/_shared/idempotency.ts`<br>`supabase/functions/_shared/outboundDelivery.ts`<br>`supabase/functions/webhook/index.ts`<br>`supabase/functions/whatsapp-send/index.ts` |
| `status` | `falha` | escreve | `supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `status` | `falhou` | compara | `src/components/folha/DistribuirHoleritesButton.tsx` |
| `status` | `fechada` | compara, escreve, filtra | `src/services/folha/calculoLoteService.ts`<br>`src/services/folhaPagamentoService.ts`<br>`supabase/functions/fechar-folha/index.ts`<br>`supabase/functions/reabrir-folha/index.ts` |
| `status` | `fechado` | escreve | `src/services/batidasPontoService.ts`<br>`src/services/tabelas/pontoService.ts` |
| `status` | `ferias` | compara | `supabase/functions/metricas/index.ts` |
| `status` | `finalizado` | compara, escreve | `src/components/desligamentos/DesligamentoDetailSheet.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>`src/services/cnabService.ts` |
| `status` | `fulfilled` | compara | `src/pages/AdminPontoDivergenciasPage.tsx`<br>`supabase/functions/_shared/ssrf-guard.ts`<br>`supabase/functions/healthcheck/index.ts`<br>`supabase/functions/metricas/index.ts`<br>`supabase/functions/metrics/index.ts` |
| `status` | `gerada` | escreve | `src/pages/ObrigacoesFiscaisPage.tsx`<br>`supabase/functions/dctfweb/index.ts`<br>`supabase/functions/fgts-digital/index.ts` |
| `status` | `gerado` | compara, escreve | `src/pages/ContratosGeradosPage.tsx`<br>`supabase/functions/cnab-remessa/index.ts`<br>`supabase/functions/gerar-aej/index.ts`<br>`supabase/functions/gerar-afd/index.ts`<br>`supabase/functions/gerar-contrato-pdf/index.ts` |
| `status` | `gozado` | compara | `src/components/ferias/programacao/NovaProgramacaoDialog.tsx` |
| `status` | `healthy` | compara, escreve | `src/components/settings/SystemHealthTab.tsx` |
| `status` | `homologado` | compara | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `status` | `idle` | escreve | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| `status` | `in_progress` | compara, escreve | `supabase/functions/_shared/idempotency.ts` |
| `status` | `inativo` | compara, escreve | `src/pages/IntegracoesPage.tsx`<br>`src/pages/SegurosVidaPage.tsx`<br>`src/services/tabelas/beneficiosService.ts` |
| `status` | `indisponivel` | compara, escreve | `supabase/functions/enviar-relatorio/deliveryStatus.ts`<br>`supabase/functions/enviar-relatorio/index.ts` |
| `status` | `inscrito` | escreve | `src/pages/TreinamentosPage.tsx` |
| `status` | `integrado_folha` | escreve | `src/services/despesaService.ts` |
| `status` | `no_recipients` | compara | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| `status` | `not_configured` | compara | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| `status` | `not_needed` | compara | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| `status` | `offline` | compara, escreve | `src/components/admin/HealthTrendCard.tsx`<br>`src/hooks/useSystemHealthHistory.ts` |
| `status` | `ok` | compara, escreve | `src/components/esocial/ESocialConciliacao.tsx`<br>`src/components/settings/SystemHealthTab.tsx`<br>`src/pages/AdminDiagnosticoMigracaoPage.tsx`<br>`supabase/functions/external-db-bridge/index.ts` |
| `status` | `online` | compara, escreve | `src/components/admin/HealthTrendCard.tsx`<br>`src/components/layout/Header.tsx`<br>`src/hooks/useSystemHealthHistory.ts`<br>`src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| `status` | `paga` | compara, escreve | `src/components/obrigacoes/GuiasTable.tsx`<br>`src/pages/ObrigacoesFiscaisPage.tsx`<br>`supabase/migrations/20260724002800_fix_guias_fgts_inss_missing_competencia.sql` |
| `status` | `pago` | compara, escreve | `src/components/descontos/AdiantamentosTable.tsx`<br>`src/components/desligamentos/DesligamentoDetailSheet.tsx`<br>`src/components/premiacoes/RewardsApprovalHub.tsx`<br>`src/services/despesaService.ts`<br>`src/services/rescisaoService.ts` |
| `status` | `pendente` | compara, escreve, filtra | `src/components/admissao/AdmissaoChecklist.tsx`<br>`src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/descontos/AdiantamentosTable.tsx`<br>`src/components/descontos/FinancialSummaryCards.tsx`<br>`src/components/desligamentos/DesligamentoKPIs.tsx`<br>… +34 |
| `status` | `pendente_aprovacao` | compara, escreve | `supabase/functions/pix-lote/index.ts` |
| `status` | `pending` | escreve | `src/components/folha/FolhaESocialSync.tsx` |
| `status` | `processado` | compara, escreve | `src/pages/ValesPage.tsx`<br>`src/services/calculoBeneficiosService.ts`<br>`supabase/functions/processar-agendamentos/index.ts`<br>`supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `status` | `processando` | compara, escreve, filtra | `src/pages/ESocialPage.tsx`<br>`src/services/cnabService.ts`<br>`supabase/functions/enviar-esocial/index.ts`<br>`supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `status` | `processed` | escreve | `supabase/functions/webhook/index.ts` |
| `status` | `processed_v1` | escreve | `supabase/functions/webhook/index.ts` |
| `status` | `processed_v2` | escreve | `supabase/functions/webhook/index.ts` |
| `status` | `prorrogado` | escreve | `src/pages/AfastamentosPage.tsx`<br>`src/services/afastamentoService.ts` |
| `status` | `rascunho` | compara, escreve | `src/components/premiacoes/CampaignWizard.tsx`<br>`src/hooks/usePontoMelhorado.ts`<br>`src/pages/PesquisasClimaPage.tsx`<br>`src/services/contratoTemplateService.ts` |
| `status` | `realizada` | compara | `src/components/recrutamento/CandidatoTimeline.tsx` |
| `status` | `realizado` | compara | `src/pages/AdminAgendamentoExamesPage.tsx` |
| `status` | `recebido_rh` | compara | `src/pages/AdminAsoWorkflowPage.tsx` |
| `status` | `received` | escreve | `supabase/functions/integracao/index.ts`<br>`supabase/functions/webhook/index.ts` |
| `status` | `recusada` | compara | `src/pages/AdminEpisFichasPage.tsx` |
| `status` | `recusado` | compara, escreve | `src/components/dashboard/AnalyticsSection.tsx`<br>`src/components/dashboard/analytics/PendenciasDetailDialog.tsx`<br>`src/components/ponto/PontoAdjustmentRequests.tsx`<br>`src/hooks/usePontoMelhorado.ts` |
| `status` | `registrada` | compara | `src/pages/FaltasPage.tsx` |
| `status` | `rejected` | compara | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| `status` | `rejeitada` | compara, escreve | `src/components/ferias/CalendarioFerias.tsx`<br>`src/components/ferias/FeriasActions.tsx`<br>`src/components/ferias/FeriasAuditTimeline.tsx`<br>`src/pages/FaltasPage.tsx`<br>`src/pages/WorkflowsPage.tsx`<br>… +2 |
| `status` | `rejeitado` | compara, escreve | `src/components/admissao/AdmissaoChecklist.tsx`<br>`src/components/descontos/AdiantamentosTable.tsx`<br>`src/components/ferias/FeriasWorkflowStepper.tsx`<br>`src/components/ponto/PontoAdjustmentRequests.tsx`<br>`src/components/premiacoes/RewardsApprovalHub.tsx`<br>… +1 |
| `status` | `resolvido` | compara | `src/pages/CanalContabilidadePage.tsx`<br>`src/services/canalContabilidadeService.ts` |
| `status` | `running` | compara, escreve | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| `status` | `sem_colaboradores` | escreve | `supabase/functions/alertas-preditivos/index.ts` |
| `status` | `sem_registro` | compara, escreve | `supabase/functions/processar-ponto/index.ts` |
| `status` | `sent` | compara, escreve | `src/components/folha/FolhaESocialSync.tsx`<br>`supabase/functions/_shared/outboundDelivery.ts`<br>`supabase/functions/distribuir-holerites/index.ts`<br>`supabase/functions/whatsapp-send/index.ts` |
| `status` | `simulado` | escreve | `supabase/functions/enviar-esocial/index.ts` |
| `status` | `skipped` | compara, escreve | `supabase/functions/processar-agendamentos/index.ts`<br>`supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `status` | `slow` | compara, escreve | `src/components/admin/HealthTrendCard.tsx`<br>`src/components/layout/Header.tsx`<br>`src/hooks/useSystemHealthHistory.ts`<br>`src/pages/AdminDiagnosticoMigracaoPage.tsx`<br>`supabase/functions/external-db-bridge/index.ts` |
| `status` | `success` | compara, escreve | `src/components/settings/LogsIntegracoesTab.tsx`<br>`src/pages/ContratacaoPage.tsx`<br>`supabase/functions/metricas/index.ts` |
| `status` | `sucesso` | compara, escreve | `src/components/relatorios/RelatoriosAgendadosTab.tsx`<br>`src/components/settings/LogsIntegracoesTab.tsx`<br>`supabase/functions/enviar-relatorio/deliveryStatus.ts`<br>`supabase/functions/gerar-guias/index.ts` |
| `status` | `sugerido_gestor` | compara, escreve | `src/components/ferias/programacao/CardProgramacao.tsx`<br>`src/hooks/ferias/useProgramacaoFerias.ts` |
| `status` | `todos` | compara | `src/pages/ContratosGeradosPage.tsx`<br>`supabase/functions/relatorio/index.ts` |
| `status` | `uploading` | compara, escreve | `src/pages/ContratacaoPage.tsx` |
| `status` | `validado` | compara, escreve | `src/components/admissao/AdmissaoChecklist.tsx`<br>`src/components/admissoes/DetalhesAdmissaoDialog.tsx`<br>`src/hooks/useContratacaoDigital.ts`<br>`src/pages/AdminAsoWorkflowPage.tsx`<br>`src/services/contratacaoService.ts` |
| `status` | `valido` | compara, escreve | `src/hooks/useImportacaoColaboradores.ts`<br>`src/pages/ImportacaoPage.tsx`<br>`src/utils/importacao/parser.ts` |
| `status` | `vencida` | compara | `src/components/ferias/FeriasRelatorioDialog.tsx`<br>`src/pages/FeriasPage.tsx` |
| `status` | `vencido` | compara | `src/components/colaborador-detalhes/AquisitivosTab.tsx`<br>`src/components/ferias/GerenciamentoPeriodos.tsx` |
| `status` | `verified` | compara | `src/components/AdminRoute.tsx`<br>`src/components/ProtectedRoute.tsx`<br>`src/components/settings/MFASetup.tsx` |
| `status` | `very_slow` | compara | `supabase/functions/external-db-bridge/index.ts` |
| … +45 linhas — lista completa em `context.json` | | | |

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
| TransitionEffect | fade \| slide \| zoom \| flip \| parallax \| none | `src/components/layout/PageTransition.tsx` |
| TransitionDirection | left \| right \| up \| down | `src/components/layout/PageTransition.tsx` |
| GuiaTabela | guias_fgts \| guias_inss | `src/components/obrigacoes/GuiasTable.tsx` |
| ReportScheduleFrequency | diario \| semanal \| mensal | `src/components/relatorios/reportScheduleContract.ts` |
| REPORT_SCHEDULE_TYPES | 'lista_colaboradores', 'folha_resumo', 'ferias_proximas', 'afastamentos_ativos', 'indicadores_dp', | `src/components/relatorios/reportScheduleContract.ts` |
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
| AppRole | admin \| gestor \| rh \| user | `src/contexts/AuthContext.tsx` |
| ErrorType | VALIDATION_ERROR \| AUTH_ERROR \| NETWORK_ERROR \| NOT_FOUND \| PERMISSION_DENIED \| SERVER_ERROR \| UNKNOWN_ERROR | `src/errors/types.ts` |
| ErrorSeverity | info \| warning \| error \| critical | `src/errors/types.ts` |
| SeveridadeContrato | vencido \| critico \| atencao \| ok | `src/hooks/useContratosVencendo.ts` |
| EmpresaModo | consolidado \| empresa_unica | `src/hooks/useEmpresas.ts` |
| AuditoriaEvento | CALCULO \| CONFERENCIA \| ESOCIAL \| AJUSTE | `src/hooks/useFolhaAuditoria.ts` |
| AuditoriaSeveridade | INFO \| AVISO \| ERRO \| CRITICO | `src/hooks/useFolhaAuditoria.ts` |
| Locale | pt-BR \| en-US \| es-ES | `src/hooks/useTranslation.ts` |
| SeveridadePagamento | ok \| atencao \| critico \| violacao_grave | `src/hooks/ferias/useAlertasPagamentoD2.ts` |
| ProgramacaoStatus | rascunho \| sugerido_gestor \| aprovado_gestor \| aprovado_rh \| convertido \| rejeitado \| cancelado | `src/hooks/ferias/useProgramacaoFerias.ts` |
| SituacaoReconciliacao | ok \| divergente \| pendente_envio | `src/hooks/ferias/useReconciliacaoFolha.ts` |
| Locale | pt-BR \| en-US \| es-ES | `src/i18n/index.ts` |
| CircuitState | CLOSED \| OPEN \| HALF_OPEN | `src/lib/circuitBreaker.ts` |
| ThreadStatus | aberto \| respondido \| resolvido \| arquivado | `src/services/canalContabilidadeService.ts` |
| ThreadCategoria | folha \| esocial \| admissao \| rescisao \| tributos \| ferias \| outro | `src/services/canalContabilidadeService.ts` |
| ThreadPrioridade | baixa \| normal \| alta \| urgente | `src/services/canalContabilidadeService.ts` |
| AutorTipo | rh \| contabilidade \| sistema | `src/services/canalContabilidadeService.ts` |
| TipoContrato | clt_indeterminado \| clt_experiencia \| clt_determinado \| estagio \| pj \| temporario \| intermitente \| jovem_aprendiz | `src/services/contratoTemplateService.ts` |
| DespesaStatus | rascunho \| pendente \| aprovado \| rejeitado \| integrado_folha \| pago \| cancelado | `src/services/despesaService.ts` |
| DespesaTipo | reembolso \| adiantamento \| despesa_viagem \| material \| alimentacao \| transporte \| outro | `src/services/despesaService.ts` |
| LogLevel | info \| warn \| error \| fatal | `src/services/loggerService.ts` |
| PiiAcao | select \| export \| print \| download | `src/services/piiAccessLogService.ts` |
| PcsAderencia | abaixo_mercado \| alinhado \| acima_mercado \| sem_referencia | `src/types/pcs.ts` |
| PcsSituacao | abaixo_faixa \| dentro_faixa \| acima_faixa | `src/types/pcs.ts` |
| PCS_STATUS | 'rascunho', 'em_avaliacao', 'ativo', 'arquivado' | `src/types/pcs.ts` |
| SignedFileType | application/pdf \| image/jpeg \| image/png \| application/x-pkcs12 | `src/utils/fileSignature.ts` |
| TEMPLATE_HEADERS | 'Nome Completo', 'CPF', 'Email', 'Telefone', 'Cargo', 'Departamento', 'Salário', 'Data Admissão', 'Data Nascimento', 'PIS', 'RG', | `src/utils/importacao/columnMap.ts` |
| TEMPLATE_SAMPLE_ROW | 'João Silva', '123.456.789-00', 'joao@email.com', '(11)99999-9999', 'Analista', 'TI', '5000', '01/03/2024', '15/06/1990', '123.45678.90-1', '12.345.678-9', | `src/utils/importacao/columnMap.ts` |
| IdempotencyReason | NEW \| REPLAY \| KEY_INVALID \| KEY_REUSE \| IN_PROGRESS \| INDETERMINATE \| PREVIOUS_FAILURE \| STORE_ERROR | `supabase/functions/_shared/idempotency.ts` |
| LogLevel | debug \| info \| warn \| error \| fatal | `supabase/functions/_shared/logger.ts` |
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
  { colaborador_id: z.string().uuid('Colaborador obrigatório'), data_acidente: z.string().min(1, 'Data obrigatória'), hora_acidente: z.string().optional(), tipo_acidente: z.enum(['tipico', 'trajeto', 'doenca_ocupacional']), tipo_cat: z.enum(['inicial', 'reabertura', 'comunicacao_obito']), cid_principal: z.string().min(3, 'CID obrigatório').max(10), parte_corpo_atingida: z.string().optional(), agente_causador: z.string().optional(), local_acidente: z.string().optional(), tipo_local: z.enum(['estabelecimento_empregador', 'via_publica', 'area_rural', 'outros']).optional(), situacao_geradora: z.string().optional(), minutos_trabalhados_antes: z.coerce.number().min(0).optional(), houve_afastamento: z.boolean().default(false), dias_afastamento_estimado: z.coerce.number().min(0).optional(), houve_ob …
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
| `det-cpf` | disabled=terminal \|\| !pii.canViewPii | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `det-nasc` | type=date, disabled=terminal | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `det-mae` | disabled=terminal | `src/components/admissoes/DetalhesAdmissaoDialog.tsx` |
| `data_prevista` | type=date | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `salario_proposto` | type=number, step=0.01, min=0 | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `email` | type=email | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `data_nascimento` | type=date | `src/components/admissoes/NovaAdmissaoDialog.tsx` |
| `file-upload` | accept=.pdf,.jpg,.jpeg,.png | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| `email` | type=email | `src/components/auth/LoginForm.tsx` |
| `password` | type=password | `src/components/auth/LoginForm.tsx` |
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
| `banco_codigo` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `convenio` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `agencia` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `conta` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `conta_digito` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `nome_empresa` | required | `src/pages/FinanceiroBancarioPage.tsx` |
| `totp` | pattern=[0-9 ]*, max | `src/pages/LoginPage.tsx` |
| `forgot-email` | type=email | `src/pages/LoginPage.tsx` |
| `email` | type=email | `src/pages/LoginPage.tsx` |
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
| `v_telemetry_last_hour` | `SELECT empresa_id, table_name, operation, severity, count(*) AS query_count, avg(duration_ms)::integer AS avg_ms, max(duration_ms)::integer AS max_ms, count(*) FILTER (WHERE severity IN ('error','fatal')) AS error_count FROM public.query_telemetry WHERE empresa_id IS NOT NULL AND created_at >= now() …` |
| `v_telemetry_slow_queries` | `SELECT id, empresa_id, created_at, user_id, table_name, operation, duration_ms, severity FROM public.query_telemetry WHERE empresa_id IS NOT NULL AND created_at >= now() - interval '1 hour' AND duration_ms > 5000 ORDER BY created_at DESC` |
| `v_login_anomalies_ip` | `SELECT ip_address, COUNT(*) AS total_attempts, COUNT(*) FILTER (WHERE success = false) AS failed_attempts, COUNT(*) FILTER (WHERE success = true) AS successful_attempts, ROUND( COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*), 0) * 100, 2 ) AS failure_rate_pct, MIN(created_at) AS f …` |
| `v_login_anomalies_email` | `SELECT email, COUNT(*) AS total_attempts, COUNT(*) FILTER (WHERE success = false) AS failed_attempts, COUNT(*) FILTER (WHERE success = true) AS successful_attempts, ROUND( COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*), 0) * 100, 2 ) AS failure_rate_pct, MIN(created_at) AS first_ …` |
| `v_login_anomalies` | `SELECT 'ip' AS anomaly_type, ip_address AS identifier, failed_attempts, successful_attempts, failure_rate_pct, first_attempt, last_attempt, NULLIF(failures_per_minute_proj, 'NaN') AS failures_per_minute, last_failure_reason, NULL::text AS last_ip, NULL::text AS ip_type FROM v_login_anomalies_ip UNIO …` |
| `v_dashboard_refresh_status` | `SELECT 'mv_headcount_daily' AS view_name, pg_class.relname AS table_name, n_live_tup::BIGINT AS row_count, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze, GREATEST(COALESCE(last_autovacuum, last_vacuum), COALESCE(last_autoanalyze, last_analyze)) AS last_refresh_hint FROM pg_stat_user_t …` |
| `v_passivo_summary` | `SELECT empresa_id, COUNT(*) AS total_colaboradores, SUM(total_passivo)::DECIMAL(15,2) AS total_passivo_empresa, SUM(provisao_ferias)::DECIMAL(15,2) AS total_ferias, SUM(provisao_13)::DECIMAL(15,2) AS total_13, SUM(provisao_mensal_fgts)::DECIMAL(15,2) AS total_fgts_mensal, SUM(provisao_multa_fgts)::D …` |
| `v_documentos_unificado` | `SELECT 'admissao'::TEXT as contexto, d.id, a.empresa_id, d.admissao_id as referencia_id, d.tipo, NULL::TEXT as titulo, d.url as arquivo_url, NULL::TEXT as conteudo_html, NULL::TEXT as status, d.created_at, NULL::TIMESTAMPTZ as updated_at FROM public.documentos_admissao d JOIN public.admissoes a ON a …` |
| `admin.v_pgbouncer_stats` | `SELECT datname as database, count(*) as total_connections, count(*) FILTER (WHERE state = 'active') as active_connections, count(*) FILTER (WHERE state = 'idle') as idle_connections, count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_tx_connections, count(*) FILTER (WHERE wait_event IS …` |
| `admin.v_slow_queries` | `SELECT now() - query_start as duration, usename as username, datname as database, state, left(query, 200) as query_preview, wait_event, pid FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > INTERVAL '5 seconds' ORDER BY duration DESC LIMIT 20` |
| `admin.v_long_running_queries` | `SELECT pid, usename, application_name, state, query, now() - query_start as duration, wait_event_type, wait_event FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > INTERVAL '1 minute' ORDER BY duration DESC` |
| `admin.v_open_transactions` | `SELECT pid, usename, now() - xact_start as transaction_duration, state, left(query, 100) as query_preview FROM pg_stat_activity WHERE xact_start IS NOT NULL AND state = 'idle in transaction' ORDER BY transaction_duration DESC` |
| `mv_kpi_turnover_absenteismo` | `WITH admissoes AS ( SELECT empresa_id, DATE_TRUNC('month', data_admissao) AS mes, COUNT(*) AS total_admissoes FROM colaboradores WHERE data_admissao >= CURRENT_DATE - INTERVAL '12 months' AND data_admissao < CURRENT_DATE + INTERVAL '1 day' GROUP BY 1, 2 ), desligamentos AS ( SELECT empresa_id, DATE_ …` |
| `mv_dashboard_headcount` | `SELECT empresa_id, DATE_TRUNC('month', CURRENT_DATE)::DATE AS mes, COUNT(*) AS total_colaboradores, COUNT(*) FILTER (WHERE status = 'ativo') AS ativos, COUNT(*) FILTER (WHERE status = 'ferias') AS em_ferias, COUNT(*) FILTER (WHERE status = 'afastado') AS afastados, COUNT(*) FILTER (WHERE status = 'd …` |
| `mv_passivo_trabalhista` | `WITH ultima_folha AS ( SELECT DISTINCT ON (empresa_id) empresa_id, competencia, total_liquido FROM folhas_pagamento WHERE status IN ('calculada', 'paga', 'fechada') ORDER BY empresa_id, competencia DESC ), ferias_vencidas AS ( SELECT c.empresa_id, COUNT(DISTINCT pa.colaborador_id) AS qtde_colabs_ven …` |
| `mv_esocial_status` | `SELECT empresa_id, competencia, tipo_evento, status, COUNT(*) AS quantidade, MIN(created_at) AS primeira_criacao, MAX(created_at) AS ultima_criacao, COUNT(*) FILTER (WHERE status = 'rejeitado') AS total_rejeitados, COUNT(*) FILTER (WHERE status = 'pendente' AND created_at < CURRENT_DATE - INTERVAL ' …` |
| `mv_absenteismo_mensal` | `WITH dias_uteis AS ( SELECT e.id AS empresa_id, DATE_TRUNC('month', CURRENT_DATE)::DATE AS mes, COUNT(*) AS dias_uteis_mes FROM empresas e CROSS JOIN generate_series( DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', '1 day' ) AS d(data) WH …` |
| `contas_bancarias_decrypted` | `SELECT id, colaborador_id, empresa_id, banco_nome, banco_codigo, public.decrypt_dados_bancarios_tenant(agencia_encrypted, empresa_id) AS agencia, public.decrypt_dados_bancarios_tenant(conta_encrypted, empresa_id) AS conta, public.decrypt_dados_bancarios_tenant(digito_encrypted, empresa_id) AS digito …` |
| `mv_telemetry_dashboard` | `SELECT empresa_id, date_trunc('hour', created_at) AS hour, table_name, operation, severity, count(*) AS query_count, avg(duration_ms) AS avg_ms, min(duration_ms) AS min_ms, max(duration_ms) AS max_ms, percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms, percentile_cont(0.75) WITHIN G …` |

### G.3 Funções de cálculo/decisão no código

- **signCalculation(data: unknown)** — `src/calculators/auditHelper.ts`
  ```
  const encoder = new TextEncoder(); const rawData = JSON.stringify(data); const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawData)); const hashArray = Array.from(new Uint8Array(hashBuffer)); return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
- **calcularFerias(salarioBase: number, diasFerias: number = 30, diasAbono: number = 0, dependentes: number = 0)** — `src/calculators/beneficios.ts`
  ```
  const valorDiario = salarioBase / 30; const valorFerias = valorDiario * diasFerias; const tercoConstitucional = valorFerias / 3; const valorAbono = valorDiario * diasAbono; const tercoAbono = valorAbono / 3; const bruto = valorFerias + tercoConstitucional + valorAbono + tercoAbono; // Férias têm tributação separada (exclusiva na fonte) const inss = calcularINSS(valorFerias + tercoConstitucional); const irrf = calcularIRRF(valorFerias + tercoConstitucional, dependentes); const liquido = Math.trun …
  ```
- **calcularHorasExtras(salarioBase: number, horasExtras50: number = 0, horasExtras100: number = 0, jornadaMensal: number = 220, diasUteis: numb)** — `src/calculators/beneficios.ts`
  ```
  const valorHora = jornadaMensal > 0 ? salarioBase / jornadaMensal : 0; const valor50 = Math.trunc(valorHora * 1.5 * horasExtras50 * 100) / 100; const valor100 = Math.trunc(valorHora * 2.0 * horasExtras100 * 100) / 100; const totalExtras = Math.trunc((valor50 + valor100) * 100) / 100; const dsr = calcularDSR(totalExtras, diasUteis, domingosEFeriados); return { valor50, valor100, total: totalExtras, dsr, totalComDsr: Math.trunc((totalExtras + dsr) * 100) / 100 };
  ```
- **calcularDSR(totalVariaveis: number, diasUteis: number, domingosEFeriados: number)** — `src/calculators/beneficios.ts`
  ```
  if (diasUteis <= 0) return 0; const valorDsr = (totalVariaveis / diasUteis) * domingosEFeriados; return Math.trunc(valorDsr * 100) / 100;
  ```
- **calcularAdicionalNoturno(salarioBase: number, horasNoturnas: number, jornadaMensal: number = 220, percentual: number = 20)** — `src/calculators/beneficios.ts`
  ```
  const valorHora = jornadaMensal > 0 ? salarioBase / jornadaMensal : 0; return Math.trunc(valorHora * (percentual / 100) * horasNoturnas * 100) / 100;
  ```
- **calcularPericulosidade(salarioBase: number)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(salarioBase * 0.30 * 100) / 100;
  ```
- **calcularInsalubridade(grau: GrauInsalubridade)** — `src/calculators/beneficios.ts`
  ```
  const percentuais = { minimo: 0.10, medio: 0.20, maximo: 0.40 }; return Math.trunc(SALARIO_MINIMO_2026 * percentuais[grau] * 100) / 100;
  ```
- **calcularDescontoVT(salarioBase: number, valorVTMensal: number)** — `src/calculators/beneficios.ts`
  ```
  const limiteDesconto = salarioBase * 0.06; return Math.trunc(Math.min(valorVTMensal, limiteDesconto) * 100) / 100;
  ```
- **calcularValeAlimentacao(valorMensal: number, salarioBase: number, usaPAT: boolean = true)** — `src/calculators/beneficios.ts`
  ```
  valor: number, desconto: number
  ```
- **calcularPlanoSaude(custoTotal: number, coparticipacao: number = 0, mensalidadeFixa: number = 0)** — `src/calculators/beneficios.ts`
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
- **calcularSalarioMaternidade(salarioBase: number, diasLicenca: number = 120)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc((salarioBase / 30) * diasLicenca * 100) / 100;
  ```
- **calcularAuxilioDoenca(mediaSalarial: number)** — `src/calculators/beneficios.ts`
  ```
  const beneficio = mediaSalarial * 0.91; return Math.trunc(Math.max(SALARIO_MINIMO_2026, beneficio) * 100) / 100;
  ```
- **calcularSobreaviso(salarioBase: number, horas: number, jornadaMensal: number = 220)** — `src/calculators/beneficios.ts`
  ```
  if (jornadaMensal <= 0 || horas <= 0) return 0; const valorHora = salarioBase / jornadaMensal; return Math.trunc(valorHora * (1 / 3) * horas * 100) / 100;
  ```
- **calcularProntidao(salarioBase: number, horas: number, jornadaMensal: number = 220)** — `src/calculators/beneficios.ts`
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
- **calcularDiarias(valorDiaria: number, dias: number, percentualDesconto: number = 0)** — `src/calculators/beneficios.ts`
  ```
  const total = Math.trunc(valorDiaria * dias * 100) / 100; const desconto = Math.trunc(total * (percentualDesconto / 100) * 100) / 100; return { total, desconto, liquido: Math.trunc((total - desconto) * 100) / 100 };
  ```
- **calcularQuilometragem(km: number, valorPorKm: number = 1.20)** — `src/calculators/beneficios.ts`
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
- **calcularAdicionalTransferencia(salarioBase: number, percentual: number = 25)** — `src/calculators/beneficios.ts`
  ```
  return Math.trunc(salarioBase * (percentual / 100) * 100) / 100;
  ```
- **calcularEmprestimoConsignado(salarioLiquido: number, parcela: number)** — `src/calculators/beneficios.ts`
  ```
  parcela: number, margemDisponivel: number
  ```
- **calcularINSS(salarioBruto: number, ano: number = 2026)** — `src/calculators/impostos.ts`
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
- **calcularSeguroDesemprego(ultimosSalarios: number[], mesesVinculo: number = 0)** — `src/calculators/rescisao.ts`
  ```
  if (!ultimosSalarios.length) return { valorParcela: SALARIO_MINIMO_2026, parcelas: 3 }; const media = ultimosSalarios.reduce((a, b) => a + b, 0) / ultimosSalarios.length; const sd = FAIXAS_SEGURO_DESEMPREGO_2026; let valorParcela: number; if (media <= sd.faixa1Limite) valorParcela = media * sd.faixa1Mult; else if (media <= sd.faixa2Limite) valorParcela = sd.faixa2Base + (media - sd.faixa1Limite) * sd.faixa2Mult; else valorParcela = sd.teto; valorParcela = Math.max(SALARIO_MINIMO_2026, Math.trunc …
  ```
- **calcularMultaFGTS(saldoFGTS: number, tipo: 'sem_justa_causa' | 'acordo_mutuo', fgtsRescisao = 0)** — `src/calculators/rescisao.ts`
  ```
  const percentual = tipo === 'sem_justa_causa' ? 0.4 : 0.2; return Math.trunc((saldoFGTS + fgtsRescisao) * percentual * 100) / 100;
  ```
- **calcularMulta477(salarioBase: number, empregadorCulpado: boolean = false)** — `src/calculators/rescisao.ts`
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
- **calcularEncargos(salarioBase: number, percentualRAT: number = 0.03, percentualTerceiros: number = 0.058)** — `src/calculators/rescisao.ts`
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
- **calcularHorasExtras(salarioBase: number, jornadaMensal: number = 220, horasExtras: number, percentual: number = 0.5)** — `src/calculators/trabalhista-base.ts`
  ```
  if (horasExtras <= 0 || jornadaMensal <= 0) return 0; const valorHora = salarioBase / jornadaMensal; const valorComAdicional = valorHora * (1 + percentual); return Math.trunc(valorComAdicional * horasExtras * 100) / 100;
  ```
- **calcularDSR(totalVariavel: number, diasUteis: number = 26, domingosFeriados: number = 4)** — `src/calculators/trabalhista-base.ts`
  ```
  if (totalVariavel <= 0 || diasUteis <= 0) return 0; return Math.trunc((totalVariavel / diasUteis) * domingosFeriados * 100) / 100;
  ```
- **calcular13Salario(salarioBase: number, mesesTrabalhados: number = 12, parcela: 1 | 2 = 2)** — `src/calculators/trabalhista-base.ts`
  ```
  const valorIntegral = (salarioBase / 12) * mesesTrabalhados; if (parcela === 1) { // 1ª Parcela é sempre 50% do valor de direito, sem descontos de INSS/IRRF return Math.trunc((valorIntegral / 2) * 100) / 100; } // 2ª Parcela é o valor integral (sobre o qual incidirão descontos no cálculo principal) return Math.trunc(valorIntegral * 100) / 100;
  ```
- **validateFile(file: File)** — `src/components/afastamentos/AfastamentoDocumentManager.tsx`
  ```
  // 1. Validação de Tamanho if (file.size > MAX_FILE_SIZE) { toast.error('O arquivo é muito grande. O limite é de 10MB.'); return false; } // 2. Validação de Tipo MIME if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Tipo de arquivo não suportado. Use PDF, JPG ou PNG.'); return false; } // 3. Verificação de integridade básica if (file.size === 0) { toast.error('O arquivo está vazio ou corrompido.'); return false; } // 4. Verificação Avançada de Metadados (Excellence 10/10) try { const isVal …
  ```
- **classifyScore(score: number)** — `src/components/avaliacao/NineBoxMatrix.tsx`
  ```
  if (score <= 1.5 || !score) return 1; if (score <= 3.5) return 2; return 3;
  ```
- **formatCurrency(v: number)** — `src/components/beneficios/BeneficiosDashboard.tsx`
  ```
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **formatCurrency(v: number | null)** — `src/components/colaborador-detalhes/BeneficiosTab.tsx`
  ```
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **formatCurrency(v: number)** — `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx`
  ```
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **formatCurrency(value: number)** — `src/components/dashboard/MetricCard.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0, }).format(value);
  ```
- **formatCurrency(val: number)** — `src/components/esocial/ESocialConciliacao.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
- **calculateMetrics(emp: number, sal: number, bonus: number, perf: number, ret: number)** — `src/components/premiacoes/RewardsSimulator.tsx`
  ```
  const totalBudget = emp * sal * (bonus / 100) * (perf / 100); const turnoverCost = sal * 3 * emp * 0.15; const savings = turnoverCost * (ret / 100); const roi = totalBudget > 0 ? savings / totalBudget : 0; return { totalBudget, savings, roi };
  ```
- **GerarLtcatOsButton()** — `src/components/sst/GerarLtcatOsButton.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [tipo, setTipo] = useState<'os' | 'ltcat'>('os'); const [form, setForm] = useState({ titulo: '', responsavel_nome: '', responsavel_registro: '', responsavel_tipo: 'engenheiro' as 'engenheiro' | 'medico', descricao: '', conclusao: '', }); const handleGerar = async () => { if (!empresaAtual?.id) { toast.error('Selecione uma empresa'); return; } if (!form.titulo || ! …
  ```
- **GerarPgrButton()** — `src/components/sst/GerarPgrButton.tsx`
  ```
  const { empresaAtual } = useEmpresas(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [responsavel, setResponsavel] = useState(''); const [registro, setRegistro] = useState(''); const { data: programas } = useQuery({ queryKey: ['sst-programas-pgr', empresaAtual?.id], enabled: !!empresaAtual?.id && open, queryFn: async () => { const { data, error } = await supabase .from('sst_programas') .select('id, versao, data_emissao, data_validade, status, hash_sha256, arquivo_u …
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
- **computeSessionFingerprint()** — `src/hooks/useSecurityMonitor.ts`
  ```
  const components = [ navigator.userAgent, navigator.language, `${screen.width}x${screen.height}x${screen.colorDepth}`, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.hardwareConcurrency?.toString() || '', ]; let hash = 0; const str = components.join('|'); for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0; } return hash.toString(36);
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
  if (!empresaAtual?.id) return; setGerandoServidor(true); try { const [mes, ano] = competencia.split('/'); await edgeFunctionsService.gerarGuias({ empresaId: empresaAtual.id, competencia: `${ano}-${mes}`, tipo: 'todos', }); qc.invalidateQueries({ queryKey: ['guias-fgts'] }); qc.invalidateQueries({ queryKey: ['guias-inss'] }); toast.success('Guias geradas automaticamente via servidor!'); } catch (err) { toast.error(safeErrorMessage(err, 'Erro ao gerar guias.')); } finally { setGerandoServidor(fals …
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
- **formatCurrency(val: number)** — `src/pages/PremiacoesPage.tsx`
  ```
  
  ```
- **formatCurrency(value: number)** — `src/pages/ProvisoesPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **gerarCertificadoPdf(cert: CertificadoComJoins, empresaNome?: string)** — `src/pages/TreinamentosPage.tsx`
  ```
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const cx = doc.internal.pageSize.getWidth() / 2; doc.setDrawColor(60); doc.setLineWidth(1.2); doc.rect(12, 12, doc.internal.pageSize.getWidth() - 24, doc.internal.pageSize.getHeight() - 24); doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.text('CERTIFICADO', cx, 45, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.text('Certificamos que', cx, 65, { align: 'center' }); doc.s …
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
  const fn = validadores[tipo]; if (!fn) { return { valid: false, errors: [{ campo: 'tpEvento', mensagem: `Validador não encontrado para ${tipo}. Verifique se este evento é suportado.`, regra: 'REGRA_TIPO_EVENTO' }], warnings: [] }; } return fn(dados);
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
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtDeslig, 'dtDeslig', errors); dataValida(dados.dtDeslig as string, 'dtDeslig', errors); if (dados.dtAdm !== undefined && dados.dtAdm !== null && dados.dtAdm !== '') { ordemCronologica( dados.dtAdm, dados.dtDeslig, 'dtDeslig', 'Data de desligamento não pode ser anterior à data de admissão', errors, ); } if (dados.mtvDeslig !== undefined && dados.mtvDeslig !== null && …
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
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; validarTrabalhador(dados, errors); required(dados.dtTerm, 'dtTerm', errors); dataValida(dados.dtTerm as string, 'dtTerm', errors); if (dados.dtInicio !== undefined && dados.dtInicio !== null && dados.dtInicio !== '') { ordemCronologica( dados.dtInicio, dados.dtTerm, 'dtTerm', 'Data de término não pode ser anterior à data de início', errors, ); } if (dados.mtvDesligTSV !== undefined && dados.mtvDesligTSV !== null && d …
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
- **competenciaValida(val: unknown, campo: string, errors: ValidationError[],)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  if (typeof val === 'string' && !COMPETENCIA_RE.test(val)) { errors.push({ campo, mensagem: `${campo} deve estar no formato AAAA-MM`, regra: 'REGRA_PERIODO', }); }
  ```
- **validarInscricao(dados: ESocialData, errors: ValidationError[], campoTp = 'tpInsc', campoNr = 'nrInsc',)** — `src/schemas/esocial/periodicosValidators.ts`
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
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); required(dados.nrInsc, 'nrInsc', errors); // indComerc conforme Tabela 13 — 1 não é código válido para este evento required(dados.indComerc, 'indComerc', errors); enumValido( String(dados.indComerc ?? ''), ['2', '3', '5', '6', '7', '8', '9'], 'indComerc', errors, ); required(dados.vrTotCom, 'vrTotCom', errors); if (dados. …
  ```
- **validarS1270(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); required(dados.nrInsc, 'nrInsc', errors); required(dados.codLotacao, 'codLotacao', errors); maxLen(String(dados.codLotacao ?? ''), 30, 'codLotacao', errors); return { valid: errors.length === 0, errors, warnings };
  ```
- **validarS1280(dados: ESocialData)** — `src/schemas/esocial/periodicosValidators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; required(dados.perApur, 'perApur', errors); competenciaValida(dados.perApur, 'perApur', errors); // indSubstPatr: 1=integral, 2=proporcional if (dados.indSubstPatr !== undefined && dados.indSubstPatr !== null && dados.indSubstPatr !== '') { enumValido(String(dados.indSubstPatr), ['1', '2'], 'indSubstPatr', errors); } if ( dados.percRedContrib !== undefined && dados.percRedContrib !== null && dados.percRedContrib !== …
  ```
- **validarRubricaESocial(rubrica: ESocialData)** — `src/schemas/esocial/rubricaValidator.ts`
  ```
  const errors: ValidationError[] = []; required(rubrica.codigo, 'codigo', errors); required(rubrica.descricao, 'descricao', errors); required(rubrica.tipo, 'tipo', errors); enumValido(rubrica.tipo as string, ['provento', 'desconto', 'informativa', 'informativo'], 'tipo', errors); // Validação contra rubricas padrão (se o código for um dos conhecidos) const padrao = RUBRICAS_PADRAO.find((r) => r.codigo === rubrica.codigo); if (padrao) { if (rubrica.tipo !== padrao.tipo) { errors.push({ campo: 'tip …
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
- **calcularCustoMensal(colaboradorId: string, diasUteis: number = 22)** — `src/services/calculoBeneficiosService.ts`
  ```
  const { data: colab, error: colabError } = await supabase .from('colaboradores') .select('salario_base') .eq('id', colaboradorId) .single(); if (colabError) throw colabError; const salario = colab?.salario_base || 0; const descontoMaximo = salario * 0.06; const { data: rotas, error: rotasError } = await ( fromBeneficiosColaborador().select('*, beneficio:beneficios(*)') as unknown as QBuilder<BeneficioColaboradorRow> ) .eq('colaborador_id', colaboradorId) .eq('status_vinculo', 'ativo'); if (rotas …
  ```
- **calcularCredito(beneficioId: string, diasTrabalhados: number = 22)** — `src/services/calculoBeneficiosService.ts`
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
- **calcIRRF(bruto: number, dependentes = 0, referencia: string)** — `supabase/functions/calcular-rescisao/motor.ts`
  ```
  if (!Number.isFinite(bruto) || bruto <= 0) return 0; const inss = calcularINSS(bruto, referencia); const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF; const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF; const base = Math.max(0, Math.min(baseLegal, baseSimplificada)); if (base <= 0) return 0; // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal for (const f of FAIXAS_IRRF) { if (base <= f.l) return Math.max(0, trunc2(base * f.a - f.d)); } return 0;
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
- **generateSignature(payload: string, secret: string)** — `supabase/functions/webhook/webhook_test.ts`
  ```
  const encoder = new TextEncoder(); const key = await crypto.subtle.importKey( "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"] ); const signature = await crypto.subtle.sign( "HMAC", key, encoder.encode(payload) ); return "sha256=" + Array.from(new Uint8Array(signature)) .map(b => b.toString(16).padStart(2, "0")) .join("");
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `const beneficio = mediaSalarial * 0.91;` | `src/calculators/beneficios.ts` |
| `const desconto = Math.trunc(Math.min(valorMensal * percentualMaximo, salarioBase * 0.20) * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const fgts = Math.trunc((brutoTotal - primeiraParcelaJaPaga) * 0.08 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const fgts = Math.trunc(bruto * 0.08 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `const limiteDesconto = salarioBase * 0.06;` | `src/calculators/beneficios.ts` |
| `const margemTotal = Math.trunc(salarioLiquido * 0.35 * 100) / 100;` | `src/calculators/beneficios.ts` |
| `return Math.trunc(salarioBase * 0.30 * 100) / 100;` | `src/calculators/beneficios.ts` |
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
| `transition={{ delay: i * 0.05 }}` | `src/components/admissoes/OnboardingDashboard.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/afastamentos/AfastamentoStats.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/avaliacao/PerformanceDashboard.tsx` |
| `O custo total de benefícios representa aproximadamente 12% da folha bruta total. Considere revisar o plano` | `src/components/beneficios/BeneficiosDashboard.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/beneficios/BeneficiosDashboard.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/colaboradores/ColaboradorHistory.tsx` |
| `transition={{ delay: 0.5 + i * 0.05 }}` | `src/components/dashboard/BarChartWidget.tsx` |
| `transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}` | `src/components/dashboard/BarChartWidget.tsx` |
| `const strokeOffset = -seg.offset + circumference * 0.25; // start from top` | `src/components/dashboard/DonutChart.tsx` |
| `transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}` | `src/components/dashboard/DonutChart.tsx` |
| `transition={{ delay: i * 0.08 }}` | `src/components/dashboard/EventTimeline.tsx` |
| `transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },` | `src/components/dashboard/MetricCard.tsx` |
| `transition={{ delay: 0.5 + i * 0.06 }}` | `src/components/dashboard/QuickActionsGrid.tsx` |
| `(turnoverScore * 0.30) + (absenteismoScore * 0.25) + (cadastroScore * 0.20) + (feriasScore * 0.15) - passivoPenalty` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `const absenteismoScore = Math.max(0, 100 - (absenteismo * 10)); // 0% = 100, 10% = 0` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `const arcLength = (compositeScore / 100) * circumference * 0.75; // 270 degree arc` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `const turnoverScore = Math.max(0, 100 - (turnover * 5)); // 0% = 100, 20% = 0` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `transition={{ delay: 0.8 + i * 0.1 }}` | `src/components/dashboard/WorkforceHealthScore.tsx` |
| `transition={{ duration: 0.2, delay: idx * 0.05 }}` | `src/components/dashboard/analytics/PendenciasDetailDialog.tsx` |
| `98% Aceitação` | `src/components/dashboard/analytics/widgets.tsx` |
| `if (value >= maxValue * 0.5) return 'from-primary-glow to-primary';` | `src/components/dashboard/analytics/widgets.tsx` |
| `if (value >= maxValue * 0.8) return 'from-destructive to-destructive/70';` | `src/components/dashboard/analytics/widgets.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/dashboard/analytics/widgets.tsx` |
| `transition={{ delay: index * 0.1 }}` | `src/components/dashboard/analytics/widgets.tsx` |
| `Colaboradores acima de 30% de desconto` | `src/components/descontos/FinancialSummaryCards.tsx` |
| `const margin = colaboradorData.salario_base * 0.3; // 30% Law` | `src/components/descontos/NewLoanDialog.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/desligamentos/DesligamentoChecklist.tsx` |
| `transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}` | `src/components/desligamentos/DesligamentoKPIs.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/epis/EpiCatalogoTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/epis/EpiCatalogoTable.tsx` |
| `transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: 'easeOut' }}` | `src/components/epis/EpiCategoryChart.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/epis/EpiEntregasTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/epis/EpiEntregasTable.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.3 }}` | `src/components/epis/EpiKPIs.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/components/esocial/ESocialAIInsights.tsx` |
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
| `Valores transmitidos coincidem 100% com o totalizador S-5003.` | `src/components/folha/FolhaESocialSync.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/components/folha/FolhaESocialSync.tsx` |
| `transition={{ delay: index * 0.08 }}` | `src/components/folha/FolhaPipeline.tsx` |
| `if (resumo.totalDescontos > resumo.totalProventos * 0.4) {` | `src/components/folha/FolhaValidationAlerts.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/folha/FolhaValidationAlerts.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/layout/MobileQuickActions.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/medidas-disciplinares/MedidaWorkflowTimeline.tsx` |
| `transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: 'easeOut' }}` | `src/components/medidas-disciplinares/MedidasGravityScale.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.3 }}` | `src/components/medidas-disciplinares/MedidasKPIs.tsx` |
| `transition={{ delay: i * 0.02 }}` | `src/components/medidas-disciplinares/MedidasTable.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/medidas-disciplinares/MedidasTable.tsx` |
| `transition={{ delay: i * 0.04 }}` | `src/components/medidas-disciplinares/MedidasTimeline.tsx` |
| `{ label: 'CSLL (Código 2372)', value: formatCurrency(totalInss * 0.09), color: 'text-primary', venc: 'Venc. último dia útil do mês' },` | `src/components/obrigacoes/DarfTab.tsx` |
| `{ label: 'IRRF (Código 0561)', value: formatCurrency(totalInss * 0.15), color: 'text-warning', venc: 'Venc. dia 20 do mês seguinte' },` | `src/components/obrigacoes/DarfTab.tsx` |
| `{ label: 'PIS/COFINS (Código 8109)', value: formatCurrency(totalFgts * 0.065 + totalInss * 0.03), color: 'text-info', venc: 'Venc. dia 25 do mês seguinte' },` | `src/components/obrigacoes/DarfTab.tsx` |
| `O P50 vem da pesquisa salarial mais recente de cada cargo da grade (aba Mercado). Tolerância de ±5%.` | `src/components/pcs/PcsGradesTab.tsx` |
| `podem gerar horas extras a 100%.` | `src/components/ponto/GestaoPontoAnalytics.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/ponto/PontoAuditTimeline.tsx` |
| `// 100% independente do resultado (achado da auditoria — "teatro").` | `src/components/ponto/PontoClockRegister.tsx` |
| `// até 60% — os 40% restantes refletem trabalho assíncrono REAL` | `src/components/ponto/PontoClockRegister.tsx` |
| `transition={{ duration: 1, delay: i * 0.05 }}` | `src/components/ponto/PontoClockRegister.tsx` |
| `if (dx <= w * 0.7 && dy <= h * 0.7) return z;` | `src/components/ponto/PontoGeoAnalytics.tsx` |
| `transition={{ delay: i * 0.05 }}` | `src/components/portal/PortalFinanceiroTab.tsx` |
| `transition={{ delay: 0.25 + i * 0.04 }}` | `src/components/portal/PortalOverviewTab.tsx` |
| `const turnoverCost = sal * 3 * emp * 0.15;` | `src/components/premiacoes/RewardsSimulator.tsx` |
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
| `transition={{ delay: index * 0.05 }}` | `src/components/ui/module-skeleton.tsx` |
| `transition={{ delay: index * 0.1 }}` | `src/components/ui/module-skeleton.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/components/ui/notification-center.tsx` |
| `function bezierPath(x1: number, y1: number, x2: number, y2: number, dx = Math.abs(x2 - x1) * 0.5): string {` | `src/components/workflows/WorkflowDesigner.tsx` |
| `* - MEI com empregado: CPP patronal 3% + FGTS 8%.` | `src/constants/regimes.ts` |
| `* são recolhidos fora do DAS. FGTS 8% segue obrigatório.` | `src/constants/regimes.ts` |
| `* EmpresaProvider now delegates 100% to useEmpresas (Zustand + React Query).` | `src/contexts/EmpresaContext.tsx` |
| `* já roteia 100% dos logins por lá, então a proteção não depende desta tela.` | `src/hooks/useBruteForceProtection.ts` |
| `return arr[Math.floor(arr.length * 0.95)];` | `src/hooks/useSystemHealthHistory.ts` |
| `transition={{ delay: i * 0.05 }}` | `src/pages/AdmissoesPage.tsx` |
| `transition={{ delay: 0.2 + i * 0.08 }}` | `src/pages/AssistenteIAPage.tsx` |
| `transition={{ delay: index * 0.01 }}` | `src/pages/AuditoriaPage.tsx` |
| `transition={{ delay: i * 0.08 }}` | `src/pages/BackupPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/BackupPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/ColaboradoresPage.tsx` |
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
| `(Math.abs(vf + tc - provF) > sal * 0.05 \|\| Math.abs(v13 - prov13) > sal * 0.05)` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `13º) e uma estimativa de 2% de reajustes ou novas admissões mensais.` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `Provisionamento registrado diverge &gt;5% do calculado — revise os valores da folha.` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `diff: Math.abs(vf + tc - provF) > sal * 0.05 ? Math.abs(vf + tc - provF) : Math.abs(v13 - prov13),` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `return { mes: format(d, 'MMM/yy', { locale: ptBR }), valor: tTotal * (1 + i * 0.015) };` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `tipo: Math.abs(vf + tc - provF) > sal * 0.05 ? 'Férias' : '13º',` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}` | `src/pages/PontoKioskPage.tsx` |
| `// 100% e o ponto era registrado independente de qualquer checagem).` | `src/pages/PontoPage.tsx` |
| `<span>45%</span>` | `src/pages/PremiacoesPage.tsx` |
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
| `const noturnoValor = round2(valorHora * variaveis.noturno * (60 / 52.5) * 0.2);` | `supabase/functions/calcular-folha/index.ts` |
| `// Encargos patronais consolidados. Achado K5 da auditoria: RAT estava em 2%` | `supabase/functions/calcular-provisoes/index.ts` |
| `// • Férias = (salário × 4/3) / 12 + encargos ~35.8%; 13º = salário / 12 + encargos` | `supabase/functions/calcular-provisoes/index.ts` |
| `const FGTS_BPS = 80n; // 8%` | `supabase/functions/calcular-provisoes/index.ts` |
| `const INSS_PATRONAL_BPS = 200n; // 20%` | `supabase/functions/calcular-provisoes/index.ts` |
| `const RAT_MEDIO_BPS = 30n; // 3% (src/calculators/tabelas.ts::ENCARGOS_PADRAO.rat)` | `supabase/functions/calcular-provisoes/index.ts` |
| `const TERCEIROS_BPS = 58n; // 5.8%` | `supabase/functions/calcular-provisoes/index.ts` |
| `// 5. Indenizações arts. 479/480 CLT — 50% dos dias restantes do contrato a prazo.` | `supabase/functions/calcular-rescisao/motor.ts` |
| `// A multa de 40% só existe em dispensa sem justa causa: o término no prazo` | `supabase/functions/calcular-rescisao/motor.ts` |
| `// Projeção do aviso INDENIZADO nos avos (OJ 82 SDI-I TST): 100% em` | `supabase/functions/calcular-rescisao/motor.ts` |
| `// sem_justa_causa, 50% no acordo (484-A) e na culpa recíproca (Súm. 14 TST).` | `supabase/functions/calcular-rescisao/motor.ts` |
| `const fgtsRescisao = trunc2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);` | `supabase/functions/calcular-rescisao/motor.ts` |
| `const valor = trunc2((salarioBase / 30) * diasRestantes * 0.5);` | `supabase/functions/calcular-rescisao/motor.ts` |
| `multaFGTS = trunc2((p.saldoFGTS + fgtsRescisao) * 0.20);` | `supabase/functions/calcular-rescisao/motor.ts` |
| `multaFGTS = trunc2((p.saldoFGTS + fgtsRescisao) * 0.40);` | `supabase/functions/calcular-rescisao/motor.ts` |
| `// reduz chamadas à brasilapi.com.br em ~95% no uso típico.` | `supabase/functions/consultarCNPJ/index.ts` |
| `// - Bloqueio margem consignável 35%` | `supabase/functions/emprestimo-consignado/index.ts` |
| `// - Prazo ≤ 84 meses, taxa 0-15%/mês` | `supabase/functions/emprestimo-consignado/index.ts` |
| `// Descontos de benefícios — regra do canônico: VT limitado a 6% do` | `supabase/functions/gerar-holerite/index.ts` |
| `const fgts = Number((salarioBase * 0.08).toFixed(2));` | `supabase/functions/gerar-holerite/index.ts` |
| `if (b.tipo?.codigo === 'VT') return Math.min(Number(b.valor ?? 0), salarioBase * 0.06);` | `supabase/functions/gerar-holerite/index.ts` |
| `* - bridge_error_rate > 1% por 1min` | `supabase/functions/metrics/index.ts` |
| `// Domingo/feriado/folga trabalhado: tudo é HE 100% (DSR); sem falta/atraso.` | `supabase/functions/processar-ponto/index.ts` |
| `// desconsiderada por inteiro; acima dela conta-se tudo), HE 100% em` | `supabase/functions/processar-ponto/index.ts` |
| `// folga de jornada ALHEIA não pode virar HE 100% de quem tem escala` | `supabase/functions/processar-ponto/index.ts` |
| `// virava 'falta' em vez de HE 100%.` | `supabase/functions/processar-ponto/index.ts` |
| `folga?: boolean; // grade marca o dia como não trabalhado → tudo é HE 100%` | `supabase/functions/processar-ponto/index.ts` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `CACHE_VERSION` | `'v3'` | `public/sw-custom.js` |
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
| `MAX_FILE_SIZE` | `10` | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| `SLA_ALERT_THRESHOLD` | `80` | `src/components/ferias/FeriasReconciliacaoHistoricoCard.tsx` |
| `TILE` | `256` | `src/components/ponto/PontoGeoAnalytics.tsx` |
| `BUCKET` | `'documentos'` | `src/components/portal/PortalDocumentosTab.tsx` |
| `PAGE` | `1000` | `src/components/sst/SSTIncidentesTab.tsx` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `"16rem"` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `"18rem"` | `src/components/ui/sidebar.tsx` |
| `TOAST_LIMIT` | `1` | `src/components/ui/use-toast.ts` |
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
| `INACTIVITY_LIMIT_MS` | `30` | `src/hooks/useSessionTimeout.ts` |
| `CHECK_INTERVAL_MS` | `60` | `src/hooks/useSessionTimeout.ts` |
| `TOAST_LIMIT` | `1` | `src/hooks/useToast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `src/hooks/useToast.ts` |
| `BUCKET` | `'ferias-coletivas-comunicados'` | `src/hooks/ferias/useGerarComunicadoColetivas.ts` |
| `DEFAULT_LOCALE` | `'pt-BR'` | `src/i18n/index.ts` |
| `RESULT` | `'lovable-preview-auth:result'` | `src/integrations/supabase/previewAuthStorage.ts` |
| `TIMEOUT` | `2000` | `src/integrations/supabase/previewAuthStorage.ts` |
| `RETRY_DELAY` | `250` | `src/integrations/supabase/previewAuthStorage.ts` |
| `MOTIVO_MIN` | `10` | `src/pages/CienciaMedidaPage.tsx` |
| `PAGE_SIZE` | `25` | `src/pages/ContratosGeradosPage.tsx` |
| `BUCKET` | `'documentos'` | `src/pages/DocumentosPage.tsx` |
| `DIAS_POR_ANO` | `30` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `TERCO` | `1` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `ALIQ_FGTS` | `0.08` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `MULTA_FGTS` | `0.4` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `ALIQ_INSS` | `0.2` | `src/pages/PassivoTrabalhistaPage.tsx` |
| `REQUEST_TIMEOUT_MS` | `30` | `src/services/assistenteIAService.ts` |
| `MAX_HISTORY` | `10` | `src/services/assistenteIAService.ts` |
| `MAX_RECORDS_PER_TABLE` | `10` | `src/services/backupService.ts` |
| `BUCKET` | `'contabilidade-anexos'` | `src/services/canalContabilidadeService.ts` |
| `MAX_LOGS_BUFFER` | `50` | `src/services/loggerService.ts` |
| `REDACTED` | `'[REDACTED]'` | `src/services/loggerService.ts` |
| `MAX_LOG_TEXT_LENGTH` | `2` | `src/services/loggerService.ts` |
| `MAX_ROWS` | `500` | `src/services/pcsService.ts` |
| `PERIODO_SEM_DATA` | `'sem-data'` | `src/services/premiacoesService.ts` |
| `PAGE` | `1000` | `src/services/premiacoesService.ts` |
| `LOCALE_BR` | `'pt-BR'` | `src/utils/format.ts` |
| `TZ_BR` | `'America/Sao_Paulo'` | `src/utils/format.ts` |
| `DEFAULT_FALLBACK` | `'—'` | `src/utils/format.ts` |
| `MIN_LENGTH` | `8` | `src/utils/passwordPolicy.ts` |
| `MAX_LENGTH` | `128` | `src/utils/passwordPolicy.ts` |
| `HOURS_PER_DAY` | `24` | `src/utils/pgInterval.ts` |
| `DAYS_PER_MONTH` | `30` | `src/utils/pgInterval.ts` |
| `MONTHS_PER_YEAR` | `12` | `src/utils/pgInterval.ts` |
| `MASK_CHAR` | `'•'` | `src/utils/piiMask.ts` |
| `DIA_MS` | `1000` | `src/utils/rescisaoCalc.ts` |
| `DEFAULT_TTL_MS` | `5` | `supabase/functions/_shared/cache.ts` |
| `DEFAULT_MAX_PAYLOAD_BYTES` | `256` | `supabase/functions/_shared/contract.ts` |
| `FINANCIAL_TOLERANCE` | `0.01` | `supabase/functions/_shared/folhaIntegrity.ts` |
| `IN_PROGRESS_TTL_MS` | `5` | `supabase/functions/_shared/idempotency.ts` |
| `IRRF_2026_ISENCAO_ATE` | `5000` | `supabase/functions/_shared/irrf.ts` |
| `IRRF_2026_REDUCAO_ATE` | `7350` | `supabase/functions/_shared/irrf.ts` |
| `IRRF_2026_REDUCAO_MAX` | `312.89` | `supabase/functions/_shared/irrf.ts` |
| `IRRF_2026_REDUCAO_A` | `978.62` | `supabase/functions/_shared/irrf.ts` |
| `IRRF_2026_REDUCAO_B` | `0.133145` | `supabase/functions/_shared/irrf.ts` |
| `DEDUCAO_DEPENDENTE_IRRF` | `189.59` | `supabase/functions/_shared/irrf.ts` |
| `MEM_LIMIT_FRACTION` | `0.5` | `supabase/functions/_shared/rateLimit.ts` |
| `MAX_REDIRECTS` | `5` | `supabase/functions/_shared/safe-fetch.ts` |
| `BUCKET` | `'documentos'` | `supabase/functions/admissao-publica/index.ts` |
| `MAX_FILE_BYTES` | `10` | `supabase/functions/admissao-publica/index.ts` |
| `ALERT_EMAIL_UNAVAILABLE_MESSAGE` | `"O provedor de e-mail não está disponível para os alertas."` | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| `MES_MS` | `1000` | `supabase/functions/alertas-dp/index.ts` |
| `MAX_JSON_BYTES` | `64` | `supabase/functions/auditoria/index.ts` |
| `IP_RATE_LIMIT` | `30` | `supabase/functions/auth-login/index.ts` |
| `IP_WINDOW_SEC` | `5` | `supabase/functions/auth-login/index.ts` |
| `BACKUP_PAGE_SIZE` | `1` | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| `BACKUP_TABLE_ROW_LIMIT` | `200` | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| `MAX_ENTRIES` | `5000` | `supabase/functions/cache/index.ts` |
| `MAX_VALUE_BYTES` | `256` | `supabase/functions/cache/index.ts` |
| `MAX_SALARIO_CENTS` | `100` | `supabase/functions/calcular-13-salario/index.ts` |
| `DEDUCAO_SIMPLIFICADA_IRRF` | `564.80` | `supabase/functions/calcular-ferias/index.ts` |
| `DEDUCAO_DEPENDENTE_IRRF` | `189.59` | `supabase/functions/calcular-ferias/index.ts` |
| `CHUNK_SIZE` | `500` | `supabase/functions/calcular-folha/index.ts` |
| `MAX_COLABORADORES` | `50` | `supabase/functions/calcular-folha/index.ts` |
| `PAYROLL_TYPE` | `'mensal'` | `supabase/functions/calcular-folha/index.ts` |
| `SALARIO_FAMILIA_TETO` | `1980.38` | `supabase/functions/calcular-folha/index.ts` |
| `SALARIO_FAMILIA_VALOR` | `67.54` | `supabase/functions/calcular-folha/index.ts` |
| `CHUNK` | `500` | `supabase/functions/calcular-provisoes/index.ts` |
| `MAX_COLABS` | `10` | `supabase/functions/calcular-provisoes/index.ts` |
| `INSS_PATRONAL_BPS` | `200` | `supabase/functions/calcular-provisoes/index.ts` |
| `RAT_MEDIO_BPS` | `30` | `supabase/functions/calcular-provisoes/index.ts` |
| `TERCEIROS_BPS` | `58` | `supabase/functions/calcular-provisoes/index.ts` |
| `FGTS_BPS` | `80` | `supabase/functions/calcular-provisoes/index.ts` |
| `DIA_MS` | `1000` | `supabase/functions/calcular-rescisao/motor.ts` |
| `DEDUCAO_SIMPLIFICADA_IRRF` | `564.80` | `supabase/functions/calcular-rescisao/motor.ts` |
| `DEDUCAO_DEPENDENTE_IRRF` | `189.59` | `supabase/functions/calcular-rescisao/motor.ts` |
| `SALARIO_MINIMO` | `1621.00` | `supabase/functions/calcular-rescisao/motor.ts` |
| `MAX_ITENS` | `10` | `supabase/functions/cnab-remessa/index.ts` |
| `MAX_TOTAL_CENTAVOS` | `5` | `supabase/functions/cnab-remessa/index.ts` |
| `CEP_CACHE_TTL_MS` | `24` | `supabase/functions/consultarCEP/index.ts` |
| `CNPJ_CACHE_TTL_MS` | `24` | `supabase/functions/consultarCNPJ/index.ts` |
| `MAX_PAYLOAD_BYTES` | `128` | `supabase/functions/criptografia/index.ts` |
| `MARGEM_CONSIGNAVEL_PCT` | `35` | `supabase/functions/emprestimo-consignado/index.ts` |
| `REPORT_DELIVERY_UNAVAILABLE_MESSAGE` | `"Serviço de entrega de relatórios indisponível."` | `supabase/functions/enviar-relatorio/deliveryStatus.ts` |
| `REPORT_DELIVERY_FAILED_MESSAGE` | `"O provedor de e-mail não confirmou o envio do relatório."` | `supabase/functions/enviar-relatorio/deliveryStatus.ts` |
| `BUCKET` | `"relatorios-privados"` | `supabase/functions/enviar-relatorio/index.ts` |
| `REPORT_MAX_ROWS` | `5000` | `supabase/functions/enviar-relatorio/index.ts` |
| `HARD_CAP` | `10` | `supabase/functions/exportacao/index.ts` |
| `MAX_PAYLOAD_BYTES` | `256` | `supabase/functions/external-db-bridge/index.ts` |
| `MAX_LIMIT` | `1000` | `supabase/functions/external-db-bridge/index.ts` |
| `TELEMETRY_MAX_BATCH` | `25` | `supabase/functions/external-db-bridge/index.ts` |
| `TELEMETRY_FLUSH_INTERVAL_MS` | `2000` | `supabase/functions/external-db-bridge/index.ts` |
| `TELEMETRY_BUFFER_CAP` | `500` | `supabase/functions/external-db-bridge/index.ts` |
| `MAX_FILTER_VALUE_BYTES` | `8` | `supabase/functions/external-db-bridge/request-schema.ts` |
| `CRLF` | `"\r\n"` | `supabase/functions/gerar-aej/index.ts` |
| `LOTE_BATIDAS` | `1000` | `supabase/functions/gerar-aej/index.ts` |
| `CRLF` | `"\r\n"` | `supabase/functions/gerar-afd/index.ts` |
| `LOTE_BATIDAS` | `1000` | `supabase/functions/gerar-afd/index.ts` |
| `CHUNK` | `500` | `supabase/functions/gerar-guias/index.ts` |
| `MAX_COLABS` | `50` | `supabase/functions/gerar-guias/index.ts` |
| `MAX_GUIA_CENTS` | `10` | `supabase/functions/gerar-guias/index.ts` |
| `MAX_ROWS` | `5000` | `supabase/functions/importacao/index.ts` |
| `MAX_CELL_BYTES` | `8` | `supabase/functions/importacao/index.ts` |
| `MAX_COLUMNS` | `100` | `supabase/functions/importacao/index.ts` |
| `BATCH` | `50` | `supabase/functions/importacao/index.ts` |
| `METRICS_VERSION` | `'1.0.0'` | `supabase/functions/metrics/index.ts` |
| `MAX_ITENS` | `5` | `supabase/functions/pix-lote/index.ts` |
| `MAX_VALOR_LOTE_CENTAVOS` | `500` | `supabase/functions/pix-lote/index.ts` |
| `MAX_TENTATIVAS` | `5` | `supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `RETRY_DELAY_MS` | `5` | `supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `CLAIM_STALE_MS` | `10` | `supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `BATCH` | `50` | `supabase/functions/processar-agendamentos/filaNotificacoes.ts` |
| `CONCURRENCY` | `5` | `supabase/functions/processar-agendamentos/index.ts` |
| `BUSINESS_TIME_ZONE` | `"America/Sao_Paulo"` | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `DUE_WINDOW_MS` | `30` | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `MAX_CATCH_UP_DELAY_MS` | `24` | `supabase/functions/processar-agendamentos/scheduleContract.ts` |
| `MINUTO` | `1` | `supabase/functions/processar-ponto/index.ts` |
| `NOITE_INI` | `22` | `supabase/functions/processar-ponto/index.ts` |
| `NOITE_FIM` | `5` | `supabase/functions/processar-ponto/index.ts` |
| `MOTIVO_AUTO` | `'Horas extras processadas automaticamente'` | `supabase/functions/processar-ponto/index.ts` |
| `AUDIT_WINDOW_DAYS` | `90` | `supabase/functions/reabrir-folha/index.ts` |
| `MAX_ROWS` | `10` | `supabase/functions/relatorio/index.ts` |
| `MAX_WINDOW_DAYS` | `366` | `supabase/functions/relatorio/index.ts` |
| `CACHE_TTL_MS` | `5` | `supabase/functions/tabelas-dominio/index.ts` |
| `MAX_PAYLOAD_BYTES` | `1` | `supabase/functions/webhook/index.ts` |
| `REPLAY_TTL_SECONDS` | `300` | `supabase/functions/webhook/index.ts` |
| `IP_RATE_LIMIT` | `60` | `supabase/functions/webhook/index.ts` |
| `IP_RATE_WINDOW_SEC` | `60` | `supabase/functions/webhook/index.ts` |

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
| `setTimeout(() => setCopiedId(null), 2000);` | `src/components/afastamentos/AfastamentoTable.tsx` |
| `const em7Dias = format(new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');` | `src/components/dashboard/MorningBriefing.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/dashboard/MorningBriefing.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/dashboard/analytics/widgets.tsx` |
| `const isProximo = vencimento && !isVencido && isBefore(vencimento, addMonths(new Date(), 1));` | `src/components/epis/EpiEntregasTable.tsx` |
| `setTimeout(() => { setIsRefreshing(false); toast.success("Conciliação S-5001/S-5002 atualizada com sucesso!"); }, 1500);` | `src/components/esocial/ESocialConciliacao.tsx` |
| `return !isBefore(val, now) && isBefore(val, addMonths(now, 1));` | `src/components/exames/ExameKPIs.tsx` |
| `const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));` | `src/components/ferias/CalendarioFerias.tsx` |
| `const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));` | `src/components/ferias/CalendarioFerias.tsx` |
| `start: subMonths(new Date(), 5),` | `src/components/ferias/FeriasDashboard.tsx` |
| `const sixMonthsAgo = subMonths(now, 6);` | `src/components/ferias/FeriasRelatorioDialog.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/folha/FolhaDashboard.tsx` |
| `await new Promise((resolve) => setTimeout(resolve, 3000));` | `src/components/folha/PagamentoBancarioWizard.tsx` |
| `window.setTimeout(() => setCopiado(false), 2000);` | `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx` |
| `const timer = setTimeout(() => setActive(true), 2000);` | `src/components/onboarding/GuidedTour.tsx` |
| `setTimeout(() => { close(); }, 2000);` | `src/components/onboarding/GuidedTour.tsx` |
| `const diffHours = (inTime.getTime() - outTime.getTime()) / (1000 * 60 * 60);` | `src/components/ponto/GestaoPontoAnalytics.tsx` |
| `setTimeout(() => setShowConfetti(false), 5000);` | `src/components/ponto/PontoClockRegister.tsx` |
| `const diffHoras = (agora.getTime() - dataBatida.getTime()) / (1000 * 60 * 60);` | `src/components/ponto/PontoInconsistencyPanel.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/seguranca/PolicyAuditPanel.tsx` |
| `return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4));` | `src/components/sst/SSTEPIsTab.tsx` |
| `const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);` | `src/components/sst/SSTExamesTab.tsx` |
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
| `const diffHours = (now - created.getTime()) / (1000 * 60 * 60);` | `src/pages/WorkflowsPage.tsx` |
| `const horasDecorridas = Math.round((now - new Date(e.created_at).getTime()) / (1000 * 60 * 60));` | `src/pages/WorkflowsPage.tsx` |
| `gcTime: 30 * 60 * 1000,` | `src/providers/QueryProvider.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/providers/QueryProvider.tsx` |
| `const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;` | `src/services/afastamentoService.ts` |
| `const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();` | `src/services/cnabService.ts` |
| `flushTimeout = setTimeout(() => { void this.flush(); }, 10000);` | `src/services/loggerService.ts` |
| `async obterSignedUrl(path: string, expiresIn = 3600): Promise<string> {` | `src/services/medidasDisciplinaresService.ts` |
| `async signedUrlAnexoContestacao(path: string, expiresIn = 3600): Promise<string> {` | `src/services/medidasDisciplinaresService.ts` |
| `const deadlineMs = new Date(started).getTime() + slaHoras * 60 * 60 * 1000;` | `src/services/workflowService.ts` |
| `const hoursRemaining = (deadlineMs - nowMs) / (60 * 60 * 1000);` | `src/services/workflowService.ts` |
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
| `WHERE scan_at < now() - interval '180 days';` | `supabase/migrations/20261024000000_qa_r4_fixes.sql` |
| `v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;` | `supabase/rebaseline/20260902_secdef_authz_remediation.sql` |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
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
| 100 | `src/services/pcsService.ts` |
| 1 | `src/services/premiacoesService.ts` |
| 100 | `src/services/securityService.ts` |
| 500 | `src/services/securityService.ts` |
| 50 | `src/services/webhookService.ts` |
| 1 | `src/services/workflowService.ts` |
| 1 | `src/services/tabelas/adminService.ts` |
| 100 | `src/services/tabelas/adminService.ts` |
| 50 | `src/services/tabelas/adminService.ts` |
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
| E2E_NON_ADMIN_PASSWORD não definido — configure o secret (senha não fica no repo). | `e2e/auth-non-admin.setup.ts` |
| Desafio TOTP não completou — a página não saiu de /login. | `e2e/auth.setup.ts` |
| E2E_TOTP_SECRET não é base32 válido | `e2e/auth.setup.ts` |
| E2E_USER_PASSWORD não definido — configure o secret (senha não fica no repo). | `e2e/auth.setup.ts` |
| Login caiu no desafio TOTP mas E2E_TOTP_SECRET não está configurado. | `e2e/auth.setup.ts` |
| Login não saiu de /login e o desafio TOTP não apareceu. | `e2e/auth.setup.ts` |
| MFA verify do E2E falhou: ${JSON.stringify(verified)} | `e2e/auth.setup.ts` |
| Payload too large | `public/sw-custom.js` |
| Não foi possível localizar ${name} | `scripts/audit-bridge-frontend-contract.mjs` |
| A migração não pode conter metacomandos exclusivos do psql. | `scripts/build-rebaseline.mjs` |
| A migração não pode recriar o schema public gerenciado. | `scripts/build-rebaseline.mjs` |
| A migração squash não pode conter dados de Auth ou negócio. | `scripts/build-rebaseline.mjs` |
| package.json não encontrado! | `scripts/check-dependencies.js` |
| ${email} já existe no projeto — usar conta dedicada de teste ou E2E_ALLOW_EXISTING_ACCOUNT=1 para sobrescrever senha/roles | `scripts/provision-e2e-users.mjs` |
| GitHub API ${res.status}: ${url} | `scripts/report-workflows.mjs` |
| SUPABASE_DB_URL ausente | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL deve apontar para o database postgres | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL deve exigir TLS com sslmode=require, verify-ca ou verify-full | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL deve usar postgresql:// | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não contém senha | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não pertence ao projeto canônico | `scripts/validate-canonical-db-url.mjs` |
| SUPABASE_DB_URL não é uma URI válida | `scripts/validate-canonical-db-url.mjs` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| Argumento inválido: ${key ??  | `scripts/db/classify-migration-drift.mjs` |
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
| cron.job filtrado pelo RLS do pg_cron para este papel (sem BYPASSRLS): lista de jobs não verificável | `scripts/supabase_snapshot/snapshot.py` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema storage | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| );   banner.style.cssText =      | `src/main.tsx` |
| [BOOT] Variáveis Supabase ausentes — inicialização abortada. | `src/main.tsx` |
| Bridge instável | `src/components/admin/HealthTrendCard.tsx` |
| Empresa ativa não carregada. | `src/components/admissoes/AdmissoesKanban.tsx` |
| Erro de Segurança | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Erro no Upload | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Não foi possível excluir o documento agora. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| O arquivo está vazio ou corrompido. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| O arquivo é muito grande. O limite é de 10MB. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Tipo de arquivo não suportado. Use PDF, JPG ou PNG. | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
|  className= | `src/components/avaliacao/PerformanceAuditTimeline.tsx` |
| Data do exame é obrigatória | `src/components/colaborador-detalhes/ASOTab.tsx` |
| Erro ao registrar ASO | `src/components/colaborador-detalhes/ASOTab.tsx` |
| Tipo é obrigatório | `src/components/colaborador-detalhes/ASOTab.tsx` |
| Erro ao adicionar anotação | `src/components/colaborador-detalhes/AnotacoesTab.tsx` |
| Título é obrigatório | `src/components/colaborador-detalhes/AnotacoesTab.tsx` |
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
| Erro ao adicionar contato | `src/components/colaborador-detalhes/EmergenciaTab.tsx` |
| Informe pelo menos um telefone | `src/components/colaborador-detalhes/EmergenciaTab.tsx` |
| Nome é obrigatório | `src/components/colaborador-detalhes/EmergenciaTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/EstagiarioTab.tsx` |
| Instituição de ensino é obrigatória | `src/components/colaborador-detalhes/EstagiarioTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/EstrangeiroTab.tsx` |
| País de origem é obrigatório | `src/components/colaborador-detalhes/EstrangeiroTab.tsx` |
| Data de início é obrigatória | `src/components/colaborador-detalhes/ExperienciaTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/ExperienciaTab.tsx` |
| Erro ao adicionar formação | `src/components/colaborador-detalhes/FormacaoTab.tsx` |
| Escolaridade é obrigatória | `src/components/colaborador-detalhes/FormacaoTab.tsx` |
| Data e motivo são obrigatórios | `src/components/colaborador-detalhes/HistoricoContratosTab.tsx` |
| Data de vigência é obrigatória | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Erro ao registrar alteração | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Motivo é obrigatório | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Salário deve ser maior que zero | `src/components/colaborador-detalhes/HistoricoSalarialTab.tsx` |
| Erro ao salvar | `src/components/colaborador-detalhes/PCDTab.tsx` |
| Tipo de deficiência é obrigatório | `src/components/colaborador-detalhes/PCDTab.tsx` |
|  className= | `src/components/dashboard/EventTimeline.tsx` |
| O provedor não confirmou a entrega dos alertas. | `src/components/dashboard/MorningBriefing.tsx` |
| Selecione uma empresa antes de disparar alertas. | `src/components/dashboard/MorningBriefing.tsx` |
| Selecione uma empresa para carregar o briefing. | `src/components/dashboard/MorningBriefing.tsx` |
| Informe o nome do departamento | `src/components/departamentos/NovoDepartamentoDialog.tsx` |
| Salário base e data de desligamento são obrigatórios para o cálculo | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| Selecione o colaborador e a data de desligamento | `src/components/desligamentos/NovoDesligamentoDialog.tsx` |
| Informe o nome do sindicato | `src/components/ferias/FeriasColetivasTab.tsx` |
| Não foi possível baixar: ${e instanceof Error ? e.message : String(e)} | `src/components/ferias/FeriasColetivasTab.tsx` |
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
| Erro ao salvar configuração | `src/components/integracoes/ConfigPanels.tsx` |
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
| Nenhum dado para exportar | `src/components/ponto/GestaoRegistrosPonto.tsx` |
| Arquivo excede 10MB | `src/components/ponto/ImportarAFDTDialog.tsx` |
| Empresa não selecionada | `src/components/ponto/ImportarAFDTDialog.tsx` |
| Selecione um arquivo .txt | `src/components/ponto/ImportarAFDTDialog.tsx` |
| Acesso à câmera é obrigatório para biometria. | `src/components/ponto/PontoClockRegister.tsx` |
| Colaborador ou empresa não identificados localmente | `src/components/ponto/PontoClockRegister.tsx` |
| Colaborador ou empresa não identificados para o upload biométrico | `src/components/ponto/PontoClockRegister.tsx` |
| Ponto registrado em modo OFFLINE. Será sincronizado quando a conexão voltar. | `src/components/ponto/PontoClockRegister.tsx` |
| Empresa não identificada | `src/components/portal/PortalDocumentosTab.tsx` |
| Erro ao baixar arquivo | `src/components/portal/PortalDocumentosTab.tsx` |
| Selecione um arquivo e tipo | `src/components/portal/PortalDocumentosTab.tsx` |
| Erro ao atualizar dados | `src/components/portal/PortalMeusDadosTab.tsx` |
| Você precisa confirmar a leitura antes de assinar. | `src/components/portal/PortalRegimentoCard.tsx` |
| Empresa não identificada. | `src/components/premiacoes/CampaignWizard.tsx` |
| Erro ao criar campanha. | `src/components/premiacoes/CampaignWizard.tsx` |
| Erro ao processar ação. | `src/components/premiacoes/RewardsApprovalHub.tsx` |
| Erro na conciliação. | `src/components/premiacoes/RewardsApprovalHub.tsx` |
| Erro ao excluir snapshots | `src/components/premiacoes/RewardsSimulator.tsx` |
| empresa_id é obrigatório | `src/components/relatorios/reportScheduleContract.ts` |
| Nome do plano é obrigatório. | `src/components/settings/BeneficiosSettingsTab.tsx` |
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
| Nenhuma empresa selecionada | `src/components/settings/InlineTabs.tsx` |
| O provedor não confirmou a entrega dos alertas. | `src/components/settings/SystemHealthTab.tsx` |
| Selecione uma empresa antes de disparar alertas. | `src/components/settings/SystemHealthTab.tsx` |
| Selecione uma empresa antes de gerar o backup. | `src/components/settings/SystemHealthTab.tsx` |
| Preencha título e responsável técnico | `src/components/sst/GerarLtcatOsButton.tsx` |
| Selecione uma empresa | `src/components/sst/GerarLtcatOsButton.tsx` |
| Empresa não selecionada | `src/components/sst/GerarPgrButton.tsx` |
| Falha ao gerar link | `src/components/sst/GerarPgrButton.tsx` |
| Informe o responsável técnico | `src/components/sst/GerarPgrButton.tsx` |
| Erro ao vincular | `src/components/treinamentos/TrilhaCursosSection.tsx` |
| className={cn(alertVariants({variant}),className)}{...props}/>));Alert.displayName= | `src/components/ui/alert.tsx` |
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
| VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias | `src/contexts/AuthContext.tsx` |
| useAuth must be used within AuthProvider | `src/contexts/AuthContext.tsx` |
| useEmpresa must be used within EmpresaProvider | `src/contexts/EmpresaContext.tsx` |
| useNotification must be used within NotificationProvider | `src/contexts/NotificationContext.tsx` |
| Empresa ativa não carregada. | `src/hooks/useAfastamentos.ts` |
| Empresa não selecionada | `src/hooks/useAssinarAvisoFerias.ts` |
| Férias sem ID | `src/hooks/useAssinarAvisoFerias.ts` |
| Erro ao calcular 13º: ${safeErrorMessage(err,  | `src/hooks/useCalcular13Salario.ts` |
| Lote concluído parcialmente: ${results.length - simulatedCount} transmitido(s) e ${simulatedCount} simulado(s) | `src/hooks/useESocial.ts` |
| Apenas administradores podem associar usuários a empresas. | `src/hooks/useEmpresas.ts` |
| Apenas administradores podem atualizar empresas. | `src/hooks/useEmpresas.ts` |
| Apenas administradores podem criar empresas. | `src/hooks/useEmpresas.ts` |
| Nenhum registro de ${entity} foi retornado pela operação. | `src/hooks/useEmpresas.ts` |
| Erro ao gerar Excel: ${safeErrorMessage(e,  | `src/hooks/useExcelExport.ts` |
| empresa_id obrigatório para atualizar ferias (isolamento de tenant) | `src/hooks/useFerias.ts` |
| empresa_id obrigatório para excluir ferias (isolamento de tenant) | `src/hooks/useFerias.ts` |
| Solicitação de férias rejeitada | `src/hooks/useFeriasAprovacao.ts` |
| empresaId obrigatório para atualizar (isolamento de tenant). | `src/hooks/useGenericCrud.ts` |
| empresaId obrigatório para excluir (isolamento de tenant). | `src/hooks/useGenericCrud.ts` |
| Erro ao remover dados locais. | `src/hooks/useLocalStorage.ts` |
| Erro ao salvar dados localmente. Verifique o armazenamento do navegador. | `src/hooks/useLocalStorage.ts` |
| Empresa não selecionada. | `src/hooks/useNotificacoes.ts` |
| Sessão expirada. Faça login novamente. | `src/hooks/useNotificacoes.ts` |
| Erro ao gerar PDF: ${safeErrorMessage(e,  | `src/hooks/usePDFExport.ts` |
| Nenhum plano selecionado | `src/hooks/usePcs.ts` |
| Selecione uma empresa | `src/hooks/usePcs.ts` |
| Selecione uma empresa antes de criar o plano | `src/hooks/usePcs.ts` |
| Não foi possível atualizar a pendência. | `src/hooks/usePendencias.ts` |
| Atenção: Falha na validação biométrica! | `src/hooks/usePonto.ts` |
| Falha na validação biométrica. O registro de ponto não será validado. | `src/hooks/usePonto.ts` |
| ${result.errors} batida(s) não puderam ser sincronizadas e permanecem na fila. | `src/hooks/usePontoOffline.ts` |
| Falha ao salvar ponto offline. | `src/hooks/usePontoOffline.ts` |
| O servidor demorou muito para responder. Tente novamente em alguns instantes. | `src/hooks/useServerValidation.ts` |
| Sessão expirada ou sem permissão. Por favor, faça login novamente. | `src/hooks/useServerValidation.ts` |
| Verifique os campos destacados no formulário. | `src/hooks/useServerValidation.ts` |
| Dados da coletiva ou empresa não encontrados | `src/hooks/ferias/useGerarComunicadoColetivas.ts` |
| Falha ao gerar comunicados: ${err.message ?? err} | `src/hooks/ferias/useGerarComunicadoColetivas.ts` |
| Erro ao processar operação no banco de dados. | `src/integrations/supabase/client.ts` |
| [SUPABASE] VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY  | `src/integrations/supabase/client.ts` |
| Circuit Breaker is OPEN. Integration temporarily unavailable. | `src/lib/circuitBreaker.ts` |
| Retry aborted by signal | `src/lib/retry.ts` |
| Geolocalização indisponível no navegador | `src/pages/AdminAgendamentoExamesPage.tsx` |
| Informe latitude e longitude do colaborador | `src/pages/AdminAgendamentoExamesPage.tsx` |
| Não foi possível obter localização | `src/pages/AdminAgendamentoExamesPage.tsx` |
| Preencha colaborador, clínica e data. | `src/pages/AdminAgendamentoExamesPage.tsx` |
| Informe o motivo do cancelamento | `src/pages/AdminAsoWorkflowPage.tsx` |
| Empresa não selecionada | `src/pages/AdminClinicasPartnersPage.tsx` |
| Preencha todos os campos corretamente | `src/pages/AdminExtintoresPage.tsx` |
| Nova divergência crítica AFDT (PIS não cadastrado) | `src/pages/AdminPontoDivergenciasPage.tsx` |
| Falha ao criar documento | `src/pages/AdminRegimentoInternoPage.tsx` |
| Falha ao publicar | `src/pages/AdminRegimentoInternoPage.tsx` |
| Título e conteúdo são obrigatórios | `src/pages/AdminRegimentoInternoPage.tsx` |
| Erro ao gerar PDF | `src/pages/AdminTelemetriaPage.tsx` |
| Erro ao limpar dados antigos | `src/pages/AdminTelemetriaPage.tsx` |
| Nenhum dado para exportar | `src/pages/AdminTelemetriaPage.tsx` |
| Admissão sem empresa vinculada — impossível enviar e-mail. | `src/pages/AdmissoesPage.tsx` |
| Candidato sem e-mail cadastrado | `src/pages/AdmissoesPage.tsx` |
| Candidato sem telefone cadastrado | `src/pages/AdmissoesPage.tsx` |
| Erro ao gerar PDF avançado | `src/pages/AfastamentosPage.tsx` |
| Selecione uma empresa para exportar o relatório | `src/pages/AfastamentosPage.tsx` |
| ; import { Skeleton } from  | `src/pages/AssinarContratoPage.tsx` |
| Falha ao gerar recibo | `src/pages/AssinarContratoPage.tsx` |
| URL não disponível. | `src/pages/AssinarContratoPage.tsx` |
| Faça login para usar o assistente. | `src/pages/AssistenteIAPage.tsx` |
| Selecione uma empresa antes de realizar o backup | `src/pages/BackupPage.tsx` |
| Erro ao buscar colaborador | `src/pages/CalculadoraRescisaoPage.tsx` |
| Informe a data prevista de fim do contrato (arts. 479/480) | `src/pages/CalculadoraRescisaoPage.tsx` |
| Preencha salário, data de admissão e desligamento | `src/pages/CalculadoraRescisaoPage.tsx` |
| Servidor não retornou um resultado válido | `src/pages/CalculadoraRescisaoPage.tsx` |
| Não foi possível abrir anexo | `src/pages/CanalContabilidadePage.tsx` |
| ; import { Skeleton } from  | `src/pages/CienciaMedidaPage.tsx` |
| Empresa atual não identificada | `src/pages/ColaboradorFormPage.tsx` |
| Falha ao exportar PDF | `src/pages/ColaboradoresPage.tsx` |
| Falha ao exportar dados | `src/pages/ColaboradoresPage.tsx` |
| Nenhum dado encontrado para exportar | `src/pages/ColaboradoresPage.tsx` |
| Erro ao publicar | `src/pages/ComunicacaoInternaPage.tsx` |
| Erro ao registrar | `src/pages/ComunicacaoInternaPage.tsx` |
| Erro ao exportar SPED | `src/pages/ContabilidadePage.tsx` |
| Selecione uma folha de pagamento | `src/pages/ContabilidadePage.tsx` |
| Atenção: ${result.error \|\|  | `src/pages/ContratacaoPage.tsx` |
| Falha ao carregar histórico | `src/pages/ContratosGeradosPage.tsx` |
| Falha ao gerar link de assinatura | `src/pages/ContratosGeradosPage.tsx` |
| Nenhum contrato para exportar | `src/pages/ContratosGeradosPage.tsx` |
| Não foi possível gerar o link de download | `src/pages/ContratosGeradosPage.tsx` |
| Erro ao registrar | `src/pages/ControleAcessoPage.tsx` |
| Erro ao vincular | `src/pages/ConveniosPage.tsx` |
| Empresa não selecionada | `src/pages/DashboardPage.tsx` |
| Empresa ativa não carregada. | `src/pages/DesligamentosPage.tsx` |
| Erro ao excluir desligamento | `src/pages/DesligamentosPage.tsx` |
| Não foi possível gerar link do comprovante | `src/pages/DespesasPage.tsx` |
| Arquivo não encontrado | `src/pages/DocumentosPage.tsx` |
| Empresa ativa não carregada. | `src/pages/DocumentosPage.tsx` |
| Selecione um arquivo e tipo | `src/pages/DocumentosPage.tsx` |
| Evento ${evento.tipo_evento} possui ${result.errors.length} erro(s) de validação. | `src/pages/ESocialPage.tsx` |
| Falha ao validar evento | `src/pages/ESocialPage.tsx` |
| XML não disponível. Envie o evento primeiro. | `src/pages/ESocialPage.tsx` |
|                  className= | `src/pages/FeriasPage.tsx` |
| Falha ao atualizar os dados de férias | `src/pages/FeriasPage.tsx` |
| Configure os dados bancários primeiro | `src/pages/FinanceiroBancarioPage.tsx` |
| Erro ao carregar dados bancários | `src/pages/FinanceiroBancarioPage.tsx` |
| Erro ao salvar configuração | `src/pages/FinanceiroBancarioPage.tsx` |
| Nenhum registro de pagamento encontrado no arquivo — confira se o layout é CNAB 240 ou 400. | `src/pages/FinanceiroBancarioPage.tsx` |
| Selecione uma folha de pagamento | `src/pages/FinanceiroBancarioPage.tsx` |
| Nenhum evento para exportar | `src/pages/FolhaCompliancePage.tsx` |
| Nenhuma folha encontrada para encerramento | `src/pages/FolhaPagamentoPage.tsx` |
| Selecione uma empresa antes de calcular a folha. | `src/pages/FolhaPagamentoPage.tsx` |
| Selecione um colaborador | `src/pages/GeradorDocumentosPage.tsx` |
| Erro ao gerar PDF do holerite. | `src/pages/HoleritesPage.tsx` |
| Falha ao processar o arquivo. Verifique o formato e tente novamente. | `src/pages/ImportacaoPage.tsx` |
| Erro ao registrar | `src/pages/LGPDPage.tsx` |
|                                aria-live= | `src/pages/LoginPage.tsx` |
| … +434 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `rh` | `src/components/ferias/FeriasTable.tsx` |
| `confirmado` | `src/components/ponto/PontoClockRegister.tsx` |
| `pendente` | `src/components/ponto/PontoClockRegister.tsx` |
| `admin` | `src/components/settings/UserRolesTab.tsx` |
| `admin` | `src/contexts/AuthContext.tsx` |
| `role` | `src/contexts/AuthContext.tsx` |
| `admin` | `src/hooks/usePiiMask.ts` |
| `rh` | `src/hooks/usePiiMask.ts` |
| `assistant` | `src/pages/AssistenteIAPage.tsx` |
| `user` | `src/pages/AssistenteIAPage.tsx` |
| `admin` | `src/pages/FeriasProgramacaoPage.tsx` |
| `rh` | `src/pages/FeriasProgramacaoPage.tsx` |
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
| `admin` | `supabase/rebaseline/20260831_storage_remediation.sql` |
| `gestor` | `supabase/rebaseline/20260831_storage_remediation.sql` |
| `rh` | `supabase/rebaseline/20260831_storage_remediation.sql` |

## K. Testes como especificação (6736 testes em 542 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `src/schemas/esocial/__tests__/periodicosValidators.test.ts` | 80 | validarS1000 · returns valid=true for complete correct data · returns error when tpInsc is missing · returns error when tpInsc is invalid enum … |
| `src/services/__tests__/colaboradorDetalhesService.test.ts` | 80 | listarDependentes · returns dependentes for colaborador · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/tabelasReferenciaService.test.ts` | 80 | listarNacionalidades · returns records · queries nacionalidades table · returns empty array when data is null … |
| `src/utils/__tests__/rescisaoCalc.test.ts` | 80 | calcINSS — Tabela Progressiva 2026 · edge cases · salary = 0 → INSS = 0 · salary = -100 → INSS = 0 … |
| `src/hooks/__tests__/useColaboradorDetalhes.test.ts` | 76 | useDependentes · calls listarDependentes with colaboradorId · returns dependentes from service · is disabled when colaboradorId is empty … |
| `src/services/__tests__/esocialService.test.ts` | 74 | getEventoDescricao · returns known event description for S-1000 · returns description for S-2200 · returns description for S-1200 … |
| `src/services/__tests__/workflowService.test.ts` | 72 | workflowService.listarDefinicoes · returns definitions without empresa filter · returns empty array when data is null · applies empresa_id filter when provided … |
| `src/lib/__tests__/masks.test.ts` | 71 | maskCPF · formats 11 digits as 000.000.000-00 · strips non-digits before formatting · slices at 14 characters … |
| `src/hooks/__tests__/useNovasTabelas.test.ts` | 67 | useBatidasPonto · is disabled and returns empty when no colaboradorId · calls batidasPontoService.listar with colaboradorId · returns batidas data … |
| `src/calculators/__tests__/beneficios.test.ts` | 65 | calcularDecimo13 · parcela 1 returns half the proportional value with no deductions · parcela 2 deducts INSS and IRRF · proportional: 6 months = 50% of salary … |
| `src/calculators/__tests__/scenarios.test.ts` | 62 | Simulação — INSS (progressivo 2026, teto R$ 8.475,55) · zero e negativos retornam 0 · NaN não propaga (robustez) · piso (salário mínimo 1518) => 113,85 … |
| `src/services/__tests__/afastamentoService.test.ts` | 61 | afastamentoService.listar · returns data and total from supabase · returns empty data when supabase returns null · filters by empresa_id from options.empresaId … |
| `src/services/__tests__/cnabService.test.ts` | 56 | cnabService.getConfig · returns config when found · returns null when config not found · throws on DB error … |
| `src/hooks/__tests__/useTabelasReferencia.test.ts` | 54 | useNacionalidades · calls listarNacionalidades · useTiposDesligamento · calls listarTiposDesligamento and returns data … |
| `src/components/__tests__/InlineTabs.test.tsx` | 46 | PreferenciasTab · renders Preferências de Interface title · renders Modo Escuro switch label · renders Salvar Alterações button … |
| `src/services/__tests__/feriasService.test.ts` | 46 | feriasService.listSolicitacoes · returns data and count from supabase · returns empty data when supabase returns null · filters by empresa_id when provided … |
| `src/services/__tests__/catalogoCursoService.test.ts` | 44 | catalogoCursoService.listarCursos · returns cursos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/components/__tests__/LayoutGridSection.test.tsx` | 43 | Row · renders children · has flex class · applies flex-wrap when wrap=true … |
| `src/services/__tests__/premiacoesService.test.ts` | 43 | premiacoesService.listarCampanhas · returns campanhas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/medidasDisciplinaresService.test.ts` | 40 | medidasDisciplinaresService.listar · returns all medidas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/recrutamentoService.test.ts` | 40 | recrutamentoService.listarVagas · returns vagas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/calculators/__tests__/calculatorExtra.test.ts` | 39 | calcularAvisoPrevioIndenizado · 30 dias para menos de 1 ano de serviço · incrementa 3 dias por ano de serviço (1 ano → 33 dias) · incrementa 3 dias por ano de serviço (5 anos → 45 dias) … |
| `src/schemas/esocial/__tests__/helpers.test.ts` | 39 | required · adds no error for a non-empty string · adds error for empty string · adds error for null … |
| `src/schemas/esocial/__tests__/naoPeriodicosValidators.test.ts` | 39 | validarS2190 · returns valid for complete data · errors when cpfTrab is missing · errors when dtAdm is missing … |
| `src/services/__tests__/avaliacaoService.test.ts` | 39 | avaliacaoService.listarCiclos · returns ciclos without empresa filter · filters by empresa_id when provided · returns empty array when data is null … |
| `src/services/tabelas/__tests__/rhService.test.ts` | 38 | configAfastamentosService · obter calls from config_afastamentos · obter throws on error · salvar calls upsert … |
| `src/calculators/__tests__/tabelas.test.ts` | 35 | tabelas 2026 — integridade dos dados · salário mínimo · SALARIO_MINIMO_2026 é positivo · SALARIO_MINIMO_2026 vale R$ 1.621,00 … |
| `src/services/__tests__/canalContabilidadeService.test.ts` | 35 | canalContabilidadeService.listContatos · returns contacts ordered by nome · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/beneficioService.test.ts` | 34 | beneficioService.listar · returns data and total without filters · returns empty data when null · applies empresa_id filter when provided in filters … |
| `src/utils/importacao/__tests__/validators.test.ts` | 33 | validarCPF · returns true for valid CPF · returns false for CPFs with all same digits · returns false for CPF with wrong check digits … |
| `src/lib/cursor.test.ts` | 31 | encodeCursor · encode/decodes string values correctly · encode/decodes numeric values correctly · encode/decodes null values correctly … |
| `src/services/__tests__/auditoriaService.test.ts` | 31 | auditoriaService.listarTrilha · usa a RPC unificada com tenant e filtros explícitos · aceita escopo global apenas como pedido explícito para a RPC autoritativa · rejeita limites fora do contrato antes de consultar o banco … |
| `src/components/__tests__/forms.test.tsx` | 30 | FormField · renders label when provided · renders input · renders error message … |
| `src/services/__tests__/bancoHorasService.test.ts` | 30 | bancoHorasService · listarPorColaborador · queries banco_horas for the given colaboradorId · returns data from supabase … |
| `src/services/__tests__/comunicacaoService.test.ts` | 30 | comunicacaoService.listarComunicados · returns all comunicados without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/despesaService.test.ts` | 29 | despesaService — escritas e storage · criar: aplica defaults de status/tipo e retorna o registro · criar: lança quando insert não retorna registro · aprovar: exige empresaId … |
| `src/services/__tests__/integracaoService.test.ts` | 29 | cnabService.getConfig · returns config when found · returns null when no config exists · queries cnab_configuracoes with limit 1 … |
| `src/services/__tests__/pesquisaService.test.ts` | 29 | pesquisaService.listar · returns pesquisas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/turnoService.test.ts` | 29 | turnoService.listarTurnos · returns all turnos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/whatsappService.test.ts` | 29 | whatsappService · getConfig · returns config data when found · returns null when no config found … |
| `src/schemas/esocial/__tests__/sstValidators.test.ts` | 27 | validarS2210 · returns valid for complete data · errors when cpfTrab is missing · errors for invalid CPF … |
| `src/services/__tests__/admissaoService.test.ts` | 27 | admissaoService.listarAdmissoes · always scopes query by empresa_id (multi-tenant) · returns empty array when supabase returns null · filters by empresa_id when provided … |
| `src/services/__tests__/episService.test.ts` | 27 | episService.listar · returns EPIs without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/lgpdService.test.ts` | 27 | lgpdService.listarConsentimentos · returns consentimentos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/securityService.test.ts` | 27 | securityService.getBlockedIps · returns blocked IPs ordered by created_at desc · returns empty array when data is null · throws and logs error on DB failure … |
| `src/utils/__tests__/format.test.ts` | 27 | format — resiliência a entradas inválidas · formatDate(%p) → fallback · formatCurrency(%p) → fallback · respeita fallback customizado … |
| `src/services/__tests__/batidasPontoService.test.ts` | 26 | batidasPontoService.listar · returns batidas for colaborador · returns empty array when data is null · filters by colaborador_id … |
| `src/services/__tests__/colaboradorService.test.ts` | 25 | colaboradorService.listar · returns data and total from supabase · returns empty data with total 0 when supabase returns null · adds or() filter when search is provided … |
| `src/services/__tests__/contratoService.test.ts` | 25 | contratoService.listar · returns all contratos without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/contratoTemplateService.test.ts` | 25 | contratoTemplateService.listar · returns templates list · returns empty array when data is null · throws on DB error … |
| `src/services/__tests__/horaExtraService.test.ts` | 25 | horaExtraService.listar · returns records without empresa filter · returns empty array when data is null · applies empresa_id filter when provided … |
| `src/services/__tests__/pontoService.test.ts` | 25 | pontoService.getSettings · returns settings for empresa · returns null when no settings found · throws on DB error … |
| `src/utils/__tests__/folhaCalc.test.ts` | 25 | Motor de Cálculo de Folha (folhaCalc) · deve processar uma folha simples corretamente · deve incluir horas extras e DSR no cálculo · deve calcular 13º salário quando solicitado … |
| `supabase/functions/external-db-bridge/validation.test.ts` | 25 | tabela: injeção rejeitada · tabela: nomes legítimos aceitos · denylist: tabelas sensíveis presentes · colunas: injeção/subquery rejeitada … |
| `src/hooks/__tests__/validators.test.ts` | 24 | required · rejeita null, undefined e string vazia · aceita valores presentes, incluindo 0 e false · isValidEmail … |
| `src/utils/__tests__/esocialXmlGenerator.test.ts` | 24 | gerarXmlESocial · returns valid XML declaration · wraps output in eSocial root element · uses testing environment by default (tpAmb=2) … |
| `src/components/__tests__/CardProgramacao.test.tsx` | 23 | CardProgramacao · renders colaborador name · renders dias previstos · renders status badge for rascunho … |
| `src/components/__tests__/CNABDialog.test.tsx` | 22 | CNABDialog · renders Exportar Bancário trigger button · renders Pagamento de Salários dialog title · renders Código do Banco label … |
| `src/components/__tests__/CalculoFolhaWizard.test.tsx` | 22 | CalculoFolhaWizard · renders Assistente de Cálculo trigger button · renders Assistente de Folha dialog title · renders competencia in dialog header … |
| `src/hooks/__tests__/useBruteForceProtection.test.ts` | 22 | useBruteForceProtection · estado inicial · começa destravado e sem tentativas · superfície de rede … |
| `src/lib/__tests__/utils.test.ts` | 22 | merges class names · deduplicates tailwind classes (tw-merge) · filters falsy values · truncate … |
| `src/schemas/__tests__/validate.test.ts` | 22 | validateInput · rejeita payload vazio · aceita payload parcial válido (update) · rejeita valor fora de domínio mesmo em payload parcial … |
| `src/services/__tests__/faltasService.test.ts` | 22 | faltasService.listar · returns all faltas without empresa filter · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/__tests__/rescisaoService.test.ts` | 22 | rescisaoService · validarTransicao · should block jumping more than one stage · should block homologation if status is not calculado … |
| `src/utils/__tests__/safeUrl.test.ts` | 22 | isAllowedUrl · allows known supabase host · blocks non-canonical Supabase hosts · allows lovable.app subdomain … |
| `src/components/__tests__/PortalDocumentosTab.test.tsx` | 21 | PortalDocumentosTab · renders Gestão de Documentos title · renders Enviar Novo button · shows loading spinner when loading … |
| `src/schemas/esocial/__tests__/crossFieldValidators.test.ts` | 21 | cronologia de datas · S-2200 rejeita admissão anterior ao nascimento · S-2230 rejeita término de afastamento anterior ao início · S-2299 rejeita desligamento anterior à admissão … |
| `src/services/__tests__/notificacoesService.test.ts` | 21 | criarNotificacao · calls supabase.auth.getUser to get current user · inserts notification with provided fields · uses current user id when payload.user_id is not provided … |
| `src/utils/importacao/__tests__/columnMap.test.ts` | 21 | normalizeHeader · lowercases the header · trims surrounding whitespace · strips diacritics … |
| `src/calculators/__tests__/impostos.test.ts` | 20 | calcularINSS · returns 0 for salary of 0 · returns 0 for negative salary · returns 0 for NaN … |
| `src/components/__tests__/MFASetup.test.tsx` | 20 | MFASetup · shows loading spinner when loading · renders 2FA title · shows Desativado badge when no factors … |
| `src/hooks/__tests__/useGenericCrud.test.tsx` | 20 | useGenericCrud · initial state has correct defaults · respects custom initialPageSize · loads items from service after query resolves … |
| `src/services/__tests__/contratacaoService.test.ts` | 20 | contratacaoService.validarDocumento · updates admissao document status and logs audit · sets document flag false when status is rejeitado · throws for a document type the admission checklist does not send … |
| `src/services/__tests__/desligamentoService.test.ts` | 20 | desligamentoService · listar · should call select with colaborador join · should apply limit of 500 … |
| `src/services/__tests__/jornadaHorariosService.test.ts` | 20 | jornadaHorariosService.listar · returns horarios for jornada · returns empty array when data is null · filters by jornada_id … |
| `src/components/__tests__/LayoutPrimitives.test.tsx` | 19 | PageContainer · renders children · renders title when provided · renders description when provided … |
| `src/components/__tests__/PontoClockRegister.test.tsx` | 19 | PontoClockRegister · renders Registrar Ponto title · renders Entrada button · renders Saída Almoço button … |
| `src/services/__tests__/edgeFunctionsService.test.ts` | 19 | edgeFunctionsService.dispararAlertasDP · calls invoke with  · uses genericBreaker · edgeFunctionsService.enviarRelatorioEmail … |
| `src/services/__tests__/pontoOfflineService.test.ts` | 19 | pontoOfflineService.generateIntegrityHash · returns a non-empty string · is deterministic for the same input · differs for different inputs … |
| `src/services/tabelas/__tests__/viewsService.test.ts` | 19 | viewsService · alertasRH queries vw_alertas_rh and returns array · alertasRH distinguishes schema failure from an empty result · kpiTurnover queries vw_kpi_turnover … |
| `src/utils/__tests__/piiMask.test.ts` | 19 | maskCpfDisplay · returns empty string for null · returns empty string for undefined · masks 11-digit CPF showing only last 2 digits … |
| `src/utils/folha/__tests__/validadorFolha.test.ts` | 19 | validadorFolha.validarFolha · returns empty array when supabase returns null itens · returns empty array on DB error · returns no alerts for a healthy payroll item … |
| `scripts/tests/contexto-indice.test.mjs` | 18 | fonte recente sem erro continua disponível como ok · fonte recente com ${key} fica parcial · erros do snapshot são lidos mesmo sem manifest de saúde · relatório do snapshot sem erros não torna a fonte parcial … |
| `src/components/__tests__/ESocialNaoPeriodicos.test.tsx` | 18 | S2200Admissao · renders trabalhador name · renders Identificação do Trabalhador label · renders Dados da Admissão label … |
| `src/constants/__tests__/regimes.test.ts` | 18 | REGIMES_TRIBUTARIOS · defines all 4 regime types · each regime has required fields · simples_nacional does NOT collect INSS patronal … |
| `src/hooks/ferias/__tests__/useProgramacaoFerias.test.ts` | 18 | useProgramacaoFerias · uses ferias-programacao queryKey with ano and filters · is enabled when empresaId is present · returns data from query … |
| `src/services/__tests__/baseService.test.ts` | 18 | BaseService.listar · returns data and total from supabase · returns empty data with total 0 when supabase returns null · queries page 2 with correct range offset … |
| `src/utils/__tests__/uploadValidation.test.ts` | 18 | validateUploadFile · accepts a valid PDF file · accepts a valid JPEG image · throws when file exceeds size limit … |
| `src/components/__tests__/ESocialAlteracaoComponents.test.tsx` | 17 | S2205AlteracaoCadastral · renders trabalhador name · renders CPF · renders data de alteração … |
| `src/hooks/__tests__/useMoreGenericCrudHooks.test.ts` | 17 | useWebhooksAvancados · exposes webhooks as alias for items · passes webhookService to useGenericCrud with empresa_id filter · useWebhookLogs … |
| `src/hooks/__tests__/useNotificacoes.test.ts` | 17 | useNotificacoes · returns empty notificacoes initially · naoLidas count is 0 when all notificacoes are read · naoLidas counts unread notificacoes … |
| `src/hooks/__tests__/usePcs.test.ts` | 17 | usePcsPlanos · lista planos da empresa atual · criar semeia os fatores da metodologia padrão no plano novo · atualizar delega ao service e toasta sucesso … |
| `src/services/tabelas/__tests__/adminService.test.ts` | 17 | logEnvioRelatoriosService · listar queries log_envio_relatorios · listar with empresaId filters via relatorios_agendados first · listar with empresaId returns [] when the empresa has no agendamentos … |
| `src/services/tabelas/__tests__/documentosService.test.ts` | 17 | documentoTemplatesService · listar queries documento_templates · listar returns [] when data is null · criar calls insert on documento_templates … |
| `src/utils/__tests__/cursorPagination.test.ts` | 17 | cursorPagination · encodeCursor/decodeCursor round-trip · round-trip: ${c.column}=${c.value} · numeric value is preserved as number … |
| `src/utils/importacao/__tests__/parser.test.ts` | 17 | validators · valida CPFs corretos e rejeita inválidos · normalizarCPF remove máscara e preenche zeros · parseDate lida com dd/mm/yyyy, ISO e serial Excel … |
| `supabase/functions/calcular-rescisao/motor.test.ts` | 17 | sem justa causa: multa FGTS fora do líquido (GRRF) · aviso proporcional Lei 12.506: 6 anos → 48 dias · termino_contrato empregador → indenização art. 479 (50% dos dias restantes) · termino_contrato empregado → indenização art. 480 nos descontos, sem multa … |
| `src/calculators/__tests__/trabalhista-base.test.ts` | 16 | calcularHorasExtras (trabalhista-base) · returns 0 for 0 hours · returns 0 for negative hours · 50% adicional: 1 hour = (salary/jornada) * 1.5 … |
| `src/components/__tests__/PageContainer.test.tsx` | 16 | PageContainer · renders children · renders title when provided · does not render h1 when title is omitted … |
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
| `scripts/tests/inventario-banco.test.mjs` | 15 | banco.sql tem as secoes esperadas e cada uma devolve a coluna j · banco.sql so le: nenhum comando de escrita e nada do command do cron · secao obrigatoria ausente aborta; opcional ausente vira coleta_parcial com o motivo · lerEntrada aceita objeto por secao, resposta do MCP por secao e envelope tools/call … |
| `src/calculators/__tests__/auditHelper.test.ts` | 15 | signCalculation · returns a hex string · returns the same hash for identical data · returns different hashes for different data … |
| `src/components/__tests__/ESocialEventComponents.test.tsx` | 15 | S2200Admissao (NaoPeriodicos) · renders trabalhador name · renders CPF · renders admissao date … |
| `src/hooks/__tests__/useEmpresas.test.ts` | 15 | useEmpresas · returns expected shape · returns loadingEmpresas=true initially · loads todasEmpresas when isAdmin=true … |
| `src/hooks/__tests__/useGrupo.test.tsx` | 15 | useGrupo · initial state: isLoading=true, empty arrays · returns all empresas after query resolves · empresasAtivas only includes ativa=true entries … |
| `src/lib/__tests__/queryClient.test.ts` | 15 | queryClient · is a QueryClient instance · has staleTime of 5 minutes · has gcTime of 30 minutes … |
| `src/utils/__tests__/dateLocal.test.ts` | 15 | dateLocal · formata YYYY-MM-DD com zero-padding no fuso local · não sofre shift de UTC quando a hora local é próxima da meia-noite · retorna string vazia para entrada inválida (contrato defensivo) … |
| `src/utils/__tests__/sanitizeHtml.test.ts` | 15 | sanitizeHtml — baseline hardened profile · strips <script> entirely · preserves safe anchors (http, mailto, tel, hash) · forces rel= … |
| `src/components/__tests__/AfastamentoForm.test.tsx` | 14 | AfastamentoForm · renders Colaborador label · renders Motivo do Afastamento label · renders Data de Início label … |
| `src/components/__tests__/ESocialDesligamentoCDP.test.tsx` | 14 | S2299Desligamento · renders CPF do trabalhador · renders data do desligamento · renders motivo do desligamento … |
| `src/components/__tests__/SidebarFooter.test.tsx` | 14 | SidebarFooter — expanded · renders user initials · renders user name · renders user email … |
| `src/components/__tests__/layout.test.tsx` | 14 | PageHeader · renders title · renders description when provided · does not render description when omitted … |
| `src/lib/__tests__/circuitBreaker.test.ts` | 14 | CircuitBreaker · starts in CLOSED state · executes fn and returns its result when CLOSED · propagates errors thrown by fn when CLOSED … |
| `src/lib/__tests__/retry.test.ts` | 14 | retryWithIdempotency · retorna na primeira tentativa sem retry · repassa idempotencyKey no resultado · faz retry em erro 5xx e devolve o sucesso seguinte … |
| `src/services/__tests__/documentoService.test.ts` | 14 | documentoService.listarDocumentos · returns documents without filters · returns empty array when data is null · filters by empresa_id when provided … |
| `src/services/folha/__tests__/calculoLoteService.test.ts` | 14 | calculoLoteService.processarLote · usa somente relações existentes e lê jornada do colaborador canônico · aplica eventos variáveis da competência via rubrica e dependentes de IRRF · grava no cabeçalho os totais somados dos itens, só com a folha aberta … |
| `src/utils/__tests__/comunicadoFeriasColetivasPDF.test.ts` | 14 | gerarComunicadoMTE · returns a Blob · returns Uint8Array bytes · returns a hash string … |
| `src/utils/folha/__tests__/pontoIntegracaoUtils.test.ts` | 14 | pontoIntegracaoUtils.intervalToDecimal · returns 0 for null · returns 0 for undefined · returns 0 for empty string … |
| `src/components/__tests__/ESocialPeriodicos.test.tsx` | 13 | S1200Remuneracao · renders Trabalhador label · renders Período Apuração label · renders perApur value … |
| `src/components/__tests__/ESocialSSTandTSVTermino.test.tsx` | 13 | S2210SST · renders CPF do trabalhador · renders nome do trabalhador · renders data do acidente … |
| `src/components/__tests__/ESocialTSVComponents.test.tsx` | 13 | S2300TSVInicio · renders trabalhador name · renders CPF · renders data de início … |
| `src/components/__tests__/EntityPageContainer.test.tsx` | 13 | EntityPageContainer · renders page title and description · shows TableSkeleton when isLoading=true · shows SyncErrorState when error is present … |
| `src/components/__tests__/desligamento-badges.test.tsx` | 13 | StatusBadge · renders  · renders  · renders  … |
| `src/services/__tests__/empresaService.test.ts` | 13 | empresaService.listar · returns data and total from supabase · returns empty data with total 0 when supabase returns null · adds or() filter when search is provided … |
| `src/services/__tests__/encryptionService.test.ts` | 13 | validateCPF · aceita CPF válido (com e sem máscara) · rejeita dígito verificador errado · rejeita tamanho errado e sequências repetidas … |
| `src/services/__tests__/historicoContratoService.test.ts` | 13 | historicoContratoService.listar · returns historico for given colaboradorId · returns empty array when data is null · filters by colaborador_id … |
| `src/services/__tests__/pushNotificationService.test.ts` | 13 | pushNotificationService.isSupported · returns false when serviceWorker is absent · returns false when PushManager is absent · pushNotificationService.getSubscription … |
| `src/utils/__tests__/feriasPDF.test.ts` | 13 | feriasPDF.gerarRecibo · creates a jsPDF document · saves the PDF file · includes colaborador name in text calls … |
| `src/calculators/__tests__/rescisao.test.ts` | 12 | calcularRescisao · returns all expected top-level keys · saldoSalario is proportional to days worked · sem_justa_causa has aviso previo > 0 … |
| `src/components/__tests__/DashboardWidgets.test.tsx` | 12 | QuickActionsGrid · renders Ações Rápidas title · renders Novo Colaborador action · renders Calcular Folha action … |
| `src/components/__tests__/DeclaracoesTable.test.tsx` | 12 | DctfTable · renders table headers · shows empty state when no data · renders competencias … |
| `src/components/__tests__/DesligamentoBadges.test.tsx` | 12 | StatusBadge · renders Pendente for pendente status · renders Em Andamento for em_andamento · renders Concluído for concluido … |
| `src/components/__tests__/ESocialPagamentosAndSST.test.tsx` | 12 | S1210Pagamentos · renders Rendimentos Pagos label · renders payment dates · renders perApur for competência … |
| `src/components/__tests__/MedidasDisciplinares.test.tsx` | 12 | MedidasKPIs · renders Total Registros label · renders all KPI labels · renders stat values … |
| `src/components/__tests__/NovaAdmissaoDialog.test.tsx` | 12 | NovaAdmissaoDialog · renders Nova Admissão trigger button by default · renders Nova Admissão dialog title · renders Nome completo label … |
| `src/hooks/__tests__/useCalcular13Salario.test.tsx` | 12 | useCalcular13Salario · initial state: loading=false, resultado=null · exposes calcular function · sets loading=true while calculating … |
| `src/hooks/__tests__/useExecutiveDashboard.test.ts` | 12 | useExecutiveKPIs · is disabled when no empresaId · returns data when empresaId provided · returns totalAtivos=0 when no employees … |
| `src/hooks/__tests__/useGenericCrud.test.ts` | 12 | useGenericCrud · passes queryKey and queryFn to useQuery · exposes items from query data · exposes total from query data … |
| `src/hooks/__tests__/useLocalStorage.test.ts` | 12 | useLocalStorage · returns initial value when key does not exist · returns stored value when key exists · stores value and updates state … |
| `src/hooks/__tests__/useMediaQuery.test.ts` | 12 | useMediaQuery · returns initial match state · returns false when query does not match · updates when media query changes … |
| `src/integrations/supabase/__tests__/clientBridge.test.ts` | 12 | client.ts — callBridge via query builder · select serializa action/table/filters/order/limit no body do bridge · filtro com valor  · ilike vazio e string  … |
| `src/services/__tests__/authService.test.ts` | 12 | authService.forgotPassword · returns success when supabase auth succeeds · throws when supabase auth returns error · throws with fallback message when error has no message … |
| `src/services/__tests__/contratacaoService.xss.test.ts` | 12 | contratacaoService.gerarTemplateContrato — regressão XSS · escapa payload malicioso em admissao.nome: %s · escapa payload em admissao.cargo e admissao.departamento · escapa payload dentro de metadata.endereco (input do candidato) … |
| `src/services/__tests__/controleAcessoService.test.ts` | 12 | controleAcessoService.listar · returns all records without filter · returns empty array when data is null · applies empresa_id filter when provided … |
| `src/services/__tests__/pontosService.test.ts` | 12 | pontosService facade · exposes registrar from pontoService · exposes getSettings from pontoService · exposes buscarRegistroHoje from pontoService … |
| `src/services/__tests__/webhookService.test.ts` | 12 | webhookService · listar · returns paginated records when found · applies empresa_id filter when provided … |
| `src/utils/importacao/__tests__/excelDownload.test.ts` | 12 | XLSX_MIME · is the correct OOXML MIME type · downloadWorkbook · calls writeBuffer and creates object URL … |
| `scripts/tests/contexto-publicacao.test.mjs` | 11 | cada upload fornece um ID e cada download usa destino explícito sem ocultar falhas · produtores independentes falham de verdade e o publisher ainda aceita as fontes disponíveis · falha fatal de ${failed} mantém sua versão anterior e publica as duas fontes saudáveis · publisher ${previousBranch ?  … |
| `src/components/__tests__/EmprestimosFinanceiros.test.tsx` | 11 | EmprestimosTable · renders table headers · renders colaborador names · renders instituicao or dash for null … |
| `src/components/__tests__/GerarPgrButton.test.tsx` | 11 | GerarPgrButton · renders trigger button with  · renders dialog title · renders Responsável Técnico label … |
| `src/components/__tests__/MedidaContestacaoDialog.test.tsx` | 11 | MedidaContestacaoDialog · returns null when medida is null · does not render dialog content when open is false · renders dialog when open is true with medida … |
| `src/components/__tests__/MobileBottomNav.test.tsx` | 11 | MobileBottomNav · renders nav with aria-label · renders Home link · renders Equipe link … |
| `src/components/__tests__/MorningBriefing.test.tsx` | 11 | MorningBriefing · separa o cache por empresa e não consulta sem tenant selecionado · shows skeleton when loading · renders error state when error occurs … |
| `src/contexts/__tests__/NotificationContext.test.tsx` | 11 | useNotification · throws when used outside provider · provides notifications from useNotificacoes · provides unreadCount from naoLidas … |
| `src/hooks/__tests__/useBackGesture.test.ts` | 11 | useBackGesture · navigates back on left-edge swipe right · does not navigate when swipe starts away from left edge · does not navigate when horizontal distance is too small … |
| `src/hooks/__tests__/useServerValidation.test.ts` | 11 | useServerValidation · returns handleServerError function · shows generic toast for unknown error · handles VALIDATION_ERROR with field errors … |
| `src/services/__tests__/bancoHorasConfigService.test.ts` | 11 | bancoHorasConfigService.buscar · returns config for empresa · returns null when no config exists · filters by empresa_id … |
| `src/services/__tests__/pontoMonitorService.test.ts` | 11 | pontoMonitorService.logEvent · inserts event into ponto_auditoria · includes usuario_id from auth.getUser · swallows DB errors silently (no throw) … |
| `src/utils/__tests__/safeError.test.ts` | 11 | safeErrorMessage · returns fallback for null/undefined error · returns custom fallback when specified · returns user-friendly message for duplicate key error … |
| `src/utils/__tests__/secureJson.test.ts` | 11 | secureJsonParse · parses simple valid JSON · parses JSON arrays · strips __proto__ keys to prevent prototype pollution … |
| `src/components/__tests__/Breadcrumbs.test.tsx` | 10 | Breadcrumbs · returns null when path has only one segment · renders breadcrumb for two-segment path · shows  … |
| `src/components/__tests__/ColaboradorDocuments.test.tsx` | 10 | ColaboradorDocuments · renders Gestão de Documentos Digitais heading · renders Novo Documento button · renders Adicionar Novo Documento dialog title … |
| `src/components/__tests__/DesligamentoStatusBadge.test.tsx` | 10 | StatusBadge · renders Pendente for pendente status · renders Em Andamento for em_andamento status · renders Concluído for concluido status … |
| `src/components/__tests__/EmpresaSettingsTab.test.tsx` | 10 | EmpresaSettingsTab · shows spinner when loading · renders Dados da Empresa title · renders form labels … |
| `src/components/__tests__/FeriasReconciliacaoCard.test.tsx` | 10 | FeriasReconciliacaoCard · renders Reconciliação Férias ↔ Folha title · shows empty state when no divergences · shows skeleton when loading … |
| `src/components/__tests__/FeriasReconciliacaoHistoricoCard.test.tsx` | 10 | FeriasReconciliacaoHistoricoCard · renders Reconciliação Automática — Histórico title · shows empty state when no logs · shows skeleton when loading … |
| `src/components/__tests__/MedidasTimeline.test.tsx` | 10 | MedidasTimeline · returns null when medidas is empty · renders medida descricao · renders colaborador name … |
| `src/components/__tests__/MobileQuickActions.test.tsx` | 10 | MobileQuickActions · renders nothing when open=false · renders Ações Rápidas heading when open=true · renders all 10 quick action labels … |
| `src/components/__tests__/NewLoanDialog.test.tsx` | 10 | NewLoanDialog · renders Novo Empréstimo trigger button · renders Registrar Empréstimo Consignado title · renders Compliance L10.820 badge … |
| `src/components/__tests__/Notifications.test.tsx` | 10 | NotificationItem · renders Notificações header · shows empty state when no notifications · renders notification titles … |
| `src/components/__tests__/OnboardingPageContent.test.tsx` | 10 | OnboardingPageContent · shows loading spinner while fetching · shows empty state when no onboarding data · shows empty state description … |
| `src/components/__tests__/PerformanceAuditTimeline.test.tsx` | 10 | PerformanceAuditTimeline · renders Trilha de Desempenho title · renders empty state message when no logs · distinguishes a query failure from an empty audit trail … |
| `src/components/__tests__/PontoAuditTimeline.test.tsx` | 10 | PontoAuditTimeline · renders Trilha de Auditoria title · renders search input · shows empty state when no logs … |
| `src/components/__tests__/PontoTodayCard.test.tsx` | 10 | PontoTodayCard · renders Hoje title · shows empty state when no registro · renders Progresso da Jornada when registro present … |
| `src/components/__tests__/RejeitarDialog.test.tsx` | 10 | RejeitarDialog · renders nothing when open=false · renders title  · renders  … |
| `src/components/__tests__/RelatoriosAgendadosTab.test.tsx` | 10 | RelatoriosAgendadosTab · renders Relatórios Agendados heading · renders Agendar Novo button · shows empty state when no agendamentos … |
| `src/components/__tests__/RelatoriosExportTab.test.tsx` | 10 | RelatoriosExportTab · renders report titles · renders report descriptions · shows CSV button label when exportFormat is csv … |
| `src/constants/__tests__/rubricas.test.ts` | 10 | RUBRICAS_PADRAO · is a non-empty array · has no duplicate codigos · each rubrica has required fields … |
| `src/hooks/__tests__/useDocumentOCR.test.ts` | 10 | useDocumentOCR · starts with isProcessing false · returns processDocument function · sets isProcessing true during processing … |
| `src/hooks/__tests__/useFeriasAprovacao.test.ts` | 10 | useFeriasAprovacao · starts with isLoading=false · aprovarGestor calls feriasService.aprovarGestor with id and userId · aprovarGestor shows success toast … |
| `src/hooks/__tests__/useHorasExtras.test.ts` | 10 | useHorasExtras · returns initial solicitacoes empty array · calls horaExtraService.listar with empresaId · returns solicitacoes from service … |
| `src/hooks/__tests__/useRealTimeSubscription.test.tsx` | 10 | useRealTimeSubscription · does NOT subscribe when empresaId is undefined · does NOT subscribe when empresaId is empty string · creates a channel when empresaId is provided … |
| `src/services/__tests__/folhaPagamentoService.test.ts` | 10 | folhaPagamentoService · assinarHolerite · should call upsert with correct data and return hash · fecharFolha … |
| `src/services/__tests__/loggerService.test.ts` | 10 | loggerService · should buffer info logs and not call supabase rpc immediately · should flush error logs immediately via rpc · should flush warn logs immediately via rpc for security audit … |
| `src/services/tabelas/__tests__/pontoService.test.ts` | 10 | ajustesPontoService · listar queries ajustes_ponto · listar returns [] when data is null · criar calls insert on ajustes_ponto … |
| `src/utils/__tests__/avisoFeriasPDF.test.ts` | 10 | gerarAvisoFeriasPDF · returns a Blob · returns a Uint8Array bytes · returns a sha256 hash string … |
| `src/utils/__tests__/calculoFerias.test.ts` | 10 | calculoFerias · deve calcular férias simples (30 dias) sem abono · deve calcular férias com abono pecuniário (20 dias férias + 10 dias abono) · deve limitar o abono pecuniário a no máximo 10 dias … |
| `supabase/functions/_shared/idempotency.test.ts` | 10 | idempotency: primeira chamada retorna reason=NEW e id válido · idempotency: 20 requisições concorrentes com MESMA key produzem exatamente 1 NEW · idempotency: reenvio após conclusão retorna REPLAY com mesmo body · idempotency: conclusão 204 sem body continua sendo replay de sucesso … |
| `supabase/functions/_shared/rateLimit.test.ts` | 10 | permite quando abaixo do limite e insere marcador · bloqueia quando count >= limit e não insere · isolamento por chave — outra chave não conta contra a atual · ignora rows fora da janela (timestamp < windowStart) … |
| `src/components/__tests__/ASOTab.test.tsx` | 9 | ASOTab · shows spinner when loading · renders Atestados de Saúde Ocupacional title · renders Novo ASO button … |
| `src/components/__tests__/AdmissoesKanban.test.tsx` | 9 | AdmissoesKanban · renders Solicitação column label · renders Documentos column label · renders eSocial column label … |
| `src/components/__tests__/AfastamentoDocumentManager.test.tsx` | 9 | AfastamentoDocumentManager · renders Tipo de Documento label · renders Arquivo label · renders Fazer Upload button … |
| `src/components/__tests__/AfastamentoStats.test.tsx` | 9 | AfastamentoStats · renders total registros count · renders ativos count · renders pendentes count … |
| `src/components/__tests__/AfastamentoTable.test.tsx` | 9 | AfastamentoTable · renders Colaborador table header · renders Tipo / CID table header · renders Período table header … |
| `src/components/__tests__/AfastamentoTimeline.test.tsx` | 9 | AfastamentoTimeline · renders Spinner when loading · renders Linha do Tempo heading · renders Registro Inicial badge … |
| `src/components/__tests__/AnalyticsSection.test.tsx` | 9 | AnalyticsSection · renders Workflows quick access card · renders BI e Metas quick access card · renders Auditoria quick access card … |
| `src/components/__tests__/AnimatedNumber.test.tsx` | 9 | AnimatedNumber · renders 0 initially when not in view · renders initial 0 even when format prop is provided · applies custom className to span … |
| `src/components/__tests__/AssinarAvisoDialog.test.tsx` | 9 | AssinarAvisoDialog · renders Assinar Aviso de Férias title · renders CLT arts. 135 e 145 in description · renders colaborador name … |
| `src/components/__tests__/AssinarEspelhoDialog.test.tsx` | 9 | AssinarEspelhoDialog · renders default trigger button · renders dialog title · renders colaborador name in description … |
| `src/components/__tests__/BarChartWidget.test.tsx` | 9 | BarChartWidget · renders bar labels · renders bar values when showValues=true (default) · does not render values when showValues=false … |
| `src/components/__tests__/BeneficioHistorico.test.tsx` | 9 | BeneficioHistorico · renders Spinner when loading · renders Data column header · renders Tipo column header … |
| `src/components/__tests__/CPFInput.test.tsx` | 9 | CPFInput · renders with placeholder 000.000.000-00 · formats typed digits as CPF mask · calls onChange with raw digits (no punctuation) … |
| `src/components/__tests__/CampaignWizard.test.tsx` | 9 | CampaignWizard · renders dialog title · renders dialog description · renders Nome da Campanha label on step 1 … |
| `src/components/__tests__/CandidatoTimeline.test.tsx` | 9 | CandidatoTimeline · renders Spinner when loading · renders empty state when timeline is empty · renders Entrevista type label … |
| `src/components/__tests__/ColaboradorHistory.test.tsx` | 9 | ColaboradorHistory · renders Spinner when loading · renders Histórico de Alterações title · renders empty state message … |
| `src/components/__tests__/Container.test.tsx` | 9 | Container · renders children · renders as div by default · renders as custom element via as prop … |
| `src/components/__tests__/ContasBancariasTab.test.tsx` | 9 | ContasBancariasTab · shows spinner when loading · renders Contas Bancárias title · renders Adicionar button … |
| `src/components/__tests__/ContratoTokenTimelineDialog.test.tsx` | 9 | ContratoTokenTimelineDialog · renders Trilha de auditoria title · renders description · shows empty state when no events … |
| `src/components/__tests__/ContratosAssinaturaKPICard.test.tsx` | 9 | ContratosAssinaturaKPICard · renders Conversão de assinaturas title · shows skeleton when loading · renders Gerados label … |
| `src/components/__tests__/ContratosVencendoPanel.test.tsx` | 9 | ContratosVencendoPanel · renders Contratos vencendo title · renders CLT Art. 445 description · renders Vencidos KPI label … |
| `src/components/__tests__/DarfTab.test.tsx` | 9 | DarfTab · renders DARF title · renders IRRF label · renders PIS/COFINS label … |
| `src/components/__tests__/DashboardHeader.test.tsx` | 9 | DashboardHeader · renders greeting with wave emoji · renders subtitle text · renders Sincronizar button … |
| `src/components/__tests__/DesligamentoDetailSheet.test.tsx` | 9 | DesligamentoDetailSheet · returns null when desligamento is null · renders colaborador name · renders StatusBadge … |
| `src/components/__tests__/DetalhesAdmissaoDialog.test.tsx` | 9 | DetalhesAdmissaoDialog · returns null when admissao is null · renders colaborador name in dialog title · renders etapa badge … |
| `src/components/__tests__/DistribuirHoleritesButton.test.tsx` | 9 | DistribuirHoleritesButton · renders Distribuir em massa trigger button · renders dialog title with competencia · renders Portal do Colaborador channel option … |
| `src/components/__tests__/DocumentoPreview.test.tsx` | 9 | DocumentoPreview · renders null when documento is null · renders document name in title · renders Abrir Original button … |
| `src/components/__tests__/DocumentoTimeline.test.tsx` | 9 | DocumentoTimeline · shows loading state · shows empty state when no history · renders Histórico de Versões title … |
| `src/components/__tests__/DonutChart.test.tsx` | 9 | DonutChart · returns null when total is 0 · renders SVG with segments · renders total count in center text … |
| `src/components/__tests__/ESocialConciliacao.test.tsx` | 9 | ESocialConciliacao · renders Conciliação de Valores title · renders Total Sistema card · renders Total Governo card … |
| `src/components/__tests__/ESocialTabs.test.tsx` | 9 | ESocialLogsTab · renders Histórico de Transmissão Real title · shows empty state when no logs · shows log headers when logs exist … |
| `src/components/__tests__/EmpresaSelector.test.tsx` | 9 | EmpresaSelector · renders Nenhuma Empresa when no empresas · Nenhuma Empresa button is disabled · renders single empresa name when only one empresa … |
| `src/components/__tests__/EmpresaSwitcher.test.tsx` | 9 | EmpresaSwitcher · renders empresa name when in empresa_unica mode · renders CNPJ in secondary label · renders Grupo Consolidado when isConsolidado … |
| `src/components/__tests__/EmprestimosTable.test.tsx` | 9 | EmprestimosTable · shows empty state when no emprestimos · renders Colaborador header · renders Instituição header … |
| `src/components/__tests__/EpiKPIs.test.tsx` | 9 | EpiKPIs · renders Modelos EPI label · renders Itens em Estoque label · renders Conformes (CA) label … |
| `src/components/__tests__/EventTimeline.test.tsx` | 9 | EventTimeline · shows empty state when no events · renders event titles · renders event descriptions … |
| `src/components/__tests__/ExameFormDialog.test.tsx` | 9 | ExameFormDialog · renders trigger button with  · renders dialog content with title · renders all colaborador options in select … |
| `src/components/__tests__/FeriasActions.test.tsx` | 9 | FeriasActions · renders Aprovar (Gestor) button when not yet approved · renders Rejeitar button when not yet approved by gestor · renders Baixar button always … |
| `src/components/__tests__/FeriasAlertasPagamentoCard.test.tsx` | 9 | FeriasAlertasPagamentoCard · renders Pagamento de Férias title · renders Art. 145 CLT reference in title · shows empty state when no alerts … |
| `src/components/__tests__/FeriasAuditTimeline.test.tsx` | 9 | FeriasAuditTimeline · renders Tudo tab filter · renders Criação tab filter · renders Aprovação tab filter … |
| `src/components/__tests__/FeriasColetivasTab.test.tsx` | 9 | FeriasColetivasTab · renders card title Férias Coletivas · shows empty state when no coletivas · shows loading spinner when loading … |
| `src/components/__tests__/FeriasDashboard.test.tsx` | 9 | FeriasDashboard · renders Férias nos Últimos 6 Meses chart title · renders Distribuição por Status chart title · renders Próximos Colaboradores em Gozo section … |
| `src/components/__tests__/FeriasKPIs.test.tsx` | 9 | FeriasKPIs · renders Total label · renders Pendentes label · renders Aprovadas label … |
| `src/components/__tests__/FeriasRelatorioDialog.test.tsx` | 9 | FeriasRelatorioDialog · renders Relatório PDF trigger button · renders Gerar Relatório de Férias dialog title · renders Selecione o Período label … |
| `src/components/__tests__/FeriasSaldoReport.test.tsx` | 9 | FeriasSaldoReport · renders Saldo de Férias por Colaborador title · renders table header Colaborador · renders table header Dias Disponíveis … |
| `src/components/__tests__/FeriasTable.test.tsx` | 9 | FeriasTable · renders Colaborador header · renders Período header · renders Dias header … |
| `src/components/__tests__/FolhaAuditTimeline.test.tsx` | 9 | FolhaAuditTimeline · renders Trilha de Processamento section title · renders competencia in the title · shows empty state when no logs … |
| `src/components/__tests__/FolhaAuditoriaTable.test.tsx` | 9 | FolhaAuditoriaTable · renders filter input · renders Data/Hora column header · renders Severidade column header … |
| `src/components/__tests__/FolhaESocialSync.test.tsx` | 9 | FolhaESocialSync · renders Integração eSocial title · renders refresh button · renders Progresso Geral de Transmissão label … |
| `src/components/__tests__/FolhaKPIs.test.tsx` | 9 | FolhaKPIs · shows skeleton cards when loading · renders Colaboradores label · renders Total Bruto label … |
| `src/components/__tests__/FolhaValidationAlerts.test.tsx` | 9 | FolhaValidationAlerts · renders Audit Smart Validation title · renders score badge · does not claim eSocial S-1010 sync it never checked … |
| `src/components/__tests__/GerarAEJDialog.test.tsx` | 9 | GerarAEJDialog · renders Gerar AEJ trigger button · renders dialog title · renders dialog description … |
| `src/components/__tests__/GestaoPontoAnalytics.test.tsx` | 9 | GestaoPontoAnalytics · renders Painel de Gestão Estratégica title · renders subtitle text · renders IA Monitorando badge … |
| `src/components/__tests__/GuidedTour.test.tsx` | 9 | GuidedTour · renders nothing before 2s when localStorage empty · renders tour card after 2s on first visit · shows first step title Sidebar de Navegação … |
| `src/components/__tests__/HealthTrendCard.test.tsx` | 9 | HealthTrendCard · renders Saúde da bridge title · renders Status stat label · renders Latência stat label … |
| `src/components/__tests__/HistoricoContratosTab.test.tsx` | 9 | HistoricoContratosTab · shows loading state · renders Histórico de Contratos title · renders Nova Alteração button … |
| `src/components/__tests__/HistoricoSalarialTab.test.tsx` | 9 | HistoricoSalarialTab · shows spinner when loading · renders Histórico Salarial title · renders Nova Alteração button … |
| `src/components/__tests__/ImportarAFDTDialog.test.tsx` | 9 | ImportarAFDTDialog · renders Importar AFDT/ACJEF trigger button · renders dialog title · renders dialog description with Portaria MTP 671 … |
| `src/components/__tests__/LoginForm.test.tsx` | 9 | LoginForm · renders email and password fields · renders submit button · does not render forgot password button when handler not provided … |
| `src/components/__tests__/LogsIntegracoesTab.test.tsx` | 9 | LogsIntegracoesTab · shows spinner when loading · renders Logs de Integrações title · renders subtitle with record count … |
| `src/components/__tests__/MedidaWorkflowTimeline.test.tsx` | 9 | MedidaWorkflowTimeline · shows loading state when isLoading is true · shows empty state when no log entries · renders log entries when data is available … |
| `src/components/__tests__/MedidasKPIs.test.tsx` | 9 | MedidasKPIs · renders Total Registros label · renders Adv. Verbais label · renders Adv. Escritas label … |
| `src/components/__tests__/MedidasTable.test.tsx` | 9 | MedidasTable · renders table column header Colaborador · renders table column header Tipo · renders table column header Status … |
| `src/components/__tests__/MetricCard.test.tsx` | 9 | MetricCard · renders title · renders string value directly · renders AnimatedNumber when rawValue is provided … |
| `src/components/__tests__/MetricasFolhaDashboard.test.tsx` | 9 | MetricasFolhaDashboard · shows loading state · shows error state when query fails · renders Idempotência KPI when data is available … |
| `src/components/__tests__/MiniSparkline.test.tsx` | 9 | MiniSparkline · returns null when data has fewer than 2 points · returns null when data is empty · renders SVG when data has 2+ points … |
| `src/components/__tests__/NewAdvanceDialog.test.tsx` | 9 | NewAdvanceDialog · renders Novo Adiantamento trigger button · renders Solicitar Adiantamento Salarial title · renders Colaborador label … |
| `src/components/__tests__/NotificationBell.test.tsx` | 9 | NotificationBell · renders bell button with Notificações aria-label · renders Notificações heading in popover · renders empty state message … |
| `src/components/__tests__/NotificationCenter.test.tsx` | 9 | NotificationCenter · renders Notificações heading · shows empty state when no notifications · does not show empty state when notifications provided … |
| `src/components/__tests__/NotificationList.test.tsx` | 9 | NotificationList · renders Notificações heading · shows empty state when no notifications · does not show empty state when notifications provided … |
| `src/components/__tests__/NovaProgramacaoDialog.test.tsx` | 9 | NovaProgramacaoDialog · renders nothing when closed · renders dialog title when open · renders colaborador options … |
| `src/components/__tests__/NovoDepartamentoDialog.test.tsx` | 9 | NovoDepartamentoDialog · renders Novo Departamento title when no departamento prop · renders Editar Departamento title when departamento provided · renders description text … |
| `src/components/__tests__/NovoDesligamentoDialog.test.tsx` | 9 | NovoDesligamentoDialog · renders Novo Desligamento title · renders dialog description · renders Colaborador * label … |
| `src/components/__tests__/OnboardingDashboard.test.tsx` | 9 | OnboardingDashboard · renders Total Iniciadas KPI · renders Em Andamento KPI · renders Finalizadas KPI … |
| `src/components/__tests__/PagamentoBancarioWizard.test.tsx` | 9 | PagamentoBancarioWizard · renders Pagar Salários trigger button · trigger button disabled when no folhaId · renders Liquidação de Folha heading … |
| `src/components/__tests__/PageTitle.test.tsx` | 9 | PageTitle · sets document title with suffix · sets document title for Férias · sets document title for Folha de Pagamento … |
| `src/components/__tests__/PontoAdjustmentRequests.test.tsx` | 9 | PontoAdjustmentRequests · renders search input · renders Colaborador table header · renders Status table header … |
| `src/components/__tests__/PontoCharts.test.tsx` | 9 | PontoCharts · returns null when no registros data · renders Tendência Semanal card title when data provided · renders Horários de Entrada card title when data provided … |
| `src/components/__tests__/PontoGeoAnalytics.test.tsx` | 9 | PontoGeoAnalytics · returns null when batidas is empty · renders Distribuição Geográfica de Batidas title when data provided · renders compliance KPI section when data provided … |
| `src/components/__tests__/PontoStreakCard.test.tsx` | 9 | PontoStreakCard · renders Streak de Pontualidade title · renders PRO PLAYER badge · renders current streak value (0 when no data) … |
| `src/components/__tests__/PortalFinanceiroTab.test.tsx` | 9 | PortalFinanceiroTab · renders Meus Holerites section title · renders Meus Benefícios section title · shows empty holerites message … |
| `src/components/__tests__/PortalMeusDadosTab.test.tsx` | 9 | PortalMeusDadosTab · renders Dados Pessoais section title · renders Nome field with value · renders Email field with value … |
| `src/components/__tests__/PortalOverviewTab.test.tsx` | 9 | PortalOverviewTab · renders user name · renders user initials avatar · renders cargo and departamento … |
| `src/components/__tests__/QuickActionsGrid.test.tsx` | 9 | QuickActionsGrid · renders Ações Rápidas heading · renders Novo Colaborador action · renders Lançar Ponto action … |
| `src/components/__tests__/RelatorioContabilDialog.test.tsx` | 9 | RelatorioContabilDialog · renders Conciliação Contábil trigger button · renders dialog title · renders ERP import description … |
| `src/components/__tests__/RelatoriosAnalyticsTab.test.tsx` | 9 | RelatoriosAnalyticsTab · renders Colaboradores Ativos label · renders Custo Folha Mensal label · renders Desligamentos label … |
| `src/components/__tests__/RewardsApprovalHub.test.tsx` | 9 | RewardsApprovalHub · renders Aguardando Gestor stage · renders Em Revisão stage · renders Aguardando RH stage … |
| `src/components/__tests__/RewardsSimulator.test.tsx` | 9 | RewardsSimulator · renders Simulador de ROI title · renders subtitle text · renders Comparar Cenários button … |
| `src/components/__tests__/RubricasDialog.test.tsx` | 9 | RubricasDialog · renders Rubricas trigger button · renders Gestão de Rubricas dialog title · renders Nova Rubrica button … |
| `src/components/__tests__/SSTEPIsTab.test.tsx` | 9 | SSTEPIsTab · shows empty state when no EPIs · renders EPI nome when EPIs provided · renders EPI CA number … |
| `src/components/__tests__/SSTExamesTab.test.tsx` | 9 | SSTExamesTab · renders ASOs por Tipo chart title · renders ASOs por Departamento chart title · renders Colaborador table header … |
| `src/components/__tests__/SSTIncidentesTab.test.tsx` | 9 | SSTIncidentesTab · renders Acidentes Registrados KPI card · renders Incidentes este mês KPI card · renders Dias sem acidentes KPI card … |
| `src/components/__tests__/SSTKPIs.test.tsx` | 9 | SSTKPIs · renders ASOs Válidos KPI · renders Vencendo 30d KPI · renders Vencidos KPI … |
| `src/components/__tests__/SSTNRsTab.test.tsx` | 9 | SSTNRsTab · renders NR-6 EPI card · renders NR-7 PCMSO card · renders NR-9 PGR card … |
| `src/components/__tests__/SSTProgramasTab.test.tsx` | 9 | SSTProgramasTab · shows empty state when no programas · renders PGR sigla when programs provided · renders NR badge for PGR … |
| `src/components/__tests__/SSTRiscosTab.test.tsx` | 9 | SSTRiscosTab · renders Risco Físico category card · renders Risco Químico category card · renders Risco Biológico category card … |
| `src/components/__tests__/SectionHeader.test.tsx` | 9 | SectionHeader · renders title · renders subtitle when provided · does not render subtitle when absent … |
| `src/components/__tests__/SignaturePad.test.tsx` | 9 | SignaturePad · renders canvas element · shows  · renders Limpar button … |
| `src/components/__tests__/Simulador13Dialog.test.tsx` | 9 | Simulador13Dialog · renders 13º Salário trigger button · renders Simulador 13º Salário dialog title · renders Salário Base label … |
| `src/components/__tests__/SimuladorWhatIf.test.tsx` | 9 | SimuladorWhatIf · renders Simulador What-if trigger button · renders dialog title · renders Título da Simulação label … |
| … +242 linhas — lista completa em `context.json` | | |

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

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| true apenas em DEV | `capacitor.config.ts` |
| apenas para src/**. `lint:edge` roda com --max-warnings=0 sobre | `eslint.config.js` |
| separada); sem este override, ligar a regra globalmente reprovaria | `eslint.config.js` |
| VITE_DEV_PORT         — porta do Vite local (default 4173; deve coincidir | `playwright.config.ts` |
| Origin/Referer para o deployment Vercel canônico da allowlist (somente | `vite.config.ts` |
| P1-022: Babel-based plugin required for React Compiler | `vite.config.ts` |
| regra do time: só subir, nunca baixar (ratchet). | `vitest.config.ts` |
| Se ambos falharem retorna null → quem chamou deve handlear. | `public/sw-custom.js` |
| Gzipbomb-safe fetch wrapper: lê apenas os primeiros 4MB antes de entregar ao SW | `public/sw-custom.js` |
| cacheada — o SW apenas observa a resposta passar. | `public/sw-custom.js` |
| Clickjacking defense-in-depth: só quebra o frame em produção e apenas | `src/main.tsx` |
| Opção 2: Desconto Simplificado | `src/calculators/impostos.ts` |
| CLT Art. 477 §8°: multa de um salário mensal quando o empregador não quita as verbas rescisórias | `src/calculators/rescisao.ts` |
| no prazo legal (10 dias corridos para aviso prévio trabalhado; 1° dia útil para demissão imediata). | `src/calculators/rescisao.ts` |
| 'pending-challenge' = enrolled but aal1 session — must complete TOTP before access | `src/components/AdminRoute.tsx` |
| Must complete TOTP challenge — do NOT grant access until aal2 is reached. | `src/components/AdminRoute.tsx` |
| 'pending-challenge' = enrolled TOTP but session still at aal1 — TOTP required | `src/components/ProtectedRoute.tsx` |
| Enrolled TOTP but session is still at aal1 — must complete challenge. | `src/components/ProtectedRoute.tsx` |
| * Tokens semânticos apenas — cores de status ficam confinadas ao sparkline | `src/components/admin/HealthTrendCard.tsx` |
| Limite máximo de eventos por chamada (espelha o teto da RPC search_audit_unified). | `src/components/admin/UnifiedAuditSection.tsx` |
| 1. Validação de Tamanho | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| 2. Validação de Tipo MIME | `src/components/afastamentos/AfastamentoDocumentManager.tsx` |
| Atenção: Mesma doença (CID) em 60 dias soma-se para o limite de 15 dias. | `src/components/afastamentos/AfastamentoForm.tsx` |
| * Nenhuma lógica alterada — apenas movimentação estrutural. | `src/components/dashboard/analytics/widgets.tsx` |
| vencidas, saldo FGTS, pedido de demissão com desconto de aviso (art. 487 | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| §2º) e término de contrato a prazo (arts. 479/480). Antes o fluxo chamava | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| Com data_pagamento registrada, o motor aplica a multa do | `src/components/desligamentos/DesligamentoDetailSheet.tsx` |
| `desligamentos` (esse é o registro do caso/workflow) — são apenas | `src/components/desligamentos/NovoDesligamentoDialog.tsx` |
| Nenhuma lógica alterada — apenas movimentação estrutural. | `src/components/esocial/tabs.tsx` |
| * Exibe ao RH as férias com risco de descumprimento do prazo legal de | `src/components/ferias/FeriasAlertasPagamentoCard.tsx` |
| 100).toFixed(0)}% dos colaboradores estão optando pelo abono. Isso pode indicar necessidade de caixa extra no curto prazo para pagamentos.`, | `src/components/ferias/FeriasInsights.tsx` |
| Queries for validation | `src/components/folha/CalculoFolhaWizard.tsx` |
| 1. Validação Final de Rubricas | `src/components/folha/CalculoFolhaWizard.tsx` |
| Validação de Encargos | `src/components/folha/FolhaValidationAlerts.tsx` |
| * Lançamento manual de eventos variáveis (comissão, bônus, adicionais e | `src/components/folha/LancamentosDialog.tsx` |
| Lançamento de Desconto (D: Salários a Pagar, C: Conta de Passivo/Desconto) | `src/components/folha/RelatorioContabilDialog.tsx` |
| E50-37: checagem de forma só para feedback imediato — a validação | `src/components/integracoes/ConfigPanels.tsx` |
| RLS/permissão → some silenciosamente | `src/components/layout/AppSidebar.tsx` |
| Define as rotas raiz onde o botão não deve aparecer | `src/components/layout/BackButton.tsx` |
| * Tamanho máximo */ | `src/components/layout/Container.tsx` |
| Performance: usa apenas `transform` + `opacity` (GPU-accelerated) | `src/components/layout/PageTransition.tsx` |
| apenas o hash, portanto não há como recuperá-lo depois. Ao fechar o diálogo o | `src/components/medidas-disciplinares/GerarLinkCienciaDialog.tsx` |
| (upload + validação biométrica), não mais um timer decorativo até | `src/components/ponto/PontoClockRegister.tsx` |
| biometria — risco trabalhista), mas o resultado real da validação | `src/components/ponto/PontoClockRegister.tsx` |
| o cartão apenas não oferece a assinatura. | `src/components/portal/PortalRegimentoCard.tsx` |
| * A Edge Function gera somente JSON/CSV. O agendamento anterior gravava PDF | `src/components/relatorios/reportScheduleContract.ts` |
| recebe erro de permissão em vez de uma lista vazia, e o componente distingue | `src/components/seguranca/PolicyAuditPanel.tsx` |
| 1. Save sem conexão saída → erro de validação com highlight vermelho | `src/components/workflows/WorkflowDesigner.tsx` |
| 4. Limite de 50 nós → Canvas limitado para não degradar performance | `src/components/workflows/WorkflowDesigner.tsx` |
| Validation summary */} | `src/components/workflows/WorkflowDesigner.tsx` |
| * IMPORTANTE: Qualquer alteração nestes valores DEVE ser acompanhada de migração | `src/constants/workflow-status.ts` |
| H20: o cliente do produto usa a Edge para aplicar rate-limit e lockout | `src/contexts/AuthContext.tsx` |
| Check if MFA challenge is required (user enrolled TOTP → nextLevel = aal2) | `src/contexts/AuthContext.tsx` |
| Inicia apenas se o toque for próximo à borda esquerda (UX padrão) | `src/hooks/useBackGesture.ts` |
| dentro de `filters`) e dentro de `filters` apenas quando definido. | `src/hooks/useBeneficios.ts` |
| * IMPORTANTE — este hook é deliberadamente **apenas cosmético**. O bloqueio | `src/hooks/useBruteForceProtection.ts` |
| conhecendo apenas o e-mail da vítima, qualquer pessoa podia chamar a RPC | `src/hooks/useBruteForceProtection.ts` |
| * O contador em sessionStorage sobrevive apenas para evitar rajadas na própria | `src/hooks/useBruteForceProtection.ts` |
| * Registra a falha apenas no estado local da aba. O servidor já registrou a | `src/hooks/useBruteForceProtection.ts` |
| Falha de conciliação não deve derrubar o portal inteiro: a pessoa | `src/hooks/useColaboradorVinculo.ts` |
| segue lendo conteúdo, apenas sem as ações que exigem cadastro. | `src/hooks/useColaboradorVinculo.ts` |
| dentro de `filters`) e dentro de `filters` apenas quando definido (o | `src/hooks/useDesligamentos.ts` |
| ').order('created_at', { ascending: false }).limit(500); | `src/hooks/useDocumentos.ts` |
| Sincroniza o ID no store apenas se houver uma empresa disponível e NENHUMA seleção ativa | `src/hooks/useEmpresas.ts` |
| The generic bridge must authorize tenant writes before Postgres | `src/hooks/useEmpresas.ts` |
| * false apenas para services sem isolamento por empresa (ex.: EmpresaService, | `src/hooks/useGenericCrud.ts` |
| Sem permissão (RLS) ou erro de schema durante migração — degradar sem quebrar UI. | `src/hooks/useGrupo.ts` |
| Inicializa valor apenas no mount | `src/hooks/useMediaQuery.ts` |
| * useOnMount: Hook para efeitos que devem executar apenas no mount | `src/hooks/useMountEffects.ts` |
| Verifica se já está instalado apenas no mount | `src/hooks/usePWA.ts` |
| 1. Validation Errors (422) | `src/hooks/useServerValidation.ts` |
| Only attempt if authenticated AND has empresaAtual (empresaId required by metricas) | `src/hooks/useSystemHealth.ts` |
| dentro de `filters`) e dentro de `filters` apenas quando definido. | `src/hooks/useWebhooksAvancados.ts` |
| Funções utilitárias para validação de formulários | `src/hooks/validators.ts` |
| Validação simplificada | `src/hooks/validators.ts` |
| junto às férias, respeitando prazo legal (até 31/jan do ano do gozo) | `src/hooks/ferias/useAdiantamento13.ts` |
| ok \| atencao (≤5d) \| critico (≤2d, prazo Art. 145) \| violacao_grave (já iniciada) | `src/hooks/ferias/useAlertasPagamentoD2.ts` |
| confirmação, a férias não pode transitar para `em_gozo` — fecha o gap | `src/hooks/ferias/useAlertasPagamentoD2.ts` |
| Usar SOMENTE em casos especiais: auth, Storage, Realtime ou quando o RLS | `src/integrations/supabase/client.base.ts` |
| sua leitura deve passar pelas RPCs tenant-scoped. Para o CRUD normal, usar `supabase` de | `src/integrations/supabase/client.base.ts` |
| onde o proxy de bridge não deve mediar (Auth, Storage e Realtime). | `src/integrations/supabase/client.ts` |
| Backoff: 1s → 5s → 25s. Máximo 3 tentativas. | `src/integrations/supabase/client.ts` |
| limit?: number, | `src/integrations/supabase/client.ts` |
| (o cliente que gerou a key deve evitar reuse). Fail fast. | `src/integrations/supabase/client.ts` |
| Apenas propagamos o erro para quem chamou tratar (ou ignorar). | `src/integrations/supabase/client.ts` |
| Validação: deve ter exatamente 3 partes | `src/lib/cursor.ts` |
| Validação: column não pode ter caracteres especiais (SQL injection prevention) | `src/lib/cursor.ts` |
| Validação: direction deve ser after ou before | `src/lib/cursor.ts` |
| Substitui page * limit em queries grandes | `src/lib/cursor.ts` |
| - 429 (rate limit): respeita Retry-After header | `src/lib/retry.ts` |
| * Função a executar. Deve ser idempotente se idempotencyKey for fornecida. */ | `src/lib/retry.ts` |
| * Máximo de tentativas (default: 4). */ | `src/lib/retry.ts` |
| * Backoff máximo em ms (default: 8000). */ | `src/lib/retry.ts` |
| ', { count: 'exact', head: true }).limit(1); | `src/pages/AdminDiagnosticoMigracaoPage.tsx` |
| ').order('created_at', { ascending: false }).limit(200); | `src/pages/AdminSecurityPage.tsx` |
| ").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(500); | `src/pages/AdminTelemetriaPage.tsx` |
| (evidência legal não pode depender de valor forjável). | `src/pages/AssinarContratoPage.tsx` |
| P5-081: validação client-side antes de enviar | `src/pages/AssistenteIAPage.tsx` |
| exigida: a validação ocorre inteiramente no servidor, via RPCs `SECURITY | `src/pages/CienciaMedidaPage.tsx` |
| DEFINER` que resolvem o token pelo hash e aplicam limite de tentativas. | `src/pages/CienciaMedidaPage.tsx` |
| O token é 32 bytes em hex: descarta lixo antes de gastar rate limit. | `src/pages/CienciaMedidaPage.tsx` |
| Erro de negócio: o servidor responde 200 com success=false. | `src/pages/CienciaMedidaPage.tsx` |
| limit + 1}</span> a{' '} | `src/pages/FeriasPage.tsx` |
| limit, totalCount)}</span> de{' '} | `src/pages/FeriasPage.tsx` |
| limit >= totalCount} | `src/pages/FeriasPage.tsx` |
| limit >= totalCount} | `src/pages/FeriasPage.tsx` |
| * Resumo de folha usado apenas para seleção/exibição */ | `src/pages/FinanceiroBancarioPage.tsx` |
| - validação client-side do `integrity_hash` (badge de conformidade) | `src/pages/FolhaCompliancePage.tsx` |
| O limite autoritativo é aplicado pelo endpoint de Auth. A antiga RPC | `src/pages/LoginPage.tsx` |
| E-035/E50-33: ponto geográfico fixo de fallback (usado somente quando o | `src/pages/PontoKioskPage.tsx` |
| do PontoPage). Fallback para o ponto fixo apenas se o GPS estiver | `src/pages/PontoKioskPage.tsx` |
| indisponível ou a permissão for negada — origem sempre registrada. | `src/pages/PontoKioskPage.tsx` |
| Validação biométrica real (achado da auditoria: o frontend nunca | `src/pages/PontoPage.tsx` |
| é apenas reportado honestamente ao usuário e gravado na batida. | `src/pages/PontoPage.tsx` |
| exibir totais de terceiros para quem abrisse o portal, dependendo apenas do | `src/pages/PortalPage.tsx` |
| Consultas que dependem apenas do login. | `src/pages/PortalPage.tsx` |
| Rate-limit server-side pelo IP real da conexão (rightmost XFF do | `src/pages/VerificarContratoPage.tsx` |
| * Validação defensiva na fronteira dos services: valida somente os campos | `src/schemas/validate.ts` |
| * Validação estrutural genérica para QUALQUER escrita, mesmo sem schema de | `src/schemas/validate.ts` |
| * Helpers de validação eSocial | `src/schemas/esocial/helpers.ts` |
| `required` (erro), enquanto campos novos são validados de forma CONDICIONAL — | `src/schemas/esocial/naoPeriodicosValidators.ts` |
| Apenas eventos não periódicos e periódicos podem ser excluídos via S-3000. | `src/schemas/esocial/naoPeriodicosValidators.ts` |
| - perApur não pode ser futuro | `src/schemas/esocial/periodicosValidators.ts` |
| - novaValid deve ser >= perApur | `src/schemas/esocial/periodicosValidators.ts` |
| Deve ser enviado APÓS todos os eventos periódicos da competência. | `src/schemas/esocial/periodicosValidators.ts` |
| - perApur não pode ser futuro | `src/schemas/esocial/periodicosValidators.ts` |
| - dateFecha deve ser <= data atual | `src/schemas/esocial/periodicosValidators.ts` |
| Lógica: se base > 0, deve haver retenção (IRRF > 0) | `src/schemas/esocial/periodicosValidators.ts` |
| Dedução não pode exceder base | `src/schemas/esocial/periodicosValidators.ts` |
| payload foram substituídos por validação conforme o Manual do eSocial | `src/schemas/esocial/periodicosValidators.ts` |
| validação: dá falsa garantia de conformidade antes da transmissão. | `src/schemas/esocial/periodicosValidators.ts` |
| indCoop aceita apenas 0..4; indConstr/indDesFolha/indOptRegEletron só 0 ou 1 | `src/schemas/esocial/periodicosValidators.ts` |
| FAP é opcional, mas quando informado deve estar entre 0,5000 e 2,0000 | `src/schemas/esocial/periodicosValidators.ts` |
| tpRubr: 1=vencimento, 2=desconto, 3=informativa, 4=informativa dedutora | `src/schemas/esocial/periodicosValidators.ts` |
| * Validação de Rubricas vs Tabela de Referência do eSocial | `src/schemas/esocial/rubricaValidator.ts` |
| Validação contra rubricas padrão (se o código for um dos conhecidos) | `src/schemas/esocial/rubricaValidator.ts` |
| Regra de compatibilidade: campos historicamente obrigatórios seguem como erro; | `src/schemas/esocial/sstValidators.ts` |
| Prazo legal: até o 1º dia útil seguinte ao acidente; imediato em caso de óbito | `src/schemas/esocial/sstValidators.ts` |
| Acidente não pode ter ocorrido no futuro. | `src/schemas/esocial/sstValidators.ts` |
| Prazo de comunicação: alerta quando o registro passa de 1 dia útil. | `src/schemas/esocial/sstValidators.ts` |
| Avaliação quantitativa exige intensidade/concentração e limite de tolerância. | `src/schemas/esocial/sstValidators.ts` |
| Etapa terminal é fim de linha: cancelada não pode ser reaberta/concluída. | `src/services/admissaoService.ts` |
| 30s — tempo máximo de resposta da IA | `src/services/assistenteIAService.ts` |
| Máximo de mensagens no histórico | `src/services/assistenteIAService.ts` |
| Auditoria não pode quebrar a operação de negócio, mas precisa ser observável. | `src/services/auditoriaService.ts` |
| este limite. Backups maiores devem usar o fluxo server-side auditável. | `src/services/backupService.ts` |
| dia) não pode ser gravado como período porque sugeriria fechamento | `src/services/batidasPontoService.ts` |
| * Calcula o custo de VT considerando o limite de 6% do salário base (Lei 7.418/85) | `src/services/calculoBeneficiosService.ts` |
| * Monta uma string de tamanho fixo com padding e validação. | `src/services/cnabService.ts` |
| * Validação de dígito verificador (módulo 11) usado por bancos brasileiros. | `src/services/cnabService.ts` |
| * Validação de CPF: módulo 11 com dígitos verificadores. | `src/services/cnabService.ts` |
| A falha de recuperação não deve ocultar a causa da transmissão. | `src/services/contratacaoService.ts` |
| derruba TODAS as chamadas no browser. Correlação, se necessária, deve ir no body. | `src/services/edgeFunctionsService.ts` |
| Chave por CLIQUE: um novo processamento deliberado deve reapurar (novas | `src/services/edgeFunctionsService.ts` |
| * Verifica rate limit */ | `src/services/edgeFunctionsService.ts` |
| validação de CPF/CNPJ, mascaramento para exibição e sanitização para logs. | `src/services/encryptionService.ts` |
| // Criptografia/decriptografia de PII deve ocorrer exclusivamente no servidor | `src/services/encryptionService.ts` |
| // Este módulo mantém apenas utilidades puras e seguras para o cliente: | `src/services/encryptionService.ts` |
| validação, mascaramento e sanitização para logs. | `src/services/encryptionService.ts` |
| VALIDAÇÃO DE CPF/CNPJ (ANTES DE CRIPTOGRAFAR) | `src/services/encryptionService.ts` |
| Validação dos dígitos verificadores | `src/services/encryptionService.ts` |
| Validação básica de dígitos verificadores | `src/services/encryptionService.ts` |
| ').order('created_at', { ascending: false }).limit(50); | `src/services/esocialService.ts` |
| Indicador operacional: somente recibos persistidos como `enviado` | `src/services/esocialService.ts` |
| Best-effort: falha na engine não pode derrubar a solicitação já criada. | `src/services/feriasService.ts` |
| @param params.limit - Quantidade de registros por página (default: 20) | `src/services/feriasService.ts` |
| rejeitado pelo banco. Aqui apenas lemos de volta o selo emitido. | `src/services/folhaPagamentoService.ts` |
| `VERSION_CONFLICT` e o erro é propagado — a UI deve recarregar e reexibir | `src/services/folhaPagamentoService.ts` |
| ').order('competencia', { ascending: false }).limit(500); | `src/services/folhaService.ts` |
| Levels that must flush immediately (no buffering delay). | `src/services/loggerService.ts` |
| * Redacts values that must never cross the browser, console, or audit RPC boundary. */ | `src/services/loggerService.ts` |
| o processo com uma unhandled rejection — ele é infraestrutura, não regra. | `src/services/loggerService.ts` |
| * Aplica os efeitos da medida (desconto/suspensão) na folha e no ponto. */ | `src/services/medidasDisciplinaresService.ts` |
| permissão interna. O front apenas orquestra — nunca recalcula faixa salarial. | `src/services/pcsService.ts` |
| * Limite defensivo — nenhuma listagem do módulo deve varrer a tabela inteira. */ | `src/services/pcsService.ts` |
| `auth.uid()` no servidor; o navegador não pode forjar `user_id`. A view | `src/services/piiAccessLogService.ts` |
| - Observabilidade NUNCA derruba a operação de negócio (erro → silêncio). | `src/services/piiAccessLogService.ts` |
| trilha é infraestrutura de auditoria: falha de rede/RLS não pode | `src/services/piiAccessLogService.ts` |
| Armazenar foto no IndexedDB se existir (sem limite prático de tamanho) | `src/services/pontoOfflineService.ts` |
| Se houver erros específicos de registros, mantemos apenas os que falharam na fila | `src/services/pontoOfflineService.ts` |
| Limpar fotos apenas dos itens sincronizados | `src/services/pontoOfflineService.ts` |
| Request permission | `src/services/pushNotificationService.ts` |
| Ordem lógica das etapas para validação | `src/services/rescisaoService.ts` |
| (INSS/IRRF, arts. 479/480, desconto do aviso, multa 477, saldo devedor); | `src/services/rescisaoService.ts` |
| na UI e escondem a regra de negócio violada no servidor. | `src/services/rescisaoService.ts` |
| Edge `pagar-desligamento` (CSRF + RH na empresa + rate limit) chama a | `src/services/rescisaoService.ts` |
| Cadastros → eventos (mesma regra da edge calcular-folha): | `src/services/folha/calculoLoteService.ts` |
| ').order('created_at', { ascending: false }).limit(100); | `src/services/tabelas/adminService.ts` |
| ').limit(1).maybeSingle(); | `src/services/tabelas/adminService.ts` |
| ').limit(limit); | `src/services/tabelas/viewsService.ts` |
| por isso precisa de validação em runtime antes do uso. | `src/types/pcs.ts` |
| * Contrato estrutural mínimo do query builder do PostgREST usado pelo | `src/types/queryBuilder.ts` |
| a validação de fato acontece no banco (RLS) e nos schemas Zod. | `src/types/uiRecord.ts` |
| * Regra: NÃO usar `UiRecord` em serviços, payloads de escrita ou cálculos. | `src/types/uiRecord.ts` |
| Apenas em estado local de apresentação. | `src/types/uiRecord.ts` |
| Abono pecuniário no máximo 10 dias | `src/utils/calculoFerias.ts` |
| * O empregador deve comunicar, com antecedência mínima de 15 dias: | `src/utils/comunicadoFeriasColetivasPDF.ts` |
| (WHERE id > last_id ORDER BY id LIMIT N) mantém performance constante. | `src/utils/cursorPagination.ts` |
| Retorna null em caso de cursor malformado — o caller deve descartar | `src/utils/cursorPagination.ts` |
| * Determinístico e sem dependências — usa apenas os getters locais nativos. | `src/utils/dateLocal.ts` |
| "NaN-NaN-NaN" que passaria pela validação de tipo mas quebraria o banco. | `src/utils/dateLocal.ts` |
| bytes com as assinaturas conhecidas. Qualquer upload do app deve passar | `src/utils/fileSignature.ts` |
| por esta validação antes de ir ao storage. | `src/utils/fileSignature.ts` |
| então aceitamos apenas o primeiro byte 0x30 como sanity check. | `src/utils/fileSignature.ts` |
| Deduções adicionais da base legal do IRRF que NÃO viram linha de desconto | `src/utils/folhaCalc.ts` |
| papéis (decisão de produto) — o export deve carregar a mesma visão da tela. | `src/utils/piiMask.ts` |
| estruturas cíclicas usa WeakSet — não há limite de profundidade, então | `src/utils/piiMask.ts` |
| manualmente — edge não pode importar de src/). | `src/utils/rescisaoCalc.ts` |
| (somente o período efetivamente indenizado: 100% sem justa causa, | `src/utils/rescisaoCalc.ts` |
| - Art. 479/480 CLT: término antecipado de contrato a prazo (indenização de | `src/utils/rescisaoCalc.ts` |
| 50% dos dias restantes — provento para o empregado ou desconto a favor | `src/utils/rescisaoCalc.ts` |
| - Art. 484-A: aviso 50%, multa FGTS 20%, saque FGTS limitado a 80% e | `src/utils/rescisaoCalc.ts` |
| multa FGTS 20%. | `src/utils/rescisaoCalc.ts` |
| adiciona multa de 1 salário ao resultado. | `src/utils/rescisaoCalc.ts` |
| - Multa FGTS NÃO integra o total líquido do empregado: é depósito na | `src/utils/rescisaoCalc.ts` |
| Considera a regra da CLT: fração igual ou superior a 15 dias conta como mês integral. | `src/utils/rescisaoCalc.ts` |
| * Anos completos de serviço pela regra do aniversário (Lei 12.506/2011: | `src/utils/rescisaoCalc.ts` |
| * Contrato a prazo/experiência: data prevista de fim do contrato. | `src/utils/rescisaoCalc.ts` |
| * Quem antecipa o contrato a prazo: 'empregador' (art. 479, provento), | `src/utils/rescisaoCalc.ts` |
| 'empregado' (art. 480, desconto) ou 'natural' (fim do prazo, sem indenização). */ | `src/utils/rescisaoCalc.ts` |
| corridos aplica a multa de 1 salário (art. 477 §8º CLT). */ | `src/utils/rescisaoCalc.ts` |
| FAIXAS_SEGURO_DESEMPREGO_2026, mínimo = salário mínimo 2026). | `src/utils/rescisaoCalc.ts` |
| persistidos (indenizações 479/480, desconto de aviso, multa 477 e | `src/utils/rescisaoPDF.ts` |
| Audit metadata enriches the PDF but is not required to generate an | `src/utils/rescisaoPDF.ts` |
| Permits inline `style` (required by the PDF-mirroring template) but still | `src/utils/sanitizeHtml.ts` |
| Not strictly required by React (which escapes by default), but useful for | `src/utils/sanitizeHtml.ts` |
| apenas objetos simples recebem protótipo nulo. | `src/utils/secureJson.ts` |
| `Object.keys` lista apenas propriedades próprias e enumeráveis — exatamente | `src/utils/secureJson.ts` |
| Busca rubricas da empresa para validação de eSocial | `src/utils/folha/validadorFolha.ts` |
| 2. Regras de validação | `src/utils/folha/validadorFolha.ts` |
| Regra 1: Líquido negativo ou zero | `src/utils/folha/validadorFolha.ts` |
| Regra 2: Descontos > 30% do bruto (limite prudencial para empréstimos/retenções) | `src/utils/folha/validadorFolha.ts` |
| Nota: O limite legal de descontos totais é maior, mas 70% é um alerta de erro crítico | `src/utils/folha/validadorFolha.ts` |
| Regra 3: Variação contra Salário Base | `src/utils/folha/validadorFolha.ts` |
| Regra 4: Validação de Rubricas do Cálculo vs Rubricas do eSocial | `src/utils/folha/validadorFolha.ts` |
| Regra 5: Validação de Salário Mínimo (2026) | `src/utils/folha/validadorFolha.ts` |
| Regra 6: Alerta de IRRF Retido sem Dependente (Verificação de otimização fiscal) | `src/utils/folha/validadorFolha.ts` |
| Regra 7: Verificação de Salário Base Zero | `src/utils/folha/validadorFolha.ts` |
| Regra 8: Verificação de Rubricas sem Incidência (Auditável eSocial) | `src/utils/folha/validadorFolha.ts` |
| * Checar apenas o primeiro deixa qualquer colaborador autenticado ler folha, | `supabase/functions/_shared/authz.ts` |
| pré-requisito de acesso, nunca permissão de acesso. | `supabase/functions/_shared/authz.ts` |
| * Apenas vínculo com a empresa. NÃO é autorização — veja o cabeçalho. */ | `supabase/functions/_shared/authz.ts` |
| "sem permissão" permitiria enumerar empresas e papéis por tentativa. | `supabase/functions/_shared/authz.ts` |
| Loader é chamado no máximo 1x por key TTL window. | `supabase/functions/_shared/cache.ts` |
| compartilhado no rate limit — fail-closed, não bypass). | `supabase/functions/_shared/clientIp.ts` |
| Use para chaves de rate limit e campos de auditoria (ip_address, | `supabase/functions/_shared/clientIp.ts` |
| apenas se o Origin for permitido; caso contrário 403. | `supabase/functions/_shared/contract.ts` |
| faria a resposta 413 esperar indefinidamente. O limite já foi | `supabase/functions/_shared/contract.ts` |
| business mutation failed. Re-executing it can duplicate payroll/CNAB | `supabase/functions/_shared/idempotency.ts` |
| válido nos dois formatos ('2026-13' não pode cair na tabela de 2026). | `supabase/functions/_shared/inss.ts` |
| Cada chamada é síncrona e lock-free; performance overhead é mínimo. | `supabase/functions/_shared/logger.ts` |
| Helper de rate limit atômico para edge functions sensíveis. | `supabase/functions/_shared/rateLimit.ts` |
| const rl = await checkRateLimit(admin, { key: `esocial:${userId}`, limit: 30, windowSec: 60 }); | `supabase/functions/_shared/rateLimit.ts` |
| Deve incluir namespacing (ex: `esocial:<userId>`) | `supabase/functions/_shared/rateLimit.ts` |
| DB deixe todos os endpoints sem proteção (fail-closed com limite reduzido). | `supabase/functions/_shared/rateLimit.ts` |
| usa 50% do limite normal em modo degradado | `supabase/functions/_shared/rateLimit.ts` |
| Reserve this first. A request rejected for a full burst must not consume | `supabase/functions/_shared/rateLimit.ts` |
| endpoint configurado que redireciona para host externo não pode capturar | `supabase/functions/_shared/safe-fetch.ts` |
| - govbr:        10s   (OAuth deve ser rápido) | `supabase/functions/_shared/safe-fetch.ts` |
| - whatsapp:      8s   (webhook interno, deve ser rápido) | `supabase/functions/_shared/safe-fetch.ts` |
| 1. OpenAI rate limit (429) → retry com backoff | `supabase/functions/_shared/safe-fetch.ts` |
| fields to Sentry: they may contain PII. Callers must opt in via `extra`. | `supabase/functions/_shared/sentry.ts` |
| Deno não pode importar diretamente do src/ (formato diferente de módulo). | `supabase/functions/_shared/schemas/common.ts` |
| Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`) | `supabase/functions/adiantamento-salarial/index.ts` |
| era um OU — pertencer à empresa já bastava, e o is_admin apenas somava | `supabase/functions/adiantamento-salarial/index.ts` |
| Percentual máximo (fallback 40%) | `supabase/functions/adiantamento-salarial/index.ts` |
| * Alertas persistidos no produto não substituem um e-mail solicitado. Apenas | `supabase/functions/alertas-dp/deliveryStatus.ts` |
| Rate limit: 5 req/min por usuário. | `supabase/functions/alertas-dp/index.ts` |
| sem recibo Resend deve ser não-2xx para que o caller não exiba sucesso. | `supabase/functions/alertas-dp/index.ts` |
| O provedor externo recebe somente pseudônimos. Nome, UUID e | `supabase/functions/alertas-preditivos/index.ts` |
| Rate limit por IP — endpoints públicos (assinar/verificar) precisam de proteção | `supabase/functions/assinaturaDigital/index.ts` |
| Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`) | `supabase/functions/auditoria/index.ts` |
| era um OU — pertencer à empresa já bastava, e o is_admin apenas somava | `supabase/functions/auditoria/index.ts` |
| Rate limit: 5 tentativas/min por usuário ou por IP (fluxo anônimo). | `supabase/functions/auth-gov-br/index.ts` |
| 1. IP-level rate limit (30 req / 5 min) via _shared/rateLimit — anonymous | `supabase/functions/auth-login/index.ts` |
| 1. IP-level rate limit — anonymous, no auth required. | `supabase/functions/auth-login/index.ts` |
| 3. Per-email rate limit — more granular than IP (catches credential stuffing). | `supabase/functions/auth-login/index.ts` |
| Runtime validation for the service-role RPC consumed before password auth. | `supabase/functions/auth-login/lockoutContract.ts` |
| A malformed or absent response must never turn into a lockout bypass. | `supabase/functions/auth-login/lockoutContract.ts` |
| é seguro para expor ao caller; os detalhes do PostgREST ficam somente no | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| * O PostgREST devolve a contagem total mesmo com limit(). Só aceitamos a | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| chamada com limit(). `fetchPage` recebe o cursor da última página (null | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| na primeira) e deve devolver a página seguinte já ordenada por `id`. | `supabase/functions/backup-automatico/backupSnapshot.ts` |
| 3) Validação | `supabase/functions/backup-automatico/index.ts` |
| tabela, em vez de um único limit() que fazia tudo acima do cap | `supabase/functions/backup-automatico/index.ts` |
| - TTL clamp [5s, 15min] e limite de payload | `supabase/functions/cache/index.ts` |
| select whitelist simples — apenas identificadores/wildcards/vírgulas | `supabase/functions/cache/index.ts` |
| Desconto simplificado R$564,80 = 56_480 centavos (Art. 1°, Lei 13.149/2015) | `supabase/functions/calcular-13-salario/index.ts` |
| Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`) | `supabase/functions/calcular-13-salario/index.ts` |
| era um OU — pertencer à empresa já bastava, e o is_admin apenas somava | `supabase/functions/calcular-13-salario/index.ts` |
| Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`) | `supabase/functions/calcular-ferias/index.ts` |
| era um OU — pertencer à empresa já bastava, e o is_admin apenas somava | `supabase/functions/calcular-ferias/index.ts` |
| Rate limit — cálculo de folha é pesado: 20 req / min / usuário | `supabase/functions/calcular-folha/index.ts` |
| Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`) | `supabase/functions/calcular-folha/index.ts` |
| era um OU — pertencer à empresa já bastava, e o is_admin apenas somava | `supabase/functions/calcular-folha/index.ts` |
| Benefícios ativos (VT / coparticipação) — mesma regra do lote do | `supabase/functions/calcular-folha/index.ts` |
| Eventos variáveis lançados (comissão, bônus, adicionais por | `supabase/functions/calcular-folha/index.ts` |
| Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`) | `supabase/functions/calcular-provisoes/index.ts` |
| era um OU — pertencer à empresa já bastava, e o is_admin apenas somava | `supabase/functions/calcular-provisoes/index.ts` |
| • Validação Zod estrita de payload (datas, tipos, ranges) | `supabase/functions/calcular-rescisao/index.ts` |
| … +179 linhas — lista completa em `context.json` | |
