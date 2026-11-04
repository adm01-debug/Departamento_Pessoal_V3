# Relacionamentos (chaves estrangeiras)


| de | colunas | para | colunas | on delete | on update |
|---|---|---|---|---|---|
| public.adiantamentos_salariais | aprovado_por | auth.users | id | SET NULL | NO ACTION |
| public.adiantamentos_salariais | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.adiantamentos_salariais | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.admissao_tokens | admissao_id | public.admissoes | id | CASCADE | NO ACTION |
| public.admissoes | created_by | auth.users | id | SET NULL | NO ACTION |
| public.admissoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.aej_geracoes | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.aej_geracoes | gerado_por | auth.users | id | SET NULL | NO ACTION |
| public.afastamentos | cid_id | public.cid10 | id | NO ACTION | NO ACTION |
| public.afastamentos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.afastamentos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.afd_geracoes | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.afdt_divergencias | importacao_id | public.afdt_importacoes | id | CASCADE | NO ACTION |
| public.afdt_divergencias | registro_raw_id | public.afdt_registros_raw | id | CASCADE | NO ACTION |
| public.afdt_registros_raw | importacao_id | public.afdt_importacoes | id | CASCADE | NO ACTION |
| public.ajustes_ponto | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.ajustes_ponto | registro_ponto_id | public.registros_ponto | id | CASCADE | NO ACTION |
| public.anotacoes_colaborador | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.asos | agendamento_id | public.exames_agendamentos | id | SET NULL | NO ACTION |
| public.asos | clinica_partner_id | public.clinicas_partners | id | SET NULL | NO ACTION |
| public.asos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.asos | emitido_por_partner_user | auth.users | id | SET NULL | NO ACTION |
| public.asos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.asos | recebido_rh_por | auth.users | id | SET NULL | NO ACTION |
| public.asos | validado_por | auth.users | id | SET NULL | NO ACTION |
| public.audit_log | user_id | auth.users | id | SET NULL | NO ACTION |
| public.audit_logs | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.auditoria_acesso_bancario | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.auditoria_contratual | alterado_por | auth.users | id | SET NULL | NO ACTION |
| public.auditoria_contratual | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.auditoria_logs | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.auth_gov_br_sessions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.banco_horas | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.banco_horas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.banco_horas | registro_ponto_id | public.registros_ponto | id | NO ACTION | NO ACTION |
| public.banco_horas_config | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.batidas_ponto | colaborador_id | public.colaboradores | id | RESTRICT | NO ACTION |
| public.batidas_ponto | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.beneficiarios_plano | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.beneficiarios_plano | plano_saude_id | public.planos_saude | id | CASCADE | NO ACTION |
| public.beneficiarios_seguro | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.beneficiarios_seguro | seguro_vida_id | public.seguros_vida | id | CASCADE | NO ACTION |
| public.beneficio_arquivos | beneficio_id | public.beneficios | id | CASCADE | NO ACTION |
| public.beneficio_arquivos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.beneficio_movimentacoes | beneficio_id | public.beneficios | id | CASCADE | NO ACTION |
| public.beneficio_movimentacoes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.beneficio_movimentacoes | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.beneficio_regras_elegibilidade | beneficio_id | public.beneficios | id | CASCADE | NO ACTION |
| public.beneficio_regras_elegibilidade | cargo_id | public.cargos | id | NO ACTION | NO ACTION |
| public.beneficio_regras_elegibilidade | departamento_id | public.departamentos | id | NO ACTION | NO ACTION |
| public.beneficio_regras_elegibilidade | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.beneficio_utilizacao | beneficio_colaborador_id | public.beneficios_colaborador | id | CASCADE | NO ACTION |
| public.beneficios | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.beneficios | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.beneficios_colaborador | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.beneficios_colaborador | created_by | auth.users | id | SET NULL | NO ACTION |
| public.beneficios_colaborador | tipo_beneficio_id | public.tipos_beneficio | id | CASCADE | NO ACTION |
| public.beneficios_colaboradores | beneficio_id | public.beneficios | id | CASCADE | NO ACTION |
| public.beneficios_colaboradores | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.blocked_ips | blocked_by | auth.users | id | SET NULL | NO ACTION |
| public.campos_customizados | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.canal_etica | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.candidatos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.candidaturas | candidato_id | public.candidatos | id | CASCADE | NO ACTION |
| public.candidaturas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.candidaturas | vaga_id | public.vagas | id | CASCADE | NO ACTION |
| public.cargo_faixas_salariais | cargo_id | public.cargos | id | CASCADE | NO ACTION |
| public.cargos | departamento_id | public.departamentos | id | NO ACTION | NO ACTION |
| public.cargos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.catalogo_cursos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.catalogo_infracoes | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.centros_custo | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.certificados_digitais | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.ciclos_avaliacao | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.clinicas_partners_horarios | clinica_id | public.clinicas_partners | id | CASCADE | NO ACTION |
| public.clinicas_partners_servicos | clinica_id | public.clinicas_partners | id | CASCADE | NO ACTION |
| public.cnab_configuracoes | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.cnab_itens | colaborador_id | public.colaboradores | id | SET NULL | NO ACTION |
| public.cnab_itens | folha_item_id | public.folha_itens | id | SET NULL | NO ACTION |
| public.cnab_itens | remessa_id | public.cnab_remessas | id | CASCADE | NO ACTION |
| public.cnab_remessas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.cnab_remessas | folha_id | public.folhas_pagamento | id | SET NULL | NO ACTION |
| public.colaborador_beneficios | beneficio_id | public.beneficios | id | CASCADE | NO ACTION |
| public.colaborador_beneficios | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.colaborador_beneficios | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.colaboradores | cargo_id | public.cargos | id | SET NULL | NO ACTION |
| public.colaboradores | categoria_trabalhador_id | public.categorias_trabalhador | id | NO ACTION | NO ACTION |
| public.colaboradores | centro_custo_id | public.centros_custo | id | NO ACTION | NO ACTION |
| public.colaboradores | created_by | auth.users | id | SET NULL | NO ACTION |
| public.colaboradores | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.colaboradores | genero_documento_id | public.generos_documento | id | NO ACTION | NO ACTION |
| public.colaboradores | gestor_ferias_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.colaboradores | nacionalidade_id | public.nacionalidades | id | NO ACTION | NO ACTION |
| public.colaboradores | supervisor_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.colaboradores | tipo_pagamento_id | public.tipos_pagamento | id | NO ACTION | NO ACTION |
| public.colaboradores | tipo_salario_id | public.tipos_salario | id | NO ACTION | NO ACTION |
| public.colaboradores | user_id | auth.users | id | SET NULL | NO ACTION |
| public.colaboradores_pin | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.colaboradores_pin | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.competencias_config | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.competencias_matriz | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.comunicados | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.comunicados_leituras | comunicado_id | public.comunicados | id | CASCADE | NO ACTION |
| public.configuracoes_esocial | certificado_id | public.certificados_digitais | id | SET NULL | NO ACTION |
| public.configuracoes_esocial | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.configuracoes_intervalo | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.configuracoes_ponto | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.conformidade_ponto_logs | batida_id | public.batidas_ponto | id | CASCADE | NO ACTION |
| public.conformidade_ponto_logs | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contabilidade_contatos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contabilidade_mensagens | autor_id | auth.users | id | SET NULL | NO ACTION |
| public.contabilidade_mensagens | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contabilidade_mensagens | thread_id | public.contabilidade_threads | id | CASCADE | NO ACTION |
| public.contabilidade_threads | aberto_por | auth.users | id | SET NULL | NO ACTION |
| public.contabilidade_threads | contato_id | public.contabilidade_contatos | id | SET NULL | NO ACTION |
| public.contabilidade_threads | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contas_bancarias | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.contas_bancarias | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contatos_emergencia | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.contatos_emergencia | relacionamento_id | public.relacionamentos_contato_emergencia | id | NO ACTION | NO ACTION |
| public.contrato_assinatura_tokens | contrato_id | public.contratos_gerados | id | CASCADE | NO ACTION |
| public.contrato_assinatura_tokens | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.contrato_assinatura_tokens | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contrato_assinatura_tokens | revogado_por | auth.users | id | NO ACTION | NO ACTION |
| public.contrato_templates | cargo_id | public.cargos | id | SET NULL | NO ACTION |
| public.contrato_templates | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.contrato_templates | departamento_id | public.departamentos | id | SET NULL | NO ACTION |
| public.contrato_templates | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contrato_token_eventos | ator_id | auth.users | id | NO ACTION | NO ACTION |
| public.contrato_token_eventos | contrato_id | public.contratos_gerados | id | CASCADE | NO ACTION |
| public.contrato_token_eventos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contrato_token_eventos | token_id | public.contrato_assinatura_tokens | id | CASCADE | NO ACTION |
| public.contratos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.contratos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.contratos_gerados | admissao_id | public.admissoes | id | CASCADE | NO ACTION |
| public.contratos_gerados | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.contratos_gerados | contrato_anterior_id | public.contratos_gerados | id | SET NULL | NO ACTION |
| public.contratos_gerados | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.contratos_gerados | gerado_por | auth.users | id | NO ACTION | NO ACTION |
| public.contratos_gerados | template_id | public.contrato_templates | id | RESTRICT | NO ACTION |
| public.controle_acesso | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.controle_acesso | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.convenios | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.convenios_colaboradores | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.convenios_colaboradores | convenio_id | public.convenios | id | CASCADE | NO ACTION |
| public.curriculos_arquivos | candidato_id | public.candidatos | id | CASCADE | NO ACTION |
| public.curriculos_arquivos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.dados_estagiario | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.dados_estagiario | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.dados_estagiario | supervisor_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.dados_estrangeiro | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.dados_estrangeiro | condicao_ingresso_id | public.condicoes_ingresso | id | NO ACTION | NO ACTION |
| public.dados_estrangeiro | descricao_logradouro_id | public.descricoes_logradouro | id | NO ACTION | NO ACTION |
| public.dados_estrangeiro | pais_id | public.paises | id | NO ACTION | NO ACTION |
| public.dados_estrangeiro | tempo_residencia_id | public.tempos_residencia | id | NO ACTION | NO ACTION |
| public.dados_estrangeiro | tipo_visto_id | public.tipos_visto | id | NO ACTION | NO ACTION |
| public.dctfweb_declaracoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.deficiencias | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.departamentos | departamento_pai_id | public.departamentos | id | NO ACTION | NO ACTION |
| public.departamentos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.departamentos | responsavel_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.dependentes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.dependentes | genero_documento_id | public.generos_documento | id | NO ACTION | NO ACTION |
| public.dependentes | relacionamento_id | public.relacionamentos_dependentes | id | NO ACTION | NO ACTION |
| public.dependentes_beneficios | beneficio_id | public.beneficios | id | CASCADE | NO ACTION |
| public.dependentes_beneficios | dependente_id | public.dependentes | id | CASCADE | NO ACTION |
| public.desligamentos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.desligamentos | created_by | auth.users | id | SET NULL | NO ACTION |
| public.desligamentos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.desligamentos | tipo_aviso_previo_id | public.tipos_aviso_previo | id | NO ACTION | NO ACTION |
| public.desligamentos | tipo_desligamento_id | public.tipos_desligamento | id | NO ACTION | NO ACTION |
| public.despesas | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.despesas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.despesas | folha_id | public.folhas_pagamento | id | SET NULL | NO ACTION |
| public.despesas_aprovacoes_log | despesa_id | public.despesas | id | CASCADE | NO ACTION |
| public.documento_templates | created_by | auth.users | id | SET NULL | NO ACTION |
| public.documento_templates | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.documentos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.documentos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.documentos_admissao | admissao_id | public.admissoes | id | CASCADE | NO ACTION |
| public.documentos_afastamento | afastamento_id | public.afastamentos | id | CASCADE | NO ACTION |
| public.documentos_assinatura | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.documentos_assinatura | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.documentos_colaborador | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.documentos_colaborador | created_by | auth.users | id | SET NULL | NO ACTION |
| public.documentos_colaborador | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.documentos_historico | documento_id | public.documentos | id | CASCADE | NO ACTION |
| public.documentos_historico | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.documentos_pessoais_arquivos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.dp_user_roles | granted_by | auth.users | id | NO ACTION | NO ACTION |
| public.dp_user_roles | user_id | auth.users | id | CASCADE | NO ACTION |
| public.emprestimos_consignados | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.emprestimos_consignados | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.epis | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.epis_entregas | colaborador_id | public.colaboradores | id | RESTRICT | NO ACTION |
| public.epis_entregas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.epis_entregas | epi_id | public.epis | id | RESTRICT | NO ACTION |
| public.epis_fichas | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.epis_fichas | responsavel_id | auth.users | id | NO ACTION | NO ACTION |
| public.epis_fichas_assinaturas | ficha_id | public.epis_fichas | id | CASCADE | NO ACTION |
| public.epis_fichas_itens | epi_id | public.epis | id | SET NULL | NO ACTION |
| public.epis_fichas_itens | ficha_id | public.epis_fichas | id | CASCADE | NO ACTION |
| public.escalas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.escalas_trabalho | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.escalas_trabalho | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.escalas_trabalho | turno_id | public.turnos | id | NO ACTION | NO ACTION |
| public.esocial_eventos | admissao_id | public.admissoes | id | SET NULL | NO ACTION |
| public.esocial_eventos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.esocial_lotes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.esocial_transmissao_logs | evento_id | public.esocial_eventos | id | CASCADE | NO ACTION |
| public.eventos_variaveis | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.eventos_variaveis | created_by | auth.users | id | SET NULL | NO ACTION |
| public.eventos_variaveis | origem_ferias_id | public.ferias | id | CASCADE | NO ACTION |
| public.eventos_variaveis | rubrica_id | public.rubricas_folha | id | NO ACTION | NO ACTION |
| public.exames | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.exames_agendamentos | clinica_id | public.clinicas_partners | id | RESTRICT | NO ACTION |
| public.faltas | colaborador_id | public.colaboradores | id | RESTRICT | NO ACTION |
| public.faltas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.faltas | motivo_afastamento_id | public.motivos_afastamento | id | NO ACTION | NO ACTION |
| public.feedbacks_360 | avaliado_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.feedbacks_360 | avaliador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.feedbacks_360 | ciclo_id | public.ciclos_avaliacao | id | SET NULL | NO ACTION |
| public.feedbacks_360 | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.feedbacks_360_aprovacoes_gestor | consolidacao_id | public.feedbacks_360_consolidacoes | id | RESTRICT | NO ACTION |
| public.feedbacks_360_aprovacoes_gestor | feedback_id | public.feedbacks_360 | id | RESTRICT | NO ACTION |
| public.feedbacks_360_operacoes | feedback_id | public.feedbacks_360 | id | RESTRICT | NO ACTION |
| public.feedbacks_360_validacoes_potencial | feedback_id | public.feedbacks_360 | id | RESTRICT | NO ACTION |
| public.feriados | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.ferias | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.ferias | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.ferias | pagamento_confirmado_por | auth.users | id | NO ACTION | NO ACTION |
| public.ferias | periodo_aquisitivo_id | public.periodos_aquisitivos | id | NO ACTION | NO ACTION |
| public.ferias_aprovacoes | ferias_id | public.ferias | id | CASCADE | NO ACTION |
| public.ferias_aprovacoes_log | aprovador_id | auth.users | id | SET NULL | NO ACTION |
| public.ferias_aprovacoes_log | ferias_id | public.ferias | id | CASCADE | NO ACTION |
| public.ferias_arquivos | ferias_id | public.ferias | id | CASCADE | NO ACTION |
| public.ferias_audit_log | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.ferias_audit_log | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.ferias_coletivas | comunicado_gerado_por | auth.users | id | SET NULL | NO ACTION |
| public.ferias_coletivas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.ferias_programacao | aprovado_gestor_por | auth.users | id | SET NULL | NO ACTION |
| public.ferias_programacao | aprovado_rh_por | auth.users | id | SET NULL | NO ACTION |
| public.ferias_programacao | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.ferias_programacao | criado_por | auth.users | id | SET NULL | NO ACTION |
| public.ferias_programacao | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.ferias_programacao | ferias_id | public.ferias | id | SET NULL | NO ACTION |
| public.ferias_programacao | periodo_aquisitivo_id | public.periodos_aquisitivos | id | SET NULL | NO ACTION |
| public.ferias_programacao | rejeitado_por | auth.users | id | SET NULL | NO ACTION |
| public.ferias_reconciliacao_logs | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.ferias_solicitacoes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.ferias_solicitacoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.fgts_digital_logs | guia_id | public.guias_fgts_digital | id | CASCADE | NO ACTION |
| public.fila_notificacoes | user_id | auth.users | id | CASCADE | NO ACTION |
| public.fila_processamento | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.folha_assinaturas | assinante_id | auth.users | id | SET NULL | NO ACTION |
| public.folha_assinaturas | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.folha_auditoria | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.folha_auditoria | criado_por | auth.users | id | SET NULL | NO ACTION |
| public.folha_auditoria | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.folha_eventos_auditoria | folha_id | public.folhas_pagamento | id | NO ACTION | NO ACTION |
| public.folha_eventos_auditoria | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.folha_itens | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.folha_itens | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.folhas_pagamento | created_by | auth.users | id | SET NULL | NO ACTION |
| public.folhas_pagamento | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.formacoes_academicas | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.geo_allowed_countries | added_by | auth.users | id | SET NULL | NO ACTION |
| public.geo_blocking_config | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.guias_fgts | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.guias_inss | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.historico_calculos_folha | criado_por | auth.users | id | SET NULL | NO ACTION |
| public.historico_calculos_folha | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.historico_calculos_folha | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.historico_cargo | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.historico_cargo | created_by | auth.users | id | SET NULL | NO ACTION |
| public.historico_cargo | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.historico_contratos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.historico_contratos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.historico_ferias | ferias_id | public.ferias | id | CASCADE | NO ACTION |
| public.historico_rescisoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.historico_salarial | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.historico_salarial | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.holerite_distribuicoes | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.holerite_distribuicoes | holerite_id | public.holerites | id | CASCADE | NO ACTION |
| public.holerites | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.holerites | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.homologacoes_rescisao | desligamento_id | public.desligamentos | id | CASCADE | NO ACTION |
| public.homologacoes_rescisao | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.ia_provisoes_alertas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.inscricoes_cursos | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.inscricoes_cursos | curso_id | public.catalogo_cursos | id | NO ACTION | NO ACTION |
| public.inscricoes_cursos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.ip_whitelist | added_by | auth.users | id | SET NULL | NO ACTION |
| public.itens_folha | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.itens_folha | folha_id | public.folhas_pagamento | id | CASCADE | NO ACTION |
| public.itens_folha | rubrica_id | public.rubricas_folha | id | NO ACTION | NO ACTION |
| public.jornadas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.jornadas_horarios | jornada_id | public.jornadas | id | CASCADE | NO ACTION |
| public.lancamentos_contabeis | conta_credito_id | public.plano_contas | id | NO ACTION | NO ACTION |
| public.lancamentos_contabeis | conta_debito_id | public.plano_contas | id | NO ACTION | NO ACTION |
| public.lancamentos_contabeis | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.lancamentos_contabeis | folha_id | public.folhas_pagamento | id | SET NULL | NO ACTION |
| public.lancamentos_folha | holerite_id | public.holerites | id | CASCADE | NO ACTION |
| public.lancamentos_folha | rubrica_id | public.rubricas_folha | id | NO ACTION | NO ACTION |
| public.lgpd_consentimentos | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.lgpd_consentimentos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.lgpd_solicitacoes | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.lgpd_solicitacoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.linhas_transporte | vale_transporte_id | public.vales_transporte | id | CASCADE | NO ACTION |
| public.locais_trabalho | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.log_envio_relatorios | agendamento_id | public.relatorios_agendados | id | CASCADE | NO ACTION |
| public.logs_integracoes | integracao_id | public.integracoes | id | CASCADE | NO ACTION |
| public.logs_sincronizacao | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.logs_sistema | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.lotacoes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.lotacoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.medidas_ciencia_tokens | medida_id | public.medidas_disciplinares | id | CASCADE | NO ACTION |
| public.medidas_disciplinares | aprovado_gestor_por | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares | aprovado_juridico_por | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares | aprovado_rh_por | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares | aprovador_id | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares | arquivado_por | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares | colaborador_id | public.colaboradores | id | RESTRICT | NO ACTION |
| public.medidas_disciplinares | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares | rejeitado_por | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares_anexos | medida_id | public.medidas_disciplinares | id | CASCADE | NO ACTION |
| public.medidas_disciplinares_anexos | uploaded_by | auth.users | id | SET NULL | NO ACTION |
| public.medidas_disciplinares_contestacao_anexos | medida_id | public.medidas_disciplinares | id | CASCADE | NO ACTION |
| public.medidas_disciplinares_integracao | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.medidas_disciplinares_integracao | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.medidas_disciplinares_integracao | medida_id | public.medidas_disciplinares | id | CASCADE | NO ACTION |
| public.medidas_disciplinares_workflow_log | ator_id | auth.users | id | NO ACTION | NO ACTION |
| public.medidas_disciplinares_workflow_log | medida_id | public.medidas_disciplinares | id | CASCADE | NO ACTION |
| public.metas_okrs | ciclo_id | public.ciclos_avaliacao | id | SET NULL | NO ACTION |
| public.metas_okrs | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.metas_okrs | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.ninebox_permissoes_homologacao | user_id | auth.users | id | CASCADE | NO ACTION |
| public.notificacoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.notificacoes | user_id | auth.users | id | CASCADE | NO ACTION |
| public.notificacoes_admissao | admissao_id | public.admissoes | id | CASCADE | NO ACTION |
| public.onboarding_colaborador | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.onboarding_colaborador | created_by | auth.users | id | SET NULL | NO ACTION |
| public.onboarding_colaborador | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.onboarding_colaborador | template_id | public.onboarding_templates | id | NO ACTION | NO ACTION |
| public.onboarding_documentos_obrigatorios | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.onboarding_documentos_obrigatorios | onboarding_id | public.onboarding_colaborador | id | CASCADE | NO ACTION |
| public.onboarding_tarefas | concluida_por | auth.users | id | SET NULL | NO ACTION |
| public.onboarding_tarefas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.onboarding_tarefas | onboarding_id | public.onboarding_colaborador | id | CASCADE | NO ACTION |
| public.onboarding_tarefas | template_tarefa_id | public.onboarding_template_tarefas | id | NO ACTION | NO ACTION |
| public.onboarding_template_tarefas | template_id | public.onboarding_templates | id | CASCADE | NO ACTION |
| public.onboarding_templates | created_by | auth.users | id | SET NULL | NO ACTION |
| public.onboarding_templates | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.parametros_sistema | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.password_history | user_id | auth.users | id | CASCADE | NO ACTION |
| public.password_reset_config | updated_by | auth.users | id | SET NULL | NO ACTION |
| public.password_reset_requests | reviewed_by | auth.users | id | SET NULL | NO ACTION |
| public.password_reset_requests | user_id | auth.users | id | CASCADE | NO ACTION |
| public.pcs_avaliacoes_cargo | cargo_id | public.cargos | id | CASCADE | NO ACTION |
| public.pcs_avaliacoes_cargo | plano_id | public.pcs_planos | id | CASCADE | NO ACTION |
| public.pcs_fatores | plano_id | public.pcs_planos | id | CASCADE | NO ACTION |
| public.pcs_grades | plano_id | public.pcs_planos | id | CASCADE | NO ACTION |
| public.pcs_pesquisa_salarial | cargo_id | public.cargos | id | SET NULL | NO ACTION |
| public.pcs_pesquisa_salarial | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.pcs_planos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.pdi_plano_desenvolvimento | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.pdi_plano_desenvolvimento | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.pdis | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.pdis | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.pendencias | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.pensoes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.periodos_aquisitivos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.periodos_experiencia | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.permissao_perfis | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.personnel_budget | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.pesquisas | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.pesquisas_perguntas | pesquisa_id | public.pesquisas | id | CASCADE | NO ACTION |
| public.pesquisas_respostas | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.pesquisas_respostas | pergunta_id | public.pesquisas_perguntas | id | CASCADE | NO ACTION |
| public.pesquisas_respostas | pesquisa_id | public.pesquisas | id | CASCADE | NO ACTION |
| public.pix_itens | colaborador_id | public.colaboradores | id | SET NULL | NO ACTION |
| public.pix_itens | lote_id | public.pix_lotes | id | CASCADE | NO ACTION |
| public.pix_lotes | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.pix_lotes | folha_id | public.folhas_pagamento | id | NO ACTION | NO ACTION |
| public.plano_contas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.planos_saude | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.planos_saude | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.ponto_ajustes | gestor_id | auth.users | id | SET NULL | NO ACTION |
| public.ponto_auditoria | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.ponto_auditoria_fraude | batida_id | public.batidas_ponto | id | NO ACTION | NO ACTION |
| public.ponto_espelhos_assinados | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.ponto_espelhos_revogacoes | espelho_id | public.ponto_espelhos_assinados | id | NO ACTION | NO ACTION |
| public.ponto_seguranca_blacklist | colaborador_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.portal_notificacoes_settings | user_id | auth.users | id | CASCADE | NO ACTION |
| public.premiacoes_alertas | user_id | auth.users | id | SET NULL | NO ACTION |
| public.premiacoes_auditoria | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.premiacoes_campanhas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.premiacoes_cenarios_simulacao | criado_por | auth.users | id | SET NULL | NO ACTION |
| public.premiacoes_cenarios_simulacao | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.premiacoes_pagamentos | campanha_id | public.premiacoes_campanhas | id | CASCADE | NO ACTION |
| public.premiacoes_pagamentos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.premiacoes_pagamentos | regra_id | public.premiacoes_regras | id | CASCADE | NO ACTION |
| public.premiacoes_regras | campanha_id | public.premiacoes_campanhas | id | CASCADE | NO ACTION |
| public.premiacoes_regras | meta_id | public.metas_okrs | id | NO ACTION | NO ACTION |
| public.premiacoes_roi_cenarios | user_id | auth.users | id | SET NULL | NO ACTION |
| public.promocoes | cargo_anterior_id | public.cargos | id | NO ACTION | NO ACTION |
| public.promocoes | cargo_novo_id | public.cargos | id | NO ACTION | NO ACTION |
| public.promocoes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.prorrogacoes_afastamento | afastamento_id | public.afastamentos | id | CASCADE | NO ACTION |
| public.provisao_auditoria | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.provisao_logs | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.provisoes_folha | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.provisoes_folha | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.provisoes_mensais | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.provisoes_mensais | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.provisoes_mensais | log_id | public.provisao_logs | id | NO ACTION | NO ACTION |
| public.push_subscriptions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.rate_limit_logs | user_id | auth.users | id | SET NULL | NO ACTION |
| public.recargas_vale | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.recargas_vale | vale_id | public.vales_alimentacao | id | CASCADE | NO ACTION |
| public.recrutamento_agendamentos | candidatura_id | public.candidaturas | id | CASCADE | NO ACTION |
| public.recrutamento_agendamentos | responsavel_id | auth.users | id | SET NULL | NO ACTION |
| public.recrutamento_anotacoes | candidatura_id | public.candidaturas | id | CASCADE | NO ACTION |
| public.recrutamento_anotacoes | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.recrutamento_entrevistas | candidatura_id | public.candidaturas | id | CASCADE | NO ACTION |
| public.recrutamento_entrevistas | entrevistador_id | auth.users | id | SET NULL | NO ACTION |
| public.recrutamento_testes | candidatura_id | public.candidaturas | id | CASCADE | NO ACTION |
| public.registros_ponto | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.registros_ponto | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.relatorios_agendados | created_by | auth.users | id | SET NULL | NO ACTION |
| public.relatorios_agendados | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.report_dispatch_attempts | agendamento_id | public.relatorios_agendados | id | CASCADE | NO ACTION |
| public.role_permissions | created_by | auth.users | id | SET NULL | NO ACTION |
| public.rubricas_folha | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.security_alerts | resolved_by | auth.users | id | SET NULL | NO ACTION |
| public.security_alerts | user_id | auth.users | id | SET NULL | NO ACTION |
| public.sefip_arquivos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.seguros_colaboradores | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.seguros_colaboradores | seguro_vida_id | public.seguros_vida | id | CASCADE | NO ACTION |
| public.seguros_vida | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.seguros_vida | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.simulacoes_fiscais | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.simulacoes_fiscais | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.sinistros_seguro | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.sinistros_seguro | seguro_vida_id | public.seguros_vida | id | CASCADE | NO ACTION |
| public.solicitacoes_ajuste_ponto | analisado_por | auth.users | id | SET NULL | NO ACTION |
| public.solicitacoes_ajuste_ponto | aprovado_por | public.profiles | id | NO ACTION | NO ACTION |
| public.solicitacoes_ajuste_ponto | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.solicitacoes_ajuste_ponto | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.solicitacoes_hora_extra | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.solicitacoes_hora_extra | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.sst_cat | cat_origem_id | public.sst_cat | id | SET NULL | NO ACTION |
| public.sst_cat | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.sst_cat | created_by | auth.users | id | SET NULL | NO ACTION |
| public.sst_cat | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.sst_cat | retifica_cat_id | public.sst_cat | id | SET NULL | NO ACTION |
| public.sst_cat_anexos | cat_id | public.sst_cat | id | CASCADE | NO ACTION |
| public.sst_cat_anexos | uploaded_by | auth.users | id | NO ACTION | NO ACTION |
| public.sst_cat_testemunhas | cat_id | public.sst_cat | id | CASCADE | NO ACTION |
| public.sst_exposicao_riscos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.sst_extintores | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.sst_extintores | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.sst_extintores | local_trabalho_id | public.locais_trabalho | id | SET NULL | NO ACTION |
| public.sst_extintores_inspecoes | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.sst_extintores_inspecoes | extintor_id | public.sst_extintores | id | CASCADE | NO ACTION |
| public.sst_extintores_inspecoes | inspetor_id | auth.users | id | NO ACTION | NO ACTION |
| public.sst_incidentes | colaborador_id | public.colaboradores | id | SET NULL | NO ACTION |
| public.sst_ltcat_laudos | gerado_por | auth.users | id | NO ACTION | NO ACTION |
| public.sst_ordens_servico | cargo_id | public.cargos | id | SET NULL | NO ACTION |
| public.sst_ordens_servico | colaborador_id | public.colaboradores | id | SET NULL | NO ACTION |
| public.sst_ordens_servico | gerado_por | auth.users | id | NO ACTION | NO ACTION |
| public.sst_programas | gerado_por | auth.users | id | SET NULL | NO ACTION |
| public.sst_regimento_assinaturas | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.sst_regimento_assinaturas | documento_id | public.sst_regimento_documentos | id | CASCADE | NO ACTION |
| public.sst_regimento_assinaturas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.sst_regimento_documentos | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.sst_riscos_ambientais | local_id | public.locais_trabalho | id | CASCADE | NO ACTION |
| public.tarefas_onboarding | admissao_id | public.admissoes | id | CASCADE | NO ACTION |
| public.tarefas_onboarding | responsavel_id | auth.users | id | SET NULL | NO ACTION |
| public.times | departamento_id | public.departamentos | id | NO ACTION | NO ACTION |
| public.times | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.times | lider_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.times_brindes | brinde_id | public.promo_brindes | id | CASCADE | NO ACTION |
| public.times_brindes | time_id | public.times | id | CASCADE | NO ACTION |
| public.training_image_requests | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.training_images | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.transferencias | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.transferencias | departamento_anterior_id | public.departamentos | id | NO ACTION | NO ACTION |
| public.transferencias | departamento_novo_id | public.departamentos | id | NO ACTION | NO ACTION |
| public.treinamento_certificados | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.treinamento_certificados | curso_id | public.catalogo_cursos | id | SET NULL | NO ACTION |
| public.treinamento_certificados | inscricao_id | public.inscricoes_cursos | id | CASCADE | NO ACTION |
| public.treinamento_feedback | inscricao_id | public.inscricoes_cursos | id | CASCADE | NO ACTION |
| public.treinamento_feedbacks | inscricao_id | public.inscricoes_cursos | id | CASCADE | NO ACTION |
| public.treinamento_instancias | curso_id | public.catalogo_cursos | id | CASCADE | NO ACTION |
| public.treinamento_instancias | instrutor_id | public.colaboradores | id | NO ACTION | NO ACTION |
| public.treinamento_participantes | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.treinamento_participantes | treinamento_id | public.treinamentos | id | CASCADE | NO ACTION |
| public.treinamentos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.triagem_notas | candidatura_id | public.candidaturas | id | CASCADE | NO ACTION |
| public.triagem_notas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.trilha_auditoria_ponto | ponto_id | public.batidas_ponto | id | CASCADE | NO ACTION |
| public.trilha_auditoria_ponto | usuario_id | auth.users | id | SET NULL | NO ACTION |
| public.trilhas_aprendizado | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.trilhas_cursos | curso_id | public.catalogo_cursos | id | CASCADE | NO ACTION |
| public.trilhas_cursos | trilha_id | public.trilhas_aprendizado | id | CASCADE | NO ACTION |
| public.turnos | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.user_empresas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.user_mfa | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_sessions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.vaga_entrevistas | candidatura_id | public.candidaturas | id | CASCADE | NO ACTION |
| public.vaga_entrevistas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.vaga_entrevistas | etapa_id | public.vaga_etapas | id | CASCADE | NO ACTION |
| public.vaga_etapas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.vaga_etapas | vaga_id | public.vagas | id | CASCADE | NO ACTION |
| public.vagas | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.vales_alimentacao | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.vales_alimentacao | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.vales_transporte | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.valores_campos_customizados | campo_customizado_id | public.campos_customizados | id | CASCADE | NO ACTION |
| public.valores_campos_customizados | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.verbas_rescisorias | desligamento_id | public.desligamentos | id | CASCADE | NO ACTION |
| public.verbas_rescisorias | rubrica_id | public.rubricas_folha | id | NO ACTION | NO ACTION |
| public.verification_tokens | user_id | auth.users | id | CASCADE | NO ACTION |
| public.vinculos | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.webauthn_challenges | user_id | auth.users | id | CASCADE | NO ACTION |
| public.webauthn_credentials | user_id | auth.users | id | CASCADE | NO ACTION |
| public.webhook_logs | webhook_id | public.webhooks | id | CASCADE | NO ACTION |
| public.webhooks | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.webhooks_config | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.webhooks_logs | webhook_id | public.webhooks_config | id | CASCADE | NO ACTION |
| public.whatsapp_config | empresa_id | public.empresas | id | CASCADE | NO ACTION |
| public.whatsapp_mensagens_logs | colaborador_id | public.colaboradores | id | CASCADE | NO ACTION |
| public.whatsapp_mensagens_logs | template_id | public.whatsapp_templates | id | NO ACTION | NO ACTION |
| public.workflows_config | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.workflows_definicoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.workflows_etapas | workflow_id | public.workflows_definicoes | id | CASCADE | NO ACTION |
| public.workflows_execucoes | empresa_id | public.empresas | id | NO ACTION | NO ACTION |
| public.workflows_execucoes | etapa_atual_id | public.workflows_etapas | id | NO ACTION | NO ACTION |
| public.workflows_execucoes | workflow_id | public.workflows_definicoes | id | NO ACTION | NO ACTION |
| public.workflows_historico | etapa_id | public.workflows_etapas | id | NO ACTION | NO ACTION |
| public.workflows_historico | execucao_id | public.workflows_execucoes | id | CASCADE | NO ACTION |


_Diagrama omitido: mais de 120 tabelas._
