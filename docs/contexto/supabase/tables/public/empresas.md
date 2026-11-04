# public.empresas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.vw_colaboradores_completo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `cnpj` | `text` | sim |  |  |  |
| 3 | `razao_social` | `text` | não |  |  |  |
| 4 | `nome_fantasia` | `text` | sim |  |  |  |
| 5 | `inscricao_estadual` | `text` | sim |  |  |  |
| 6 | `inscricao_municipal` | `text` | sim |  |  |  |
| 7 | `cep` | `text` | sim |  |  |  |
| 8 | `logradouro` | `text` | sim |  |  |  |
| 9 | `numero` | `text` | sim |  |  |  |
| 10 | `complemento` | `text` | sim |  |  |  |
| 11 | `bairro` | `text` | sim |  |  |  |
| 12 | `cidade` | `text` | sim |  |  |  |
| 13 | `uf` | `text` | sim |  |  |  |
| 14 | `telefone` | `text` | sim |  |  |  |
| 15 | `email` | `text` | sim |  |  |  |
| 16 | `logo_url` | `text` | sim |  |  |  |
| 17 | `ativa` | `boolean` | sim | `true` |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `regime_tributario` | `regime_tributario` | não | `'lucro_real'::regime_tributario` |  |  |
| 21 | `aliquota_simples` | `numeric(5,2)` | sim |  |  |  |
| 22 | `fap` | `numeric(5,4)` | não | `1` |  |  |
| 23 | `rat` | `numeric(5,4)` | não | `0.02` |  |  |
| 24 | `terceiros` | `numeric(5,4)` | não | `0.058` |  |  |
| 25 | `cor_identificacao` | `text` | sim | `'#3b82f6'::text` |  |  |
| 26 | `ordem_exibicao` | `integer` | sim | `0` |  |  |
| 27 | `simples_anexo` | `text` | sim |  |  | Anexo tributário vigente; obrigatório no cálculo quando regime=simples_nacional e não houver alíquota efetiva. |
| 28 | `aliquota_encargos_folha` | `numeric` | sim |  |  | Alíquota efetiva empresarial revisada (fração 0..1), usada como override explícito nas provisões. |
| 29 | `exigir_pin_quiosque` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| empresas_cnpj_key | UNIQUE | `UNIQUE (cnpj)` |  |  | sim |
| empresas_encargos_folha_fraction_check | CHECK | `CHECK (aliquota_encargos_folha IS NULL OR aliquota_encargos_folha >= 0::numeric AND aliquota_encargos_folha <= 1::numeric)` |  |  | sim |
| empresas_fap_multiplier_check | CHECK | `CHECK (fap >= 0::numeric AND fap <= 2::numeric)` |  |  | sim |
| empresas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| empresas_rat_fraction_check | CHECK | `CHECK (rat >= 0::numeric AND rat <= 0.03)` |  |  | sim |
| empresas_simples_anexo_check | CHECK | `CHECK (simples_anexo IS NULL OR (simples_anexo = ANY (ARRAY['I'::text, 'II'::text, 'III'::text, 'IV'::text, 'V'::text])))` |  |  | sim |
| empresas_terceiros_fraction_check | CHECK | `CHECK (terceiros >= 0::numeric AND terceiros <= 0.2)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.adiantamentos_salariais | adiantamentos_salariais_empresa_id_fkey | empresa_id | CASCADE |
| public.admissoes | admissoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.aej_geracoes | aej_geracoes_empresa_id_fkey | empresa_id | CASCADE |
| public.afastamentos | afastamentos_empresa_id_fkey | empresa_id | NO ACTION |
| public.afd_geracoes | afd_geracoes_empresa_id_fkey | empresa_id | CASCADE |
| public.asos | asos_empresa_id_fkey | empresa_id | NO ACTION |
| public.audit_logs | audit_logs_empresa_id_fkey | empresa_id | CASCADE |
| public.auditoria_logs | auditoria_logs_empresa_id_fkey | empresa_id | CASCADE |
| public.banco_horas | banco_horas_empresa_id_fkey | empresa_id | NO ACTION |
| public.banco_horas_config | banco_horas_config_empresa_id_fkey | empresa_id | NO ACTION |
| public.batidas_ponto | batidas_ponto_empresa_id_fkey | empresa_id | NO ACTION |
| public.beneficio_arquivos | beneficio_arquivos_empresa_id_fkey | empresa_id | CASCADE |
| public.beneficio_regras_elegibilidade | beneficio_regras_elegibilidade_empresa_id_fkey | empresa_id | CASCADE |
| public.beneficios | beneficios_empresa_id_fkey | empresa_id | NO ACTION |
| public.campos_customizados | campos_customizados_empresa_id_fkey | empresa_id | NO ACTION |
| public.canal_etica | canal_etica_empresa_id_fkey | empresa_id | NO ACTION |
| public.candidatos | candidatos_empresa_id_fkey | empresa_id | CASCADE |
| public.candidaturas | candidaturas_empresa_id_fkey | empresa_id | CASCADE |
| public.cargos | cargos_empresa_id_fkey | empresa_id | NO ACTION |
| public.catalogo_cursos | catalogo_cursos_empresa_id_fkey | empresa_id | NO ACTION |
| public.catalogo_infracoes | catalogo_infracoes_empresa_id_fkey | empresa_id | CASCADE |
| public.centros_custo | centros_custo_empresa_id_fkey | empresa_id | CASCADE |
| public.certificados_digitais | certificados_digitais_empresa_id_fkey | empresa_id | CASCADE |
| public.ciclos_avaliacao | ciclos_avaliacao_empresa_id_fkey | empresa_id | NO ACTION |
| public.cnab_configuracoes | cnab_configuracoes_empresa_id_fkey | empresa_id | CASCADE |
| public.cnab_remessas | cnab_remessas_empresa_id_fkey | empresa_id | CASCADE |
| public.colaborador_beneficios | colaborador_beneficios_empresa_id_fkey | empresa_id | NO ACTION |
| public.colaboradores | colaboradores_empresa_id_fkey | empresa_id | NO ACTION |
| public.competencias_config | competencias_config_empresa_id_fkey | empresa_id | CASCADE |
| public.competencias_matriz | competencias_matriz_empresa_id_fkey | empresa_id | NO ACTION |
| public.comunicados | comunicados_empresa_id_fkey | empresa_id | NO ACTION |
| public.configuracoes_esocial | configuracoes_esocial_empresa_id_fkey | empresa_id | CASCADE |
| public.configuracoes_intervalo | configuracoes_intervalo_empresa_id_fkey | empresa_id | CASCADE |
| public.configuracoes_ponto | configuracoes_ponto_empresa_id_fkey | empresa_id | CASCADE |
| public.conformidade_ponto_logs | conformidade_ponto_logs_empresa_id_fkey | empresa_id | CASCADE |
| public.contabilidade_contatos | contabilidade_contatos_empresa_id_fkey | empresa_id | CASCADE |
| public.contabilidade_mensagens | contabilidade_mensagens_empresa_id_fkey | empresa_id | CASCADE |
| public.contabilidade_threads | contabilidade_threads_empresa_id_fkey | empresa_id | CASCADE |
| public.contas_bancarias | contas_bancarias_empresa_id_fkey | empresa_id | CASCADE |
| public.contrato_assinatura_tokens | contrato_assinatura_tokens_empresa_id_fkey | empresa_id | CASCADE |
| public.contrato_templates | contrato_templates_empresa_id_fkey | empresa_id | CASCADE |
| public.contrato_token_eventos | contrato_token_eventos_empresa_id_fkey | empresa_id | CASCADE |
| public.contratos | contratos_empresa_id_fkey | empresa_id | NO ACTION |
| public.contratos_gerados | contratos_gerados_empresa_id_fkey | empresa_id | CASCADE |
| public.controle_acesso | controle_acesso_empresa_id_fkey | empresa_id | NO ACTION |
| public.convenios | convenios_empresa_id_fkey | empresa_id | NO ACTION |
| public.curriculos_arquivos | curriculos_arquivos_empresa_id_fkey | empresa_id | CASCADE |
| public.dados_estagiario | dados_estagiario_empresa_id_fkey | empresa_id | CASCADE |
| public.dctfweb_declaracoes | dctfweb_declaracoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.departamentos | departamentos_empresa_id_fkey | empresa_id | NO ACTION |
| public.desligamentos | desligamentos_empresa_id_fkey | empresa_id | NO ACTION |
| public.despesas | despesas_empresa_id_fkey | empresa_id | NO ACTION |
| public.documento_templates | documento_templates_empresa_id_fkey | empresa_id | NO ACTION |
| public.documentos | documentos_empresa_id_fkey | empresa_id | NO ACTION |
| public.documentos_assinatura | documentos_assinatura_empresa_id_fkey | empresa_id | NO ACTION |
| public.documentos_colaborador | documentos_colaborador_empresa_id_fkey | empresa_id | NO ACTION |
| public.emprestimos_consignados | emprestimos_consignados_empresa_id_fkey | empresa_id | CASCADE |
| public.epis | epis_empresa_id_fkey | empresa_id | NO ACTION |
| public.epis_entregas | epis_entregas_empresa_id_fkey | empresa_id | NO ACTION |
| public.escalas | escalas_empresa_id_fkey | empresa_id | NO ACTION |
| public.escalas_trabalho | escalas_trabalho_empresa_id_fkey | empresa_id | NO ACTION |
| public.esocial_eventos | esocial_eventos_empresa_id_fkey | empresa_id | NO ACTION |
| public.esocial_lotes | esocial_lotes_empresa_id_fkey | empresa_id | NO ACTION |
| public.faltas | faltas_empresa_id_fkey | empresa_id | NO ACTION |
| public.feedbacks_360 | feedbacks_360_empresa_id_fkey | empresa_id | NO ACTION |
| public.feriados | feriados_empresa_id_fkey | empresa_id | NO ACTION |
| public.ferias | ferias_empresa_id_fkey | empresa_id | NO ACTION |
| public.ferias_audit_log | ferias_audit_log_empresa_id_fkey | empresa_id | CASCADE |
| public.ferias_coletivas | ferias_coletivas_empresa_id_fkey | empresa_id | NO ACTION |
| public.ferias_programacao | ferias_programacao_empresa_id_fkey | empresa_id | CASCADE |
| public.ferias_reconciliacao_logs | ferias_reconciliacao_logs_empresa_id_fkey | empresa_id | CASCADE |
| public.ferias_solicitacoes | ferias_solicitacoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.folhas_pagamento | folhas_pagamento_empresa_id_fkey | empresa_id | NO ACTION |
| public.guias_fgts | guias_fgts_empresa_id_fkey | empresa_id | NO ACTION |
| public.guias_inss | guias_inss_empresa_id_fkey | empresa_id | NO ACTION |
| public.historico_calculos_folha | historico_calculos_folha_empresa_id_fkey | empresa_id | CASCADE |
| public.historico_cargo | historico_cargo_empresa_id_fkey | empresa_id | NO ACTION |
| public.historico_contratos | historico_contratos_empresa_id_fkey | empresa_id | CASCADE |
| public.historico_rescisoes | historico_rescisoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.historico_salarial | historico_salarial_empresa_id_fkey | empresa_id | NO ACTION |
| public.ia_provisoes_alertas | ia_provisoes_alertas_empresa_id_fkey | empresa_id | NO ACTION |
| public.inscricoes_cursos | inscricoes_cursos_empresa_id_fkey | empresa_id | NO ACTION |
| public.jornadas | jornadas_empresa_id_fkey | empresa_id | NO ACTION |
| public.lancamentos_contabeis | lancamentos_contabeis_empresa_id_fkey | empresa_id | CASCADE |
| public.lgpd_consentimentos | lgpd_consentimentos_empresa_id_fkey | empresa_id | NO ACTION |
| public.lgpd_solicitacoes | lgpd_solicitacoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.locais_trabalho | locais_trabalho_empresa_id_fkey | empresa_id | CASCADE |
| public.logs_sincronizacao | logs_sincronizacao_empresa_id_fkey | empresa_id | CASCADE |
| public.logs_sistema | logs_sistema_empresa_id_fkey | empresa_id | NO ACTION |
| public.lotacoes | lotacoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.medidas_disciplinares | medidas_disciplinares_empresa_id_fkey | empresa_id | NO ACTION |
| public.medidas_disciplinares_integracao | medidas_disciplinares_integracao_empresa_id_fkey | empresa_id | CASCADE |
| public.metas_okrs | metas_okrs_empresa_id_fkey | empresa_id | NO ACTION |
| public.notificacoes | notificacoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.onboarding_colaborador | onboarding_colaborador_empresa_id_fkey | empresa_id | CASCADE |
| public.onboarding_documentos_obrigatorios | onboarding_documentos_obrigatorios_empresa_id_fkey | empresa_id | CASCADE |
| public.onboarding_tarefas | onboarding_tarefas_empresa_id_fkey | empresa_id | CASCADE |
| public.onboarding_templates | onboarding_templates_empresa_id_fkey | empresa_id | NO ACTION |
| public.parametros_sistema | parametros_sistema_empresa_id_fkey | empresa_id | CASCADE |
| public.pcs_pesquisa_salarial | pcs_pesquisa_salarial_empresa_id_fkey | empresa_id | CASCADE |
| public.pcs_planos | pcs_planos_empresa_id_fkey | empresa_id | CASCADE |
| public.pdi_plano_desenvolvimento | pdi_plano_desenvolvimento_empresa_id_fkey | empresa_id | CASCADE |
| public.pdis | pdis_empresa_id_fkey | empresa_id | NO ACTION |
| public.pendencias | pendencias_empresa_id_fkey | empresa_id | CASCADE |
| public.permissao_perfis | permissao_perfis_empresa_id_fkey | empresa_id | CASCADE |
| public.personnel_budget | personnel_budget_empresa_id_fkey | empresa_id | CASCADE |
| public.pesquisas | pesquisas_empresa_id_fkey | empresa_id | NO ACTION |
| public.pix_lotes | pix_lotes_empresa_id_fkey | empresa_id | CASCADE |
| public.plano_contas | plano_contas_empresa_id_fkey | empresa_id | CASCADE |
| public.planos_saude | planos_saude_empresa_id_fkey | empresa_id | NO ACTION |
| public.premiacoes_campanhas | premiacoes_campanhas_empresa_id_fkey | empresa_id | CASCADE |
| public.premiacoes_cenarios_simulacao | premiacoes_cenarios_simulacao_empresa_id_fkey | empresa_id | NO ACTION |
| public.provisoes_folha | provisoes_folha_empresa_id_fkey | empresa_id | CASCADE |
| public.provisoes_mensais | provisoes_mensais_empresa_id_fkey | empresa_id | CASCADE |
| public.registros_ponto | registros_ponto_empresa_id_fkey | empresa_id | NO ACTION |
| public.relatorios_agendados | relatorios_agendados_empresa_id_fkey | empresa_id | NO ACTION |
| public.rubricas_folha | rubricas_folha_empresa_id_fkey | empresa_id | CASCADE |
| public.sefip_arquivos | sefip_arquivos_empresa_id_fkey | empresa_id | NO ACTION |
| public.seguros_vida | seguros_vida_empresa_id_fkey | empresa_id | NO ACTION |
| public.simulacoes_fiscais | simulacoes_fiscais_empresa_id_fkey | empresa_id | NO ACTION |
| public.solicitacoes_ajuste_ponto | solicitacoes_ajuste_ponto_empresa_id_fkey | empresa_id | CASCADE |
| public.solicitacoes_hora_extra | solicitacoes_hora_extra_empresa_id_fkey | empresa_id | CASCADE |
| public.sst_cat | sst_cat_empresa_id_fkey | empresa_id | NO ACTION |
| public.sst_extintores | sst_extintores_empresa_id_fkey | empresa_id | CASCADE |
| public.sst_extintores_inspecoes | sst_extintores_inspecoes_empresa_id_fkey | empresa_id | CASCADE |
| public.sst_regimento_assinaturas | sst_regimento_assinaturas_empresa_id_fkey | empresa_id | CASCADE |
| public.sst_regimento_documentos | sst_regimento_documentos_empresa_id_fkey | empresa_id | CASCADE |
| public.times | times_empresa_id_fkey | empresa_id | NO ACTION |
| public.training_image_requests | training_image_requests_empresa_id_fkey | empresa_id | CASCADE |
| public.training_images | training_images_empresa_id_fkey | empresa_id | CASCADE |
| public.treinamentos | treinamentos_empresa_id_fkey | empresa_id | NO ACTION |
| public.triagem_notas | triagem_notas_empresa_id_fkey | empresa_id | CASCADE |
| public.trilhas_aprendizado | trilhas_aprendizado_empresa_id_fkey | empresa_id | NO ACTION |
| public.turnos | turnos_empresa_id_fkey | empresa_id | NO ACTION |
| public.user_empresas | user_empresas_empresa_id_fkey | empresa_id | CASCADE |
| public.vaga_entrevistas | vaga_entrevistas_empresa_id_fkey | empresa_id | CASCADE |
| public.vaga_etapas | vaga_etapas_empresa_id_fkey | empresa_id | CASCADE |
| public.vagas | vagas_empresa_id_fkey | empresa_id | CASCADE |
| public.vales_alimentacao | vales_alimentacao_empresa_id_fkey | empresa_id | NO ACTION |
| public.webhooks | webhooks_empresa_id_fkey | empresa_id | CASCADE |
| public.webhooks_config | webhooks_config_empresa_id_fkey | empresa_id | NO ACTION |
| public.whatsapp_config | whatsapp_config_empresa_id_fkey | empresa_id | CASCADE |
| public.workflows_config | workflows_config_empresa_id_fkey | empresa_id | NO ACTION |
| public.workflows_definicoes | workflows_definicoes_empresa_id_fkey | empresa_id | NO ACTION |
| public.workflows_execucoes | workflows_execucoes_empresa_id_fkey | empresa_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| empresas_cnpj_key | btree | cnpj | sim | sim |  | `CREATE UNIQUE INDEX empresas_cnpj_key ON public.empresas USING btree (cnpj)` |
| empresas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX empresas_pkey ON public.empresas USING btree (id)` |
| idx_empresas_ativa | btree | ativa | não | sim | `(ativa = true)` | `CREATE INDEX idx_empresas_ativa ON public.empresas USING btree (ativa) WHERE (ativa = true)` |
| idx_empresas_ordem_exibicao | btree | ordem_exibicao | não | sim |  | `CREATE INDEX idx_empresas_ordem_exibicao ON public.empresas USING btree (ordem_exibicao)` |
| idx_empresas_razao_social | btree | razao_social | não | sim |  | `CREATE INDEX idx_empresas_razao_social ON public.empresas USING btree (razao_social)` |


## Policies (RLS)

### `Admins podem gerenciar empresas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(auth.uid())` |
| WITH CHECK | `is_admin(auth.uid())` |

### `Usuários podem ver suas empresas`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_auto_vincular_admins | AFTER | INSERT | ROW | enabled | public.auto_vincular_admins_empresa |
| update_empresas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
