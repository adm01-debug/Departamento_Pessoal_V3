# Índices

Uso e tamanho em `stats.md`.

| tabela | índice | método | colunas | único | válido | predicado |
|---|---|---|---|---|---|---|
| public.adiantamentos_salariais | adiantamentos_salariais_pkey | btree | id | sim | sim |  |
| public.adiantamentos_salariais | idx_adiantamentos_salariais_aprovado_por | btree | aprovado_por | não | sim |  |
| public.adiantamentos_salariais | idx_adiantamentos_salariais_colaborador_id | btree | colaborador_id | não | sim |  |
| public.adiantamentos_salariais | idx_adiantamentos_salariais_empresa_id | btree | empresa_id | não | sim |  |
| public.admissao_tokens | admissao_tokens_pkey | btree | id | sim | sim |  |
| public.admissao_tokens | admissao_tokens_token_key | btree | token | sim | sim |  |
| public.admissao_tokens | idx_admissao_tokens_admissao_id | btree | admissao_id | não | sim |  |
| public.admissoes | admissoes_pkey | btree | id | sim | sim |  |
| public.admissoes | idx_admissoes_created_by | btree | created_by | não | sim |  |
| public.admissoes | idx_admissoes_empresa | btree | empresa_id | não | sim |  |
| public.admissoes | idx_admissoes_empresa_created | btree | empresa_id, created_at | não | sim |  |
| public.aej_geracoes | aej_geracoes_pkey | btree | id | sim | sim |  |
| public.aej_geracoes | idx_aej_geracoes_empresa_periodo | btree | empresa_id, periodo_inicio, periodo_fim | não | sim |  |
| public.aej_geracoes | idx_aej_geracoes_gerado_por | btree | gerado_por | não | sim |  |
| public.aej_geracoes | uq_aej_geracoes_hash | btree | empresa_id, periodo_inicio, periodo_fim, hash_sha256 | sim | sim |  |
| public.afastamentos | afastamentos_pkey | btree | id | sim | sim |  |
| public.afastamentos | idx_afastamentos_ativo | btree | empresa_id, data_inicio | não | sim | `(status = 'ativo'::status_afastamento)` |
| public.afastamentos | idx_afastamentos_cid | btree | cid | não | sim | `(cid IS NOT NULL)` |
| public.afastamentos | idx_afastamentos_cid_id | btree | cid_id | não | sim |  |
| public.afastamentos | idx_afastamentos_colab_status | btree | colaborador_id, status | não | sim |  |
| public.afastamentos | idx_afastamentos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.afastamentos | idx_afastamentos_empresa_id | btree | empresa_id | não | sim |  |
| public.afastamentos | idx_afastamentos_empresa_inicio | btree | empresa_id, data_inicio | não | sim |  |
| public.afd_geracoes | afd_geracoes_pkey | btree | id | sim | sim |  |
| public.afd_geracoes | uq_afd_geracoes_hash | btree | empresa_id, periodo_inicio, periodo_fim, hash_sha256 | sim | sim |  |
| public.afdt_divergencias | afdt_divergencias_pkey | btree | id | sim | sim |  |
| public.afdt_divergencias | idx_afdt_div_emp_tipo | btree | empresa_id, tipo | não | sim | `(resolvido = false)` |
| public.afdt_divergencias | idx_afdt_div_imp | btree | importacao_id | não | sim |  |
| public.afdt_divergencias | idx_afdt_div_pis_unresolved | btree | empresa_id, pis | não | sim | `((resolvido = false) AND (colaborador_id IS NULL))` |
| public.afdt_divergencias | idx_afdt_diverg_registro_raw_id | btree | registro_raw_id | não | sim |  |
| public.afdt_importacoes | afdt_importacoes_pkey | btree | id | sim | sim |  |
| public.afdt_importacoes | idx_afdt_imp_empresa | btree | empresa_id, created_at | não | sim |  |
| public.afdt_registros_raw | afdt_registros_raw_pkey | btree | id | sim | sim |  |
| public.afdt_registros_raw | idx_afdt_raw_cpf | btree | empresa_id, cpf | não | sim | `(cpf IS NOT NULL)` |
| public.afdt_registros_raw | idx_afdt_raw_data | btree | empresa_id, data_hora_marcacao | não | sim | `(data_hora_marcacao IS NOT NULL)` |
| public.afdt_registros_raw | idx_afdt_raw_imp | btree | importacao_id | não | sim |  |
| public.ajustes_ponto | ajustes_ponto_pkey | btree | id | sim | sim |  |
| public.ajustes_ponto | idx_ajustes_ponto_colaborador_id | btree | colaborador_id | não | sim |  |
| public.ajustes_ponto | idx_ajustes_ponto_registro_ponto_id | btree | registro_ponto_id | não | sim |  |
| public.anotacoes_colaborador | anotacoes_colaborador_pkey | btree | id | sim | sim |  |
| public.anotacoes_colaborador | idx_anotacoes_col | btree | colaborador_id | não | sim |  |
| public.anotacoes_colaborador | idx_anotacoes_colaborador_colaborador_id | btree | colaborador_id | não | sim |  |
| public.asos | asos_pkey | btree | id | sim | sim |  |
| public.asos | idx_asos_agendamento | btree | agendamento_id | não | sim | `(agendamento_id IS NOT NULL)` |
| public.asos | idx_asos_clinica_partner | btree | clinica_partner_id | não | sim | `(clinica_partner_id IS NOT NULL)` |
| public.asos | idx_asos_col | btree | colaborador_id | não | sim |  |
| public.asos | idx_asos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.asos | idx_asos_emitido_por_partner_user | btree | emitido_por_partner_user | não | sim |  |
| public.asos | idx_asos_empresa_id | btree | empresa_id | não | sim |  |
| public.asos | idx_asos_empresa_tipo | btree | empresa_id, tipo | não | sim |  |
| public.asos | idx_asos_recebido_rh_por | btree | recebido_rh_por | não | sim |  |
| public.asos | idx_asos_status | btree | empresa_id, status | não | sim |  |
| public.asos | idx_asos_validade | btree | data_validade | não | sim | `(data_validade IS NOT NULL)` |
| public.asos | idx_asos_validado_por | btree | validado_por | não | sim |  |
| public.audit_log | audit_log_pkey | btree | id | sim | sim |  |
| public.audit_log | idx_audit_log_acao | btree | acao | não | sim |  |
| public.audit_log | idx_audit_log_created_at | btree | created_at | não | sim |  |
| public.audit_log | idx_audit_log_empresa_id | btree | empresa_id | não | sim |  |
| public.audit_log | idx_audit_log_registro_created | btree | registro_id, created_at | não | sim |  |
| public.audit_log | idx_audit_log_registro_id | btree | registro_id | não | sim |  |
| public.audit_log | idx_audit_log_status_change | btree | tabela, registro_id, created_at | não | sim | `(acao = 'STATUS_CHANGE'::text)` |
| public.audit_log | idx_audit_log_status_change_scan | btree | tabela, created_at | não | sim | `(acao = 'STATUS_CHANGE'::text)` |
| public.audit_log | idx_audit_log_tabela | btree | tabela | não | sim |  |
| public.audit_log | idx_audit_log_user_created | btree | user_id, created_at | não | sim |  |
| public.audit_log | idx_audit_log_user_id | btree | user_id | não | sim |  |
| public.audit_log_unified | audit_log_unified_pkey | btree | id | sim | sim |  |
| public.audit_log_unified | idx_audit_unified_empresa_occurred | btree | empresa_id, occurred_at | não | sim | `(empresa_id IS NOT NULL)` |
| public.audit_log_unified | idx_audit_unified_entity | btree | entity, entity_id | não | sim |  |
| public.audit_log_unified | idx_audit_unified_occurred_desc | btree | occurred_at | não | sim |  |
| public.audit_log_unified | idx_audit_unified_source | btree | source_table, source_id | não | sim |  |
| public.audit_log_unified | idx_audit_unified_tenant_entity_occurred | btree | empresa_id, entity, occurred_at | não | sim |  |
| public.audit_log_unified | idx_audit_unified_user_occurred | btree | user_id, occurred_at | não | sim | `(user_id IS NOT NULL)` |
| public.audit_log_unified | uq_audit_unified_source | btree | source_table, source_id | sim | sim | `(source_id IS NOT NULL)` |
| public.audit_log_unified_archive | idx_audit_archive_empresa | btree | empresa_id, occurred_at | não | sim |  |
| public.audit_log_unified_archive | idx_audit_archive_occurred_at | btree | occurred_at | não | sim |  |
| public.audit_logs | audit_logs_pkey | btree | id | sim | sim |  |
| public.audit_logs | idx_audit_logs_created_at | btree | created_at | não | sim |  |
| public.audit_logs | idx_audit_logs_empresa_id | btree | empresa_id | não | sim |  |
| public.audit_logs | idx_audit_logs_user_id | btree | user_id | não | sim | `(user_id IS NOT NULL)` |
| public.auditoria | auditoria_pkey | btree | id | sim | sim |  |
| public.auditoria | idx_auditoria_created_at | btree | created_at | não | sim |  |
| public.auditoria | idx_auditoria_entidade | btree | entidade, entidade_id | não | sim |  |
| public.auditoria | idx_auditoria_usuario_id | btree | usuario_id | não | sim | `(usuario_id IS NOT NULL)` |
| public.auditoria_acesso_bancario | auditoria_acesso_bancario_pkey | btree | id | sim | sim |  |
| public.auditoria_contratual | auditoria_contratual_pkey | btree | id | sim | sim |  |
| public.auditoria_contratual | idx_auditoria_contratual_alterado_por | btree | alterado_por | não | sim |  |
| public.auditoria_contratual | idx_auditoria_contratual_colaborador_id | btree | colaborador_id | não | sim |  |
| public.auditoria_logs | auditoria_logs_pkey | btree | id | sim | sim |  |
| public.auditoria_logs | idx_auditoria_logs_created | btree | created_at | não | sim |  |
| public.auditoria_logs | idx_auditoria_logs_created_at | btree | created_at | não | sim |  |
| public.auditoria_logs | idx_auditoria_logs_empresa_created | btree | empresa_id, created_at | não | sim |  |
| public.auditoria_logs | idx_auditoria_logs_empresa_id | btree | empresa_id | não | sim |  |
| public.auditoria_logs | idx_auditoria_logs_entidade | btree | entidade, entidade_id | não | sim |  |
| public.auditoria_logs | idx_auditoria_logs_user | btree | user_id | não | sim |  |
| public.auditoria_logs | idx_auditoria_logs_user_id | btree | user_id | não | sim | `(user_id IS NOT NULL)` |
| public.auth_gov_br_sessions | auth_gov_br_sessions_pkey | btree | id | sim | sim |  |
| public.auth_gov_br_sessions | idx_auth_gov_br_sessions_user_id | btree | user_id | não | sim |  |
| public.automacao_logs | automacao_logs_pkey | btree | id | sim | sim |  |
| public.banco_horas | banco_horas_pkey | btree | id | sim | sim |  |
| public.banco_horas | idx_banco_horas_colaborador_data | btree | colaborador_id, data | não | sim |  |
| public.banco_horas | idx_banco_horas_colaborador_id | btree | colaborador_id | não | sim |  |
| public.banco_horas | idx_banco_horas_empresa_id | btree | empresa_id | não | sim |  |
| public.banco_horas | idx_banco_horas_registro_ponto_id | btree | registro_ponto_id | não | sim |  |
| public.banco_horas_config | banco_horas_config_pkey | btree | id | sim | sim |  |
| public.banco_horas_config | idx_banco_horas_config_empresa_id | btree | empresa_id | não | sim |  |
| public.batidas_ponto | batidas_ponto_colaborador_id_data_ordem_key | btree | colaborador_id, data, ordem | sim | sim |  |
| public.batidas_ponto | batidas_ponto_no_duplicate_batida | btree | colaborador_id, data, hora, tipo | sim | sim |  |
| public.batidas_ponto | batidas_ponto_pkey | btree | id | sim | sim |  |
| public.batidas_ponto | idx_batidas_anomalia_partial | btree | empresa_id, data | não | sim | `(anomalia_detectada = true)` |
| public.batidas_ponto | idx_batidas_colab_data | btree | colaborador_id, data | não | sim |  |
| public.batidas_ponto | idx_batidas_colab_data_desc | btree | colaborador_id, data, hora, tipo, origem, dentro_raio | não | sim |  |
| public.batidas_ponto | idx_batidas_empresa_data | btree | empresa_id, data | não | sim |  |
| public.batidas_ponto | idx_batidas_ponto_anomalia | btree | colaborador_id, data | não | sim | `(anomalia_detectada = true)` |
| public.batidas_ponto | idx_batidas_ponto_colab_data | btree | colaborador_id, data | não | sim |  |
| public.batidas_ponto | idx_batidas_ponto_colaborador_data | btree | colaborador_id, data | não | sim |  |
| public.batidas_ponto | idx_batidas_ponto_colaborador_id | btree | colaborador_id | não | sim |  |
| public.batidas_ponto | idx_batidas_ponto_data | btree | data | não | sim |  |
| public.batidas_ponto | idx_batidas_ponto_empresa_data | btree | empresa_id, data | não | sim |  |
| public.batidas_ponto | idx_batidas_ponto_empresa_id | btree | empresa_id | não | sim |  |
| public.beneficiarios_plano | beneficiarios_plano_pkey | btree | id | sim | sim |  |
| public.beneficiarios_plano | idx_beneficiarios_plano_colaborador_id | btree | colaborador_id | não | sim |  |
| public.beneficiarios_plano | idx_beneficiarios_plano_plano_saude_id | btree | plano_saude_id | não | sim |  |
| public.beneficiarios_seguro | beneficiarios_seguro_pkey | btree | id | sim | sim |  |
| public.beneficiarios_seguro | idx_beneficiarios_seguro_colaborador_id | btree | colaborador_id | não | sim |  |
| public.beneficiarios_seguro | idx_beneficiarios_seguro_seguro_vida_id | btree | seguro_vida_id | não | sim |  |
| public.beneficio_arquivos | beneficio_arquivos_pkey | btree | id | sim | sim |  |
| public.beneficio_arquivos | idx_beneficio_arquivos_beneficio_id | btree | beneficio_id | não | sim |  |
| public.beneficio_arquivos | idx_beneficio_arquivos_empresa_id | btree | empresa_id | não | sim |  |
| public.beneficio_movimentacoes | beneficio_movimentacoes_pkey | btree | id | sim | sim |  |
| public.beneficio_movimentacoes | idx_beneficio_movimentacoes_beneficio_id | btree | beneficio_id | não | sim |  |
| public.beneficio_movimentacoes | idx_beneficio_movimentacoes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.beneficio_movimentacoes | idx_beneficio_movimentacoes_usuario_id | btree | usuario_id | não | sim |  |
| public.beneficio_regras_elegibilidade | beneficio_regras_elegibilidade_pkey | btree | id | sim | sim |  |
| public.beneficio_regras_elegibilidade | idx_beneficio_regras_elegibilidade_beneficio_id | btree | beneficio_id | não | sim |  |
| public.beneficio_regras_elegibilidade | idx_beneficio_regras_elegibilidade_cargo_id | btree | cargo_id | não | sim |  |
| public.beneficio_regras_elegibilidade | idx_beneficio_regras_elegibilidade_departamento_id | btree | departamento_id | não | sim |  |
| public.beneficio_regras_elegibilidade | idx_beneficio_regras_elegibilidade_empresa_id | btree | empresa_id | não | sim |  |
| public.beneficio_utilizacao | beneficio_utilizacao_pkey | btree | id | sim | sim |  |
| public.beneficio_utilizacao | idx_beneficio_utilizacao_beneficio_colaborador_id | btree | beneficio_colaborador_id | não | sim |  |
| public.beneficios | beneficios_pkey | btree | id | sim | sim |  |
| public.beneficios | idx_beneficios_colaborador_id | btree | colaborador_id | não | sim |  |
| public.beneficios | idx_beneficios_empresa_id | btree | empresa_id | não | sim |  |
| public.beneficios_colaborador | beneficios_colaborador_colaborador_id_tipo_beneficio_id_key | btree | colaborador_id, tipo_beneficio_id | sim | sim |  |
| public.beneficios_colaborador | beneficios_colaborador_pkey | btree | id | sim | sim |  |
| public.beneficios_colaborador | idx_beneficios_colaborador_ativo | btree | ativo | não | sim |  |
| public.beneficios_colaborador | idx_beneficios_colaborador_colaborador | btree | colaborador_id | não | sim |  |
| public.beneficios_colaborador | idx_beneficios_colaborador_colaborador_id | btree | colaborador_id | não | sim |  |
| public.beneficios_colaborador | idx_beneficios_colaborador_created_by | btree | created_by | não | sim |  |
| public.beneficios_colaborador | idx_beneficios_colaborador_tipo | btree | tipo_beneficio_id | não | sim |  |
| public.beneficios_colaboradores | beneficios_colaboradores_pkey | btree | id | sim | sim |  |
| public.beneficios_colaboradores | idx_beneficios_colaboradores_beneficio_id | btree | beneficio_id | não | sim |  |
| public.beneficios_colaboradores | idx_beneficios_colaboradores_colaborador_id | btree | colaborador_id | não | sim |  |
| public.bitrix24_config | bitrix24_config_pkey | btree | id | sim | sim |  |
| public.bitrix24_sync_logs | bitrix24_sync_logs_pkey | btree | id | sim | sim |  |
| public.blocked_ips | blocked_ips_ip_address_key | btree | ip_address | sim | sim |  |
| public.blocked_ips | blocked_ips_pkey | btree | id | sim | sim |  |
| public.blocked_ips | idx_blocked_ips_blocked_by | btree | blocked_by | não | sim |  |
| public.blocked_ips | idx_blocked_ips_expires | btree | expires_at | não | sim | `(permanent = false)` |
| public.blocked_ips | idx_blocked_ips_ip | btree | ip_address | não | sim |  |
| public.campos_customizados | campos_customizados_pkey | btree | id | sim | sim |  |
| public.campos_customizados | idx_campos_customizados_empresa_id | btree | empresa_id | não | sim |  |
| public.canal_etica | canal_etica_pkey | btree | id | sim | sim |  |
| public.canal_etica | idx_canal_etica_empresa_id | btree | empresa_id | não | sim |  |
| public.candidatos | candidatos_pkey | btree | id | sim | sim |  |
| public.candidatos | idx_candidatos_empresa_id | btree | empresa_id | não | sim |  |
| public.candidaturas | candidaturas_pkey | btree | id | sim | sim |  |
| public.candidaturas | candidaturas_vaga_id_candidato_id_key | btree | vaga_id, candidato_id | sim | sim |  |
| public.candidaturas | idx_candidaturas_candidato_id | btree | candidato_id | não | sim |  |
| public.candidaturas | idx_candidaturas_empresa_id | btree | empresa_id | não | sim |  |
| public.candidaturas | idx_candidaturas_vaga | btree | vaga_id | não | sim |  |
| public.cargo_faixas_salariais | cargo_faixas_salariais_pkey | btree | id | sim | sim |  |
| public.cargo_faixas_salariais | idx_cargo_faixas_salariais_cargo_id | btree | cargo_id | não | sim |  |
| public.cargos | cargos_pkey | btree | id | sim | sim |  |
| public.cargos | idx_cargos_departamento_id | btree | departamento_id | não | sim |  |
| public.cargos | idx_cargos_empresa_id | btree | empresa_id | não | sim |  |
| public.catalogo_cursos | catalogo_cursos_pkey | btree | id | sim | sim |  |
| public.catalogo_cursos | idx_catalogo_cursos_empresa_id | btree | empresa_id | não | sim |  |
| public.catalogo_infracoes | catalogo_infracoes_empresa_id_codigo_key | btree | empresa_id, codigo | sim | sim |  |
| public.catalogo_infracoes | catalogo_infracoes_pkey | btree | id | sim | sim |  |
| public.catalogo_infracoes | idx_catalogo_infracoes_empresa | btree | empresa_id, ativo | não | sim |  |
| public.categorias_trabalhador | categorias_trabalhador_nome_key | btree | nome | sim | sim |  |
| public.categorias_trabalhador | categorias_trabalhador_pkey | btree | id | sim | sim |  |
| public.cbo | cbo_pkey | btree | codigo | sim | sim |  |
| public.centros_custo | centros_custo_pkey | btree | id | sim | sim |  |
| public.centros_custo | idx_centros_custo_empresa_id | btree | empresa_id | não | sim |  |
| public.certificados_digitais | certificados_digitais_pkey | btree | id | sim | sim |  |
| public.certificados_digitais | idx_certificados_digitais_empresa_id | btree | empresa_id | não | sim |  |
| public.ciclos_avaliacao | ciclos_avaliacao_pkey | btree | id | sim | sim |  |
| public.ciclos_avaliacao | idx_ciclos_avaliacao_empresa_id | btree | empresa_id | não | sim |  |
| public.cid10 | cid10_codigo_key | btree | codigo | sim | sim |  |
| public.cid10 | cid10_pkey | btree | id | sim | sim |  |
| public.ciencia_rate_limits | ciencia_rate_limits_pkey | btree | id | sim | sim |  |
| public.ciencia_rate_limits | idx_ciencia_rate_limits_verif_contrato | btree | identifier, created_at | não | sim | `(rpc_name = 'contrato_verificar_autenticidade_v2'::text)` |
| public.ciencia_rate_limits | idx_ciencia_rl_created | btree | created_at | não | sim |  |
| public.ciencia_rate_limits | idx_ciencia_rl_ip_time | btree | ip_address, rpc_name, created_at | não | sim |  |
| public.clinicas_partners | clinicas_partners_cnpj_empresa_unique | btree | empresa_id, cnpj | sim | sim |  |
| public.clinicas_partners | clinicas_partners_pkey | btree | id | sim | sim |  |
| public.clinicas_partners | idx_clinicas_partners_cidade_uf | btree | uf, cidade | não | sim |  |
| public.clinicas_partners | idx_clinicas_partners_empresa_status | btree | empresa_id, status | não | sim |  |
| public.clinicas_partners | idx_clinicas_partners_geo | btree | geo_lat, geo_lng | não | sim | `(geo_lat IS NOT NULL)` |
| public.clinicas_partners_horarios | clinicas_horarios_unique | btree | clinica_id, dia_semana, hora_abertura | sim | sim |  |
| public.clinicas_partners_horarios | clinicas_partners_horarios_pkey | btree | id | sim | sim |  |
| public.clinicas_partners_horarios | idx_clinicas_horarios_clinica_dia | btree | clinica_id, dia_semana | não | sim |  |
| public.clinicas_partners_servicos | clinicas_partners_servicos_pkey | btree | id | sim | sim |  |
| public.clinicas_partners_servicos | clinicas_servicos_unique | btree | clinica_id, tipo_exame | sim | sim |  |
| public.clinicas_partners_servicos | idx_clinicas_servicos_clinica | btree | clinica_id, ativo | não | sim |  |
| public.cnab_configuracoes | cnab_configuracoes_pkey | btree | id | sim | sim |  |
| public.cnab_configuracoes | idx_cnab_configuracoes_empresa_id | btree | empresa_id | não | sim |  |
| public.cnab_itens | cnab_itens_pkey | btree | id | sim | sim |  |
| public.cnab_itens | cnab_itens_remessa_seu_numero_uk | btree | remessa_id, seu_numero | sim | sim | `(seu_numero IS NOT NULL)` |
| public.cnab_itens | idx_cnab_itens_colaborador_id | btree | colaborador_id | não | sim |  |
| public.cnab_itens | idx_cnab_itens_folha_item_id | btree | folha_item_id | não | sim |  |
| public.cnab_itens | idx_cnab_itens_remessa_id | btree | remessa_id | não | sim |  |
| public.cnab_itens | idx_cnab_itens_seu_numero | btree | seu_numero | não | sim |  |
| public.cnab_remessas | cnab_remessas_empresa_folha_uniq | btree | empresa_id, folha_id | sim | sim | `(folha_id IS NOT NULL)` |
| public.cnab_remessas | cnab_remessas_pkey | btree | id | sim | sim |  |
| public.cnab_remessas | cnab_remessas_sequencial_uk | btree | empresa_id, banco_codigo, sequencial_arquivo | sim | sim |  |
| public.cnab_remessas | idx_cnab_data | btree | data_geracao | não | sim |  |
| public.cnab_remessas | idx_cnab_remessas_empresa_id | btree | empresa_id | não | sim |  |
| public.cnab_remessas | idx_cnab_remessas_folha | btree | folha_id | não | sim |  |
| public.cnab_remessas | idx_cnab_status | btree | empresa_id, status | não | sim |  |
| public.cnab_sequencias | cnab_sequencias_pkey | btree | empresa_id, banco_codigo | sim | sim |  |
| public.cnae | cnae_pkey | btree | codigo | sim | sim |  |
| public.colaborador_beneficios | colaborador_beneficios_beneficio_id_colaborador_id_key | btree | beneficio_id, colaborador_id | sim | sim |  |
| public.colaborador_beneficios | colaborador_beneficios_pkey | btree | id | sim | sim |  |
| public.colaborador_beneficios | idx_colaborador_beneficios_colaborador_id | btree | colaborador_id | não | sim |  |
| public.colaborador_beneficios | idx_colaborador_beneficios_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` |
| public.colaboradores | colaboradores_cpf_key | btree | cpf | sim | sim |  |
| public.colaboradores | colaboradores_empresa_cpf_key | btree | empresa_id, cpf | sim | sim |  |
| public.colaboradores | colaboradores_empresa_email_key | btree | empresa_id, email | sim | sim |  |
| public.colaboradores | colaboradores_empresa_matricula_key | btree | empresa_id, matricula | sim | sim |  |
| public.colaboradores | colaboradores_matricula_key | btree | matricula | sim | sim |  |
| public.colaboradores | colaboradores_pkey | btree | id | sim | sim |  |
| public.colaboradores | colaboradores_user_id_empresa_uniq | btree | user_id, empresa_id | sim | sim | `(user_id IS NOT NULL)` |
| public.colaboradores | colaboradores_user_id_idx | btree | user_id | não | sim | `(user_id IS NOT NULL)` |
| public.colaboradores | idx_colab_supervisor | btree | supervisor_id | não | sim |  |
| public.colaboradores | idx_colaboradores_cargo_id | btree | cargo_id | não | sim | `(cargo_id IS NOT NULL)` |
| public.colaboradores | idx_colaboradores_categoria_trabalhador_id | btree | categoria_trabalhador_id | não | sim |  |
| public.colaboradores | idx_colaboradores_centro_custo_id | btree | centro_custo_id | não | sim |  |
| public.colaboradores | idx_colaboradores_cpf | btree | cpf | não | sim | `(cpf IS NOT NULL)` |
| public.colaboradores | idx_colaboradores_cpf_last4 | btree | cpf_last4 | não | sim | `(cpf_last4 IS NOT NULL)` |
| public.colaboradores | idx_colaboradores_created_by | btree | created_by | não | sim |  |
| public.colaboradores | idx_colaboradores_empresa | btree | empresa_id | não | sim |  |
| public.colaboradores | idx_colaboradores_empresa_ativos | btree | empresa_id, created_at | não | sim | `(status = 'ativo'::status_colaborador)` |
| public.colaboradores | idx_colaboradores_empresa_created | btree | empresa_id, created_at | não | sim |  |
| public.colaboradores | idx_colaboradores_empresa_status | btree | empresa_id, status | não | sim |  |
| public.colaboradores | idx_colaboradores_genero_documento_id | btree | genero_documento_id | não | sim |  |
| public.colaboradores | idx_colaboradores_gestor_ferias_id | btree | gestor_ferias_id | não | sim |  |
| public.colaboradores | idx_colaboradores_local_trabalho_id | btree | local_trabalho_id | não | sim |  |
| public.colaboradores | idx_colaboradores_nacionalidade_id | btree | nacionalidade_id | não | sim |  |
| public.colaboradores | idx_colaboradores_tipo_pagamento_id | btree | tipo_pagamento_id | não | sim |  |
| public.colaboradores | idx_colaboradores_tipo_salario_id | btree | tipo_salario_id | não | sim |  |
| public.colaboradores | ux_colaboradores_cpf_hash | btree | cpf_hash | sim | sim | `(cpf_hash IS NOT NULL)` |
| public.colaboradores_pin | colaboradores_pin_pkey | btree | colaborador_id | sim | sim |  |
| public.competencias_config | competencias_config_pkey | btree | id | sim | sim |  |
| public.competencias_config | idx_competencias_config_empresa_id | btree | empresa_id | não | sim |  |
| public.competencias_matriz | competencias_matriz_pkey | btree | id | sim | sim |  |
| public.competencias_matriz | idx_competencias_matriz_empresa_id | btree | empresa_id | não | sim |  |
| public.comunicados | comunicados_pkey | btree | id | sim | sim |  |
| public.comunicados | idx_comunicados_empresa_id | btree | empresa_id | não | sim |  |
| public.comunicados_leituras | comunicados_leituras_pkey | btree | id | sim | sim |  |
| public.comunicados_leituras | idx_comunicados_leituras_comunicado_id | btree | comunicado_id | não | sim |  |
| public.condicoes_ingresso | condicoes_ingresso_nome_key | btree | nome | sim | sim |  |
| public.condicoes_ingresso | condicoes_ingresso_pkey | btree | id | sim | sim |  |
| public.config_afastamentos | config_afastamentos_pkey | btree | id | sim | sim |  |
| public.config_afastamentos | config_afastamentos_tipo_key | btree | tipo | sim | sim |  |
| public.config_alertas_indicadores | config_alertas_indicadores_pkey | btree | id | sim | sim |  |
| public.config_alertas_indicadores | config_alertas_indicadores_tipo_key | btree | tipo | sim | sim |  |
| public.configuracoes | configuracoes_chave_key | btree | chave | sim | sim |  |
| public.configuracoes | configuracoes_pkey | btree | id | sim | sim |  |
| public.configuracoes_alertas | configuracoes_alertas_pkey | btree | id | sim | sim |  |
| public.configuracoes_esocial | configuracoes_esocial_empresa_id_key | btree | empresa_id | sim | sim |  |
| public.configuracoes_esocial | configuracoes_esocial_pkey | btree | id | sim | sim |  |
| public.configuracoes_esocial | idx_configuracoes_esocial_certificado_id | btree | certificado_id | não | sim |  |
| public.configuracoes_intervalo | configuracoes_intervalo_pkey | btree | id | sim | sim |  |
| public.configuracoes_intervalo | idx_configuracoes_intervalo_empresa_id | btree | empresa_id | não | sim |  |
| public.configuracoes_ponto | configuracoes_ponto_empresa_id_key | btree | empresa_id | sim | sim |  |
| public.configuracoes_ponto | configuracoes_ponto_pkey | btree | id | sim | sim |  |
| public.conformidade_ponto_logs | conformidade_ponto_logs_pkey | btree | id | sim | sim |  |
| public.conformidade_ponto_logs | idx_conformidade_ponto_logs_batida_id | btree | batida_id | não | sim |  |
| public.conformidade_ponto_logs | idx_conformidade_ponto_logs_empresa_id | btree | empresa_id | não | sim |  |
| public.contabilidade_contatos | contabilidade_contatos_empresa_id_email_key | btree | empresa_id, email | sim | sim |  |
| public.contabilidade_contatos | contabilidade_contatos_pkey | btree | id | sim | sim |  |
| public.contabilidade_contatos | idx_contab_contatos_empresa | btree | empresa_id | não | sim | `(ativo = true)` |
| public.contabilidade_mensagens | contabilidade_mensagens_pkey | btree | id | sim | sim |  |
| public.contabilidade_mensagens | idx_contab_msg_autor_id | btree | autor_id | não | sim |  |
| public.contabilidade_mensagens | idx_contab_msg_empresa_id | btree | empresa_id | não | sim |  |
| public.contabilidade_mensagens | idx_contab_msgs_thread | btree | thread_id, created_at | não | sim |  |
| public.contabilidade_threads | contabilidade_threads_pkey | btree | id | sim | sim |  |
| public.contabilidade_threads | idx_contab_threads_aberto_por | btree | aberto_por | não | sim |  |
| public.contabilidade_threads | idx_contab_threads_contato_id | btree | contato_id | não | sim |  |
| public.contabilidade_threads | idx_contab_threads_empresa_ativ | btree | empresa_id, ultima_atividade_em | não | sim |  |
| public.contabilidade_threads | idx_contab_threads_status | btree | empresa_id, status | não | sim | `(status = ANY (ARRAY['aberto'::text, 'respondido'::text]))` |
| public.contas_bancarias | contas_bancarias_pkey | btree | id | sim | sim |  |
| public.contas_bancarias | idx_contas_bancarias_colaborador_id | btree | colaborador_id | não | sim |  |
| public.contas_bancarias | idx_contas_bancarias_empresa_id | btree | empresa_id | não | sim |  |
| public.contatos_emergencia | contatos_emergencia_pkey | btree | id | sim | sim |  |
| public.contatos_emergencia | idx_contatos_emergencia_col | btree | colaborador_id | não | sim |  |
| public.contatos_emergencia | idx_contatos_emergencia_colaborador_id | btree | colaborador_id | não | sim |  |
| public.contatos_emergencia | idx_contatos_emergencia_relacionamento_id | btree | relacionamento_id | não | sim |  |
| public.contrato_assinatura_tokens | contrato_assinatura_tokens_pkey | btree | id | sim | sim |  |
| public.contrato_assinatura_tokens | contrato_assinatura_tokens_token_hash_key | btree | token_hash | sim | sim |  |
| public.contrato_assinatura_tokens | idx_contrato_tokens_ativo | btree | contrato_id | não | sim | `((usado_em IS NULL) AND (revogado_em IS NULL))` |
| public.contrato_assinatura_tokens | idx_contrato_tokens_contrato | btree | contrato_id | não | sim |  |
| public.contrato_assinatura_tokens | idx_contrato_tokens_expira | btree | expira_em | não | sim | `(usado_em IS NULL)` |
| public.contrato_assinatura_tokens | idx_contrato_tokens_pending_reminder | btree | created_at | não | sim | `(usado_em IS NULL)` |
| public.contrato_templates | contrato_templates_pkey | btree | id | sim | sim |  |
| public.contrato_templates | idx_contrato_templates_cargo | btree | cargo_id | não | sim | `ativo` |
| public.contrato_templates | idx_contrato_templates_empresa | btree | empresa_id | não | sim | `ativo` |
| public.contrato_templates | uq_contrato_templates_default | btree | empresa_id, tipo_contrato | sim | sim | `ativo` |
| public.contrato_token_eventos | contrato_token_eventos_pkey | btree | id | sim | sim |  |
| public.contrato_token_eventos | idx_ctk_eventos_contrato | btree | contrato_id, created_at | não | sim |  |
| public.contrato_token_eventos | idx_ctk_eventos_empresa | btree | empresa_id, created_at | não | sim |  |
| public.contrato_token_eventos | idx_ctk_eventos_token | btree | token_id, created_at | não | sim |  |
| public.contratos | contratos_pkey | btree | id | sim | sim |  |
| public.contratos | idx_contratos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.contratos | idx_contratos_empresa_id | btree | empresa_id | não | sim |  |
| public.contratos_gerados | contratos_gerados_pkey | btree | id | sim | sim |  |
| public.contratos_gerados | idx_contratos_gerados_admissao | btree | admissao_id | não | sim |  |
| public.contratos_gerados | idx_contratos_gerados_colaborador | btree | colaborador_id | não | sim |  |
| public.contratos_gerados | idx_contratos_gerados_empresa | btree | empresa_id | não | sim |  |
| public.contratos_gerados | idx_contratos_gerados_hash | btree | sha256 | não | sim |  |
| public.contratos_gerados | idx_contratos_gerados_vencimento | btree | data_fim | não | sim | `((data_fim IS NOT NULL) AND (status = ANY (ARRAY['gerado'::text, 'enviado'::text, 'assinado'::text])))` |
| public.controle_acesso | controle_acesso_pkey | btree | id | sim | sim |  |
| public.controle_acesso | idx_controle_acesso_colaborador_id | btree | colaborador_id | não | sim |  |
| public.controle_acesso | idx_controle_acesso_empresa_id | btree | empresa_id | não | sim |  |
| public.convenios | convenios_pkey | btree | id | sim | sim |  |
| public.convenios | idx_convenios_empresa_id | btree | empresa_id | não | sim |  |
| public.convenios_colaboradores | convenios_colaboradores_pkey | btree | id | sim | sim |  |
| public.convenios_colaboradores | idx_convenios_colaboradores_colaborador_id | btree | colaborador_id | não | sim |  |
| public.convenios_colaboradores | idx_convenios_colaboradores_convenio_id | btree | convenio_id | não | sim |  |
| public.curriculos_arquivos | curriculos_arquivos_pkey | btree | id | sim | sim |  |
| public.curriculos_arquivos | idx_curriculos_arquivos_candidato_id | btree | candidato_id | não | sim |  |
| public.curriculos_arquivos | idx_curriculos_arquivos_empresa_id | btree | empresa_id | não | sim |  |
| public.dados_estagiario | dados_estagiario_pkey | btree | id | sim | sim |  |
| public.dados_estagiario | idx_dados_estagiario_colaborador_id | btree | colaborador_id | não | sim |  |
| public.dados_estagiario | idx_dados_estagiario_empresa_id | btree | empresa_id | não | sim |  |
| public.dados_estagiario | idx_dados_estagiario_supervisor_id | btree | supervisor_id | não | sim |  |
| public.dados_estrangeiro | dados_estrangeiro_colaborador_id_key | btree | colaborador_id | sim | sim |  |
| public.dados_estrangeiro | dados_estrangeiro_pkey | btree | id | sim | sim |  |
| public.dados_estrangeiro | idx_dados_estrangeiro_colaborador_id | btree | colaborador_id | não | sim |  |
| public.dados_estrangeiro | idx_dados_estrangeiro_condicao_ingresso_id | btree | condicao_ingresso_id | não | sim |  |
| public.dados_estrangeiro | idx_dados_estrangeiro_descricao_logradouro_id | btree | descricao_logradouro_id | não | sim |  |
| public.dados_estrangeiro | idx_dados_estrangeiro_pais_id | btree | pais_id | não | sim |  |
| public.dados_estrangeiro | idx_dados_estrangeiro_tempo_residencia_id | btree | tempo_residencia_id | não | sim |  |
| public.dados_estrangeiro | idx_dados_estrangeiro_tipo_visto_id | btree | tipo_visto_id | não | sim |  |
| public.dctfweb_declaracoes | dctfweb_declaracoes_pkey | btree | id | sim | sim |  |
| public.dctfweb_declaracoes | idx_dctfweb_declaracoes_empresa_id | btree | empresa_id | não | sim |  |
| public.deficiencias | deficiencias_colaborador_id_key | btree | colaborador_id | sim | sim |  |
| public.deficiencias | deficiencias_pkey | btree | id | sim | sim |  |
| public.deficiencias | idx_deficiencias_colaborador_id | btree | colaborador_id | não | sim |  |
| public.departamentos | departamentos_empresa_nome_key | btree | empresa_id, nome | sim | sim |  |
| public.departamentos | departamentos_pkey | btree | id | sim | sim |  |
| public.departamentos | idx_departamentos_departamento_pai_id | btree | departamento_pai_id | não | sim |  |
| public.departamentos | idx_departamentos_empresa_id | btree | empresa_id | não | sim |  |
| public.departamentos | idx_departamentos_responsavel_id | btree | responsavel_id | não | sim |  |
| public.dependentes | dependentes_pkey | btree | id | sim | sim |  |
| public.dependentes | idx_dependentes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.dependentes | idx_dependentes_genero_documento_id | btree | genero_documento_id | não | sim |  |
| public.dependentes | idx_dependentes_relacionamento_id | btree | relacionamento_id | não | sim |  |
| public.dependentes_beneficios | dependentes_beneficios_dependente_id_beneficio_id_key | btree | dependente_id, beneficio_id | sim | sim |  |
| public.dependentes_beneficios | dependentes_beneficios_pkey | btree | id | sim | sim |  |
| public.dependentes_beneficios | idx_dependentes_beneficios_beneficio_id | btree | beneficio_id | não | sim |  |
| public.descricoes_logradouro | descricoes_logradouro_nome_key | btree | nome | sim | sim |  |
| public.descricoes_logradouro | descricoes_logradouro_pkey | btree | id | sim | sim |  |
| public.desligamentos | desligamentos_pkey | btree | id | sim | sim |  |
| public.desligamentos | idx_desligamentos_colab_status | btree | colaborador_id, status | não | sim |  |
| public.desligamentos | idx_desligamentos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.desligamentos | idx_desligamentos_created_by | btree | created_by | não | sim |  |
| public.desligamentos | idx_desligamentos_data | btree | empresa_id, data_desligamento | não | sim |  |
| public.desligamentos | idx_desligamentos_empresa_created | btree | empresa_id, created_at | não | sim |  |
| public.desligamentos | idx_desligamentos_empresa_id | btree | empresa_id | não | sim |  |
| public.desligamentos | idx_desligamentos_status | btree | status | não | sim |  |
| public.desligamentos | idx_desligamentos_tipo_aviso_previo_id | btree | tipo_aviso_previo_id | não | sim |  |
| public.desligamentos | idx_desligamentos_tipo_desligamento_id | btree | tipo_desligamento_id | não | sim |  |
| public.despesas | despesas_pkey | btree | id | sim | sim |  |
| public.despesas | idx_despesas_colaborador | btree | colaborador_id | não | sim |  |
| public.despesas | idx_despesas_colaborador_id | btree | colaborador_id | não | sim |  |
| public.despesas | idx_despesas_empresa_id | btree | empresa_id | não | sim |  |
| public.despesas | idx_despesas_empresa_status | btree | empresa_id, status | não | sim |  |
| public.despesas | idx_despesas_folha | btree | folha_id | não | sim | `(folha_id IS NOT NULL)` |
| public.despesas_aprovacoes_log | despesas_aprovacoes_log_pkey | btree | id | sim | sim |  |
| public.despesas_aprovacoes_log | idx_despesas_log_despesa | btree | despesa_id, created_at | não | sim |  |
| public.documento_templates | documento_templates_pkey | btree | id | sim | sim |  |
| public.documento_templates | idx_documento_templates_created_by | btree | created_by | não | sim |  |
| public.documento_templates | idx_documento_templates_empresa_id | btree | empresa_id | não | sim |  |
| public.documentos | documentos_empresa_id_idx | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` |
| public.documentos | documentos_pkey | btree | id | sim | sim |  |
| public.documentos | idx_documentos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.documentos_admissao | documentos_admissao_pkey | btree | id | sim | sim |  |
| public.documentos_admissao | idx_documentos_admissao_admissao_id | btree | admissao_id | não | sim |  |
| public.documentos_afastamento | documentos_afastamento_pkey | btree | id | sim | sim |  |
| public.documentos_afastamento | idx_documentos_afastamento_afastamento_id | btree | afastamento_id | não | sim |  |
| public.documentos_assinatura | documentos_assinatura_pkey | btree | id | sim | sim |  |
| public.documentos_assinatura | idx_documentos_assinatura_colaborador | btree | colaborador_id | não | sim |  |
| public.documentos_assinatura | idx_documentos_assinatura_created | btree | created_at | não | sim |  |
| public.documentos_assinatura | idx_documentos_assinatura_empresa_id | btree | empresa_id | não | sim |  |
| public.documentos_assinatura | idx_documentos_assinatura_status | btree | status | não | sim |  |
| public.documentos_colaborador | documentos_colaborador_pkey | btree | id | sim | sim |  |
| public.documentos_colaborador | idx_documentos_colaborador_colaborador_id | btree | colaborador_id | não | sim |  |
| public.documentos_colaborador | idx_documentos_colaborador_created_by | btree | created_by | não | sim |  |
| public.documentos_colaborador | idx_documentos_colaborador_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` |
| public.documentos_historico | documentos_historico_pkey | btree | id | sim | sim |  |
| public.documentos_historico | idx_documentos_historico_documento_id | btree | documento_id | não | sim |  |
| public.documentos_historico | idx_documentos_historico_usuario_id | btree | usuario_id | não | sim |  |
| public.documentos_pessoais_arquivos | documentos_pessoais_arquivos_pkey | btree | id | sim | sim |  |
| public.documentos_pessoais_arquivos | idx_documentos_pessoais_arquivos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.dp_audit_config | dp_audit_config_enabled_idx | btree | table_name | não | sim | `(enabled = true)` |
| public.dp_audit_config | dp_audit_config_pkey | btree | id | sim | sim |  |
| public.dp_audit_config | dp_audit_config_table_name_key | btree | table_name | sim | sim |  |
| public.dp_audit_log | dp_audit_log_actor_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log | dp_audit_log_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log | dp_audit_log_event_idx | btree | event | não | sim |  |
| public.dp_audit_log | dp_audit_log_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log | dp_audit_log_ip_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log | dp_audit_log_payload_gin | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log | dp_audit_log_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log | dp_audit_log_request_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2026_07 | dp_audit_log_2026_07_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2026_08 | dp_audit_log_2026_08_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2026_09 | dp_audit_log_2026_09_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2026_10 | dp_audit_log_2026_10_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2026_11 | dp_audit_log_2026_11_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2026_12 | dp_audit_log_2026_12_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_2027_01 | dp_audit_log_2027_01_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_audit_log_default | dp_audit_log_default_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` |
| public.dp_audit_log_default | dp_audit_log_default_created_at_idx | btree | created_at | não | sim |  |
| public.dp_audit_log_default | dp_audit_log_default_event_idx | btree | event | não | sim |  |
| public.dp_audit_log_default | dp_audit_log_default_event_type_idx | btree | event_type | não | sim |  |
| public.dp_audit_log_default | dp_audit_log_default_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` |
| public.dp_audit_log_default | dp_audit_log_default_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` |
| public.dp_audit_log_default | dp_audit_log_default_pkey | btree | id, created_at | sim | sim |  |
| public.dp_audit_log_default | dp_audit_log_default_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.dp_backup_runbook | dp_backup_runbook_pkey | btree | id | sim | sim |  |
| public.dp_backup_runbook | dp_backup_runbook_step_number_key | btree | step_number | sim | sim |  |
| public.dp_data_catalog | dp_data_catalog_pkey | btree | id | sim | sim |  |
| public.dp_data_catalog | dp_data_catalog_sensitivity_idx | btree | sensitivity | não | sim |  |
| public.dp_data_catalog | dp_data_catalog_table_idx | btree | table_name | não | sim |  |
| public.dp_data_catalog | dp_data_catalog_table_name_column_name_key | btree | table_name, column_name | sim | sim |  |
| public.dp_environments | dp_environments_env_name_key | btree | env_name | sim | sim |  |
| public.dp_environments | dp_environments_pkey | btree | id | sim | sim |  |
| public.dp_mcp_config | dp_mcp_config_config_key_key | btree | config_key | sim | sim |  |
| public.dp_mcp_config | dp_mcp_config_pkey | btree | id | sim | sim |  |
| public.dp_retention_policy | dp_retention_policy_enabled_idx | btree | table_name | não | sim | `(enabled = true)` |
| public.dp_retention_policy | dp_retention_policy_pkey | btree | id | sim | sim |  |
| public.dp_retention_policy | dp_retention_policy_table_name_retention_days_action_key | btree | table_name, retention_days, action | sim | sim |  |
| public.dp_user_roles | dp_user_roles_active_idx | btree | user_id, role | não | sim | `(active = true)` |
| public.dp_user_roles | dp_user_roles_pkey | btree | id | sim | sim |  |
| public.dp_user_roles | dp_user_roles_user_id_role_key | btree | user_id, role | sim | sim |  |
| public.dp_user_roles | dp_user_roles_user_idx | btree | user_id | não | sim | `(active = true)` |
| public.empresas | empresas_cnpj_key | btree | cnpj | sim | sim |  |
| public.empresas | empresas_pkey | btree | id | sim | sim |  |
| public.empresas | idx_empresas_ativa | btree | ativa | não | sim | `(ativa = true)` |
| public.empresas | idx_empresas_ordem_exibicao | btree | ordem_exibicao | não | sim |  |
| public.empresas | idx_empresas_razao_social | btree | razao_social | não | sim |  |
| public.emprestimos_consignados | emprestimos_consignados_pkey | btree | id | sim | sim |  |
| public.emprestimos_consignados | idx_emprestimos_consignados_colaborador_id | btree | colaborador_id | não | sim |  |
| public.emprestimos_consignados | idx_emprestimos_consignados_empresa_id | btree | empresa_id | não | sim |  |
| public.epis | epis_pkey | btree | id | sim | sim |  |
| public.epis | idx_epis_empresa_id | btree | empresa_id | não | sim |  |
| public.epis_entregas | epis_entregas_pkey | btree | id | sim | sim |  |
| public.epis_entregas | idx_epis_entregas_colaborador_id | btree | colaborador_id | não | sim |  |
| public.epis_entregas | idx_epis_entregas_empresa_id | btree | empresa_id | não | sim |  |
| public.epis_entregas | idx_epis_entregas_epi_id | btree | epi_id | não | sim |  |
| public.epis_fichas | epis_fichas_pkey | btree | id | sim | sim |  |
| public.epis_fichas | idx_epis_fichas_colab | btree | colaborador_id | não | sim |  |
| public.epis_fichas | idx_epis_fichas_empresa | btree | empresa_id | não | sim |  |
| public.epis_fichas | idx_epis_fichas_responsavel_id | btree | responsavel_id | não | sim |  |
| public.epis_fichas | idx_epis_fichas_status | btree | empresa_id, status | não | sim |  |
| public.epis_fichas_assinaturas | epis_fichas_assinaturas_ficha_id_key | btree | ficha_id | sim | sim |  |
| public.epis_fichas_assinaturas | epis_fichas_assinaturas_pkey | btree | id | sim | sim |  |
| public.epis_fichas_itens | epis_fichas_itens_pkey | btree | id | sim | sim |  |
| public.epis_fichas_itens | idx_epis_fichas_itens_epi_id | btree | epi_id | não | sim |  |
| public.epis_fichas_itens | idx_epis_itens_ficha | btree | ficha_id | não | sim |  |
| public.epis_fichas_itens | idx_epis_itens_status | btree | status_item | não | sim |  |
| public.escalas | escalas_pkey | btree | id | sim | sim |  |
| public.escalas | idx_escalas_empresa_id | btree | empresa_id | não | sim |  |
| public.escalas_trabalho | escalas_trabalho_pkey | btree | id | sim | sim |  |
| public.escalas_trabalho | idx_escalas_trabalho_colaborador_id | btree | colaborador_id | não | sim |  |
| public.escalas_trabalho | idx_escalas_trabalho_empresa_id | btree | empresa_id | não | sim |  |
| public.escalas_trabalho | idx_escalas_trabalho_turno_id | btree | turno_id | não | sim |  |
| public.esocial_eventos | esocial_eventos_pkey | btree | id | sim | sim |  |
| public.esocial_eventos | idx_esocial_eventos_empresa_id | btree | empresa_id | não | sim |  |
| public.esocial_eventos | idx_esocial_eventos_medida | btree |  | não | sim | `(tipo_evento = ANY (ARRAY['S-2299'::text, 'S-2206'::text]))` |
| public.esocial_eventos | idx_esocial_status_comp | btree | status, competencia | não | sim |  |
| public.esocial_eventos | idx_esocial_tipo | btree | empresa_id, tipo_evento | não | sim |  |
| public.esocial_eventos | uq_esocial_eventos_admissao_s2200 | btree | admissao_id | sim | sim | `((admissao_id IS NOT NULL) AND (tipo_evento = 'S-2200'::text))` |
| public.esocial_lotes | esocial_lotes_pkey | btree | id | sim | sim |  |
| public.esocial_lotes | idx_esocial_lotes_empresa_id | btree | empresa_id | não | sim |  |
| public.esocial_transmissao_logs | esocial_transmissao_logs_pkey | btree | id | sim | sim |  |
| public.esocial_transmissao_logs | idx_esocial_transmissao_logs_evento_id | btree | evento_id | não | sim |  |
| public.etnias | etnias_nome_key | btree | nome | sim | sim |  |
| public.etnias | etnias_pkey | btree | id | sim | sim |  |
| public.eventos_variaveis | eventos_variaveis_pkey | btree | id | sim | sim |  |
| public.eventos_variaveis | idx_eventos_variaveis_colaborador_id | btree | colaborador_id | não | sim |  |
| public.eventos_variaveis | idx_eventos_variaveis_created_by | btree | created_by | não | sim |  |
| public.eventos_variaveis | idx_eventos_variaveis_origem_ferias | btree | origem_ferias_id | não | sim |  |
| public.eventos_variaveis | idx_eventos_variaveis_rubrica_id | btree | rubrica_id | não | sim |  |
| public.eventos_variaveis | uq_eventos_variaveis_ferias_rubrica | btree | origem_ferias_id, rubrica_id | sim | sim | `(origem_ferias_id IS NOT NULL)` |
| public.exames | exames_pkey | btree | id | sim | sim |  |
| public.exames | idx_exames_colaborador_id | btree | colaborador_id | não | sim |  |
| public.exames_agendamentos | exames_agendamentos_pkey | btree | id | sim | sim |  |
| public.exames_agendamentos | idx_exames_agend_clinica | btree | clinica_id | não | sim |  |
| public.exames_agendamentos | idx_exames_agend_colaborador | btree | colaborador_id | não | sim |  |
| public.exames_agendamentos | idx_exames_agend_data | btree | data_agendada | não | sim |  |
| public.exames_agendamentos | idx_exames_agend_empresa_status | btree | empresa_id, status | não | sim |  |
| public.faixas_inss | faixas_inss_pkey | btree | id | sim | sim |  |
| public.faixas_irrf | faixas_irrf_pkey | btree | id | sim | sim |  |
| public.faltas | faltas_pkey | btree | id | sim | sim |  |
| public.faltas | idx_faltas_colab_data | btree | colaborador_id, data | não | sim |  |
| public.faltas | idx_faltas_colaborador_id | btree | colaborador_id | não | sim |  |
| public.faltas | idx_faltas_empresa_data | btree | empresa_id, data | não | sim |  |
| public.faltas | idx_faltas_empresa_id | btree | empresa_id | não | sim |  |
| public.faltas | idx_faltas_motivo_afastamento_id | btree | motivo_afastamento_id | não | sim |  |
| public.feedbacks_360 | feedbacks_360_pkey | btree | id | sim | sim |  |
| public.feedbacks_360 | idx_feedbacks_360_avaliado_id | btree | avaliado_id | não | sim |  |
| public.feedbacks_360 | idx_feedbacks_360_avaliador_id | btree | avaliador_id | não | sim |  |
| public.feedbacks_360 | idx_feedbacks_360_ciclo_id | btree | ciclo_id | não | sim |  |
| public.feedbacks_360 | idx_feedbacks_360_empresa_id | btree | empresa_id | não | sim |  |
| public.feedbacks_360_aprovacoes_gestor | feedbacks_360_aprovacoes_gestor_idempotency_key_key | btree | idempotency_key | sim | sim |  |
| public.feedbacks_360_aprovacoes_gestor | feedbacks_360_aprovacoes_gestor_pkey | btree | id | sim | sim |  |
| public.feedbacks_360_aprovacoes_gestor | idx_fb360_aprov_gestor | btree | empresa_id, ciclo_id, colaborador_id, decidido_em | não | sim |  |
| public.feedbacks_360_consolidacoes | feedbacks_360_consolidacoes_empresa_id_ciclo_id_colaborador_key | btree | empresa_id, ciclo_id, colaborador_id | sim | sim |  |
| public.feedbacks_360_consolidacoes | feedbacks_360_consolidacoes_pkey | btree | id | sim | sim |  |
| public.feedbacks_360_consolidacoes | idx_fb360_consolidacoes_gestor | btree | gestor_responsavel_user_id, status | não | sim |  |
| public.feedbacks_360_operacoes | feedbacks_360_operacoes_pkey | btree | idempotency_key | sim | sim |  |
| public.feedbacks_360_validacoes_potencial | feedbacks_360_validacoes_potencial_pkey | btree | id | sim | sim |  |
| public.feedbacks_360_validacoes_potencial | idx_fb360_validacoes_potencial | btree | feedback_id, validado_em | não | sim |  |
| public.feriados | feriados_pkey | btree | id | sim | sim |  |
| public.feriados | idx_feriados_empresa_id | btree | empresa_id | não | sim |  |
| public.ferias | ferias_pkey | btree | id | sim | sim |  |
| public.ferias | idx_ferias_adiant13_empresa | btree | empresa_id, adiantamento_13_ano_exercicio | não | sim | `(adiantamento_13o = true)` |
| public.ferias | idx_ferias_colab_status | btree | colaborador_id, status | não | sim |  |
| public.ferias | idx_ferias_colaborador_id | btree | colaborador_id | não | sim |  |
| public.ferias | idx_ferias_data_inicio | btree | data_inicio | não | sim |  |
| public.ferias | idx_ferias_empresa_id | btree | empresa_id | não | sim |  |
| public.ferias | idx_ferias_empresa_inicio | btree | empresa_id, data_inicio | não | sim |  |
| public.ferias | idx_ferias_empresa_status | btree | empresa_id, status | não | sim |  |
| public.ferias | idx_ferias_pagamento_pend | btree | empresa_id, data_inicio | não | sim | `((pagamento_confirmado_em IS NULL) AND ((status)::text = ANY (ARRAY[('aprovada'::character varying)::text, ('programada'::character varying)::text])))` |
| public.ferias | idx_ferias_periodo_aquisitivo_id | btree | periodo_aquisitivo_id | não | sim |  |
| public.ferias | uq_ferias_adiant13_ano | btree | colaborador_id, adiantamento_13_ano_exercicio | sim | sim | `((adiantamento_13o = true) AND (adiantamento_13_ano_exercicio IS NOT NULL))` |
| public.ferias_aprovacoes | ferias_aprovacoes_pkey | btree | id | sim | sim |  |
| public.ferias_aprovacoes | idx_ferias_aprovacoes_ferias_id | btree | ferias_id | não | sim |  |
| public.ferias_aprovacoes_log | ferias_aprovacoes_log_pkey | btree | id | sim | sim |  |
| public.ferias_aprovacoes_log | idx_ferias_aprovacoes_log_aprovador_id | btree | aprovador_id | não | sim |  |
| public.ferias_aprovacoes_log | idx_ferias_aprovacoes_log_ferias_id | btree | ferias_id | não | sim |  |
| public.ferias_arquivos | ferias_arquivos_pkey | btree | id | sim | sim |  |
| public.ferias_arquivos | idx_ferias_arquivos_ferias_id | btree | ferias_id | não | sim |  |
| public.ferias_audit_log | ferias_audit_log_pkey | btree | id | sim | sim |  |
| public.ferias_audit_log | idx_ferias_audit_entidade | btree | entidade_tipo, entidade_id | não | sim |  |
| public.ferias_audit_log | idx_ferias_audit_log_created_at | btree | created_at | não | sim |  |
| public.ferias_audit_log | idx_ferias_audit_log_empresa_id | btree | empresa_id | não | sim |  |
| public.ferias_audit_log | idx_ferias_audit_log_usuario_id | btree | usuario_id | não | sim |  |
| public.ferias_audit_log | idx_ferias_audit_usuario_id | btree | usuario_id | não | sim | `(usuario_id IS NOT NULL)` |
| public.ferias_coletivas | ferias_coletivas_pkey | btree | id | sim | sim |  |
| public.ferias_coletivas | idx_ferias_coletivas_empresa_id | btree | empresa_id | não | sim |  |
| public.ferias_programacao | ferias_programacao_pkey | btree | id | sim | sim |  |
| public.ferias_programacao | idx_fprog_colaborador | btree | colaborador_id | não | sim |  |
| public.ferias_programacao | idx_fprog_empresa_ano_mes | btree | empresa_id, ano, mes_previsto | não | sim |  |
| public.ferias_programacao | idx_fprog_ferias | btree | ferias_id | não | sim | `(ferias_id IS NOT NULL)` |
| public.ferias_programacao | idx_fprog_status | btree | empresa_id, status | não | sim |  |
| public.ferias_programacao | uq_fprog_unico_ativo | btree | colaborador_id, ano, periodo_aquisitivo_id | sim | sim | `(status <> 'cancelado'::programacao_ferias_status)` |
| public.ferias_reconciliacao_logs | ferias_reconciliacao_logs_pkey | btree | id | sim | sim |  |
| public.ferias_reconciliacao_logs | idx_ferias_reconc_logs_empresa | btree | empresa_id, executado_em | não | sim |  |
| public.ferias_reconciliacao_logs | idx_ferias_reconciliacao_logs_empresa_executado | btree | empresa_id, executado_em | não | sim |  |
| public.ferias_reconciliacao_logs | idx_ferias_reconciliacao_logs_pendencias | btree | empresa_id, executado_em | não | sim | `(restantes > 0)` |
| public.ferias_solicitacoes | ferias_solicitacoes_pkey | btree | id | sim | sim |  |
| public.ferias_solicitacoes | idx_ferias_solicitacoes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.ferias_solicitacoes | idx_ferias_solicitacoes_empresa_id | btree | empresa_id | não | sim |  |
| public.fgts_digital_logs | fgts_digital_logs_pkey | btree | id | sim | sim |  |
| public.fgts_digital_logs | idx_fgts_digital_logs_guia_id | btree | guia_id | não | sim |  |
| public.fila_notificacoes | fila_notificacoes_pkey | btree | id | sim | sim |  |
| public.fila_notificacoes | idx_fila_notificacoes_status_scheduled | btree | status, scheduled_for | não | sim |  |
| public.fila_notificacoes | idx_fila_notificacoes_user_id | btree | user_id | não | sim |  |
| public.fila_processamento | fila_processamento_pkey | btree | id | sim | sim |  |
| public.fila_processamento | idx_fila_dlq | btree | dlq_movido_em | não | sim | `(dlq = true)` |
| public.fila_processamento | idx_fila_processamento_status | btree | status | não | sim | `(status = 'pendente'::text)` |
| public.fila_processamento | idx_fila_processamento_usuario | btree | usuario_id | não | sim |  |
| public.fila_processamento | idx_fila_ready_to_process | btree | created_at | não | sim | `((status = 'pending'::text) AND (dlq = false))` |
| public.folha_assinaturas | folha_assinaturas_pkey | btree | id | sim | sim |  |
| public.folha_assinaturas | idx_folha_assinaturas_assinante_id | btree | assinante_id | não | sim |  |
| public.folha_assinaturas | idx_folha_assinaturas_folha_id | btree | folha_id | não | sim |  |
| public.folha_auditoria | folha_auditoria_pkey | btree | id | sim | sim |  |
| public.folha_auditoria | idx_folha_auditoria_colaborador | btree | colaborador_id | não | sim |  |
| public.folha_auditoria | idx_folha_auditoria_created_at | btree | created_at | não | sim |  |
| public.folha_auditoria | idx_folha_auditoria_criado_por | btree | criado_por | não | sim |  |
| public.folha_auditoria | idx_folha_auditoria_folha | btree | folha_id | não | sim |  |
| public.folha_eventos_auditoria | folha_eventos_auditoria_pkey | btree | id | sim | sim |  |
| public.folha_eventos_auditoria | idx_folha_eventos_auditoria_folha_id | btree | folha_id | não | sim |  |
| public.folha_eventos_auditoria | idx_folha_eventos_auditoria_usuario_id | btree | usuario_id | não | sim |  |
| public.folha_itens | folha_itens_folha_colaborador_unique | btree | folha_id, colaborador_id | sim | sim |  |
| public.folha_itens | folha_itens_pkey | btree | id | sim | sim |  |
| public.folha_itens | idx_folha_itens_colaborador_id | btree | colaborador_id | não | sim |  |
| public.folha_itens | idx_folha_itens_folha_colab_covering | btree | folha_id, colaborador_id, total_liquido, total_proventos, total_descontos | não | sim |  |
| public.folha_itens | idx_folha_itens_folha_id | btree | folha_id | não | sim |  |
| public.folha_lock_conflicts | folha_lock_conflicts_pkey | btree | id | sim | sim |  |
| public.folha_lock_conflicts | idx_folha_lock_conflicts_folha | btree | folha_id, created_at | não | sim |  |
| public.folhas_pagamento | folhas_pagamento_empresa_comp_tipo_unique | btree | empresa_id, competencia, tipo | sim | sim |  |
| public.folhas_pagamento | folhas_pagamento_pkey | btree | id | sim | sim |  |
| public.folhas_pagamento | idx_folhas_empresa_competencia | btree | empresa_id, competencia | não | sim |  |
| public.folhas_pagamento | idx_folhas_empresa_status | btree | empresa_id, status | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_competencia | btree | competencia | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_created_by | btree | created_by | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_empresa_competencia | btree | empresa_id, competencia | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_empresa_id | btree | empresa_id | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_empresa_status | btree | empresa_id, status | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_id_version | btree | id, version | não | sim |  |
| public.folhas_pagamento | idx_folhas_pagamento_status | btree | status | não | sim |  |
| public.formacoes_academicas | formacoes_academicas_pkey | btree | id | sim | sim |  |
| public.formacoes_academicas | idx_formacoes_academicas_colaborador_id | btree | colaborador_id | não | sim |  |
| public.formacoes_academicas | idx_formacoes_col | btree | colaborador_id | não | sim |  |
| public.generos_documento | generos_documento_nome_key | btree | nome | sim | sim |  |
| public.generos_documento | generos_documento_pkey | btree | id | sim | sim |  |
| public.geo_allowed_countries | geo_allowed_countries_country_code_key | btree | country_code | sim | sim |  |
| public.geo_allowed_countries | geo_allowed_countries_pkey | btree | id | sim | sim |  |
| public.geo_allowed_countries | idx_geo_allowed_countries_added_by | btree | added_by | não | sim |  |
| public.geo_blocked_attempts | geo_blocked_attempts_pkey | btree | id | sim | sim |  |
| public.geo_blocking_config | geo_blocking_config_pkey | btree | id | sim | sim |  |
| public.geo_blocking_config | idx_geo_blocking_config_updated_by | btree | updated_by | não | sim |  |
| public.govbr_auth_state | govbr_auth_state_pkey | btree | id | sim | sim |  |
| public.govbr_auth_state | govbr_auth_state_state_key | btree | state | sim | sim |  |
| public.guias_fgts | guias_fgts_pkey | btree | id | sim | sim |  |
| public.guias_fgts | idx_guias_fgts_empresa_id | btree | empresa_id | não | sim |  |
| public.guias_fgts_digital | guias_fgts_digital_pkey | btree | id | sim | sim |  |
| public.guias_inss | guias_inss_pkey | btree | id | sim | sim |  |
| public.guias_inss | idx_guias_inss_empresa_id | btree | empresa_id | não | sim |  |
| public.health_checks | health_checks_pkey | btree | id | sim | sim |  |
| public.historico_alertas | historico_alertas_pkey | btree | id | sim | sim |  |
| public.historico_alertas | idx_historico_alertas_created_at | btree | created_at | não | sim |  |
| public.historico_calculos_folha | historico_calculos_folha_pkey | btree | id | sim | sim |  |
| public.historico_calculos_folha | idx_historico_calculos_folha_criado_por | btree | criado_por | não | sim |  |
| public.historico_calculos_folha | idx_historico_calculos_folha_empresa_id | btree | empresa_id | não | sim |  |
| public.historico_calculos_folha | idx_historico_calculos_folha_folha_id | btree | folha_id | não | sim |  |
| public.historico_cargo | historico_cargo_pkey | btree | id | sim | sim |  |
| public.historico_cargo | idx_historico_cargo_colaborador_id | btree | colaborador_id | não | sim |  |
| public.historico_cargo | idx_historico_cargo_created_by | btree | created_by | não | sim |  |
| public.historico_cargo | idx_historico_cargo_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` |
| public.historico_contratos | historico_contratos_pkey | btree | id | sim | sim |  |
| public.historico_contratos | idx_historico_contratos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.historico_contratos | idx_historico_contratos_empresa_id | btree | empresa_id | não | sim |  |
| public.historico_ferias | historico_ferias_pkey | btree | id | sim | sim |  |
| public.historico_ferias | idx_historico_ferias_ferias_id | btree | ferias_id | não | sim |  |
| public.historico_rescisoes | historico_rescisoes_pkey | btree | id | sim | sim |  |
| public.historico_rescisoes | idx_historico_rescisoes_empresa_id | btree | empresa_id | não | sim |  |
| public.historico_salarial | historico_salarial_pkey | btree | id | sim | sim |  |
| public.historico_salarial | idx_historico_salarial_col | btree | colaborador_id | não | sim |  |
| public.historico_salarial | idx_historico_salarial_colaborador_id | btree | colaborador_id | não | sim |  |
| public.historico_salarial | idx_historico_salarial_empresa_created | btree | empresa_id, created_at | não | sim |  |
| public.historico_salarial | idx_historico_salarial_empresa_id | btree | empresa_id | não | sim |  |
| public.holerite_distribuicoes | holerite_distribuicoes_pkey | btree | id | sim | sim |  |
| public.holerite_distribuicoes | idx_holerite_dist_folha | btree | folha_id, canal | não | sim |  |
| public.holerite_distribuicoes | idx_holerite_dist_status | btree | status | não | sim | `(status <> 'enviado'::text)` |
| public.holerite_distribuicoes | idx_holerite_distrib_holerite_id | btree | holerite_id | não | sim |  |
| public.holerites | holerites_folha_id_colaborador_id_key | btree | folha_id, colaborador_id | sim | sim |  |
| public.holerites | holerites_pkey | btree | id | sim | sim |  |
| public.holerites | idx_holerites_assinado | btree | assinado | não | sim | `(assinado = true)` |
| public.holerites | idx_holerites_assinado_partial | btree | folha_id | não | sim | `(assinado = false)` |
| public.holerites | idx_holerites_colab_created | btree | colaborador_id, created_at | não | sim |  |
| public.holerites | idx_holerites_colaborador_id | btree | colaborador_id | não | sim |  |
| public.holerites | idx_holerites_folha | btree | folha_id | não | sim |  |
| public.holerites | idx_holerites_folha_colab_covering | btree | folha_id, colaborador_id, liquido, total_proventos, total_descontos, assinado | não | sim |  |
| public.holerites | idx_holerites_folha_id | btree | folha_id | não | sim |  |
| public.homologacoes_rescisao | homologacoes_rescisao_pkey | btree | id | sim | sim |  |
| public.homologacoes_rescisao | idx_homologacoes_desligamento | btree | desligamento_id | não | sim |  |
| public.homologacoes_rescisao | idx_homologacoes_rescisao_usuario_id | btree | usuario_id | não | sim |  |
| public.homologacoes_rescisao | uq_homologacoes_desligamento_etapa | btree | desligamento_id, etapa | sim | sim |  |
| public.ia_provisoes_alertas | ia_provisoes_alertas_pkey | btree | id | sim | sim |  |
| public.ia_provisoes_alertas | idx_ia_provisoes_alertas_empresa_id | btree | empresa_id | não | sim |  |
| public.idempotency_keys | idempotency_keys_pkey | btree | id | sim | sim |  |
| public.idempotency_keys | idempotency_keys_unique | btree | endpoint, key_hash | sim | sim |  |
| public.idempotency_keys | idx_idempotency_expires | btree | expires_at | não | sim |  |
| public.idempotency_keys | idx_idempotency_keys_empresa | btree | empresa_id | não | sim |  |
| public.idempotency_keys | idx_idempotency_keys_expires | btree | expires_at | não | sim |  |
| public.idempotency_keys | idx_idempotency_status | btree | created_at | não | sim | `(status = 'in_progress'::text)` |
| public.identidades_genero | identidades_genero_nome_key | btree | nome | sim | sim |  |
| public.identidades_genero | identidades_genero_pkey | btree | id | sim | sim |  |
| public.inscricoes_cursos | idx_inscricoes_cursos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.inscricoes_cursos | idx_inscricoes_cursos_curso_id | btree | curso_id | não | sim |  |
| public.inscricoes_cursos | idx_inscricoes_cursos_empresa_id | btree | empresa_id | não | sim |  |
| public.inscricoes_cursos | inscricoes_cursos_pkey | btree | id | sim | sim |  |
| public.integracao_logs | integracao_logs_pkey | btree | id | sim | sim |  |
| public.integracoes | integracoes_pkey | btree | id | sim | sim |  |
| public.ip_whitelist | idx_ip_whitelist_added_by | btree | added_by | não | sim |  |
| public.ip_whitelist | idx_ip_whitelist_ip | btree | ip_address | não | sim |  |
| public.ip_whitelist | ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  |
| public.ip_whitelist | ip_whitelist_pkey | btree | id | sim | sim |  |
| public.itens_folha | idx_itens_folha_colaborador_id | btree | colaborador_id | não | sim |  |
| public.itens_folha | idx_itens_folha_folha_id | btree | folha_id | não | sim |  |
| public.itens_folha | idx_itens_folha_rubrica_id | btree | rubrica_id | não | sim |  |
| public.itens_folha | itens_folha_pkey | btree | id | sim | sim |  |
| public.jornadas | idx_jornadas_empresa_id | btree | empresa_id | não | sim |  |
| public.jornadas | jornadas_pkey | btree | id | sim | sim |  |
| public.jornadas_horarios | jornadas_horarios_jornada_id_dia_semana_key | btree | jornada_id, dia_semana | sim | sim |  |
| public.jornadas_horarios | jornadas_horarios_pkey | btree | id | sim | sim |  |
| public.lancamentos_contabeis | idx_lancamentos_contabeis_conta_credito_id | btree | conta_credito_id | não | sim |  |
| public.lancamentos_contabeis | idx_lancamentos_contabeis_conta_debito_id | btree | conta_debito_id | não | sim |  |
| public.lancamentos_contabeis | idx_lancamentos_contabeis_empresa_id | btree | empresa_id | não | sim |  |
| public.lancamentos_contabeis | idx_lancamentos_contabeis_folha_id | btree | folha_id | não | sim |  |
| public.lancamentos_contabeis | lancamentos_contabeis_pkey | btree | id | sim | sim |  |
| public.lancamentos_folha | idx_lancamentos_folha_holerite_id | btree | holerite_id | não | sim |  |
| public.lancamentos_folha | idx_lancamentos_folha_rubrica_id | btree | rubrica_id | não | sim |  |
| public.lancamentos_folha | lancamentos_folha_pkey | btree | id | sim | sim |  |
| public.lgpd_consentimentos | idx_lgpd_consentimentos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.lgpd_consentimentos | idx_lgpd_consentimentos_empresa_id | btree | empresa_id | não | sim |  |
| public.lgpd_consentimentos | lgpd_consentimentos_pkey | btree | id | sim | sim |  |
| public.lgpd_fila_limpeza | lgpd_fila_limpeza_pkey | btree | id | sim | sim |  |
| public.lgpd_politicas_retencao | lgpd_politicas_retencao_pkey | btree | id | sim | sim |  |
| public.lgpd_retencao_logs | lgpd_retencao_logs_pkey | btree | id | sim | sim |  |
| public.lgpd_retencao_logs | lgpd_retencao_logs_tabela_key | btree | tabela | sim | sim |  |
| public.lgpd_solicitacoes | idx_lgpd_solicitacoes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.lgpd_solicitacoes | idx_lgpd_solicitacoes_empresa_id | btree | empresa_id | não | sim |  |
| public.lgpd_solicitacoes | lgpd_solicitacoes_pkey | btree | id | sim | sim |  |
| public.linhas_transporte | idx_linhas_transporte_vale_transporte_id | btree | vale_transporte_id | não | sim |  |
| public.linhas_transporte | linhas_transporte_pkey | btree | id | sim | sim |  |
| public.locais_trabalho | idx_locais_trabalho_empresa_id | btree | empresa_id | não | sim |  |
| public.locais_trabalho | locais_trabalho_pkey | btree | id | sim | sim |  |
| public.log_envio_relatorios | idx_log_envio_relatorios_agendamento_id | btree | agendamento_id | não | sim |  |
| public.log_envio_relatorios | log_envio_relatorios_pkey | btree | id | sim | sim |  |
| public.login_attempts | idx_login_attempts_email_hour | btree | email, created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_email_ip | btree | email, ip_address, created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_ip_hour | btree | ip_address, created_at | não | sim |  |
| public.login_attempts | idx_login_attempts_success_hour | btree | success, created_at | não | sim |  |
| public.login_attempts | login_attempts_pkey | btree | id | sim | sim |  |
| public.login_lockouts | login_lockouts_identifier_identifier_type_key | btree | identifier, identifier_type | sim | sim |  |
| public.login_lockouts | login_lockouts_pkey | btree | id | sim | sim |  |
| public.login_rate_limits | idx_login_rate_limits_identifier | btree | identifier, identifier_type | não | sim |  |
| public.login_rate_limits | idx_login_rate_limits_locked_until | btree | locked_until | não | sim |  |
| public.login_rate_limits | login_rate_limits_identifier_identifier_type_key | btree | identifier, identifier_type | sim | sim |  |
| public.login_rate_limits | login_rate_limits_pkey | btree | id | sim | sim |  |
| public.logs_integracoes | idx_logs_integracoes_integracao_id | btree | integracao_id | não | sim |  |
| public.logs_integracoes | logs_integracoes_pkey | btree | id | sim | sim |  |
| public.logs_sincronizacao | idx_logs_sincronizacao_empresa_id | btree | empresa_id | não | sim |  |
| public.logs_sincronizacao | logs_sincronizacao_pkey | btree | id | sim | sim |  |
| public.logs_sistema | idx_logs_sistema_created_at | btree | created_at | não | sim |  |
| public.logs_sistema | idx_logs_sistema_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` |
| public.logs_sistema | logs_sistema_pkey | btree | id | sim | sim |  |
| public.lotacoes | idx_lotacoes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.lotacoes | idx_lotacoes_empresa_id | btree | empresa_id | não | sim |  |
| public.lotacoes | lotacoes_pkey | btree | id | sim | sim |  |
| public.medidas_ciencia_tokens | idx_medidas_ciencia_tokens_empresa | btree | empresa_id, created_at | não | sim |  |
| public.medidas_ciencia_tokens | idx_medidas_ciencia_tokens_medida | btree | medida_id | não | sim |  |
| public.medidas_ciencia_tokens | idx_medidas_ciencia_tokens_token | btree | token | não | sim | `(used_at IS NULL)` |
| public.medidas_ciencia_tokens | medidas_ciencia_tokens_pkey | btree | id | sim | sim |  |
| public.medidas_ciencia_tokens | medidas_ciencia_tokens_token_key | btree | token | sim | sim |  |
| public.medidas_disciplinares | idx_medidas_aprovador | btree | aprovador_id | não | sim | `(aprovador_id IS NOT NULL)` |
| public.medidas_disciplinares | idx_medidas_disciplinares_colaborador_id | btree | colaborador_id | não | sim |  |
| public.medidas_disciplinares | idx_medidas_disciplinares_empresa_id | btree | empresa_id | não | sim |  |
| public.medidas_disciplinares | idx_medidas_empresa_data | btree | empresa_id, data_ocorrencia | não | sim |  |
| public.medidas_disciplinares | idx_medidas_status_workflow | btree | empresa_id, status_workflow | não | sim |  |
| public.medidas_disciplinares | idx_medidas_tipo | btree | tipo | não | sim |  |
| public.medidas_disciplinares | medidas_disciplinares_pkey | btree | id | sim | sim |  |
| public.medidas_disciplinares_anexos | idx_medidas_disciplinares_anexos_medida_id | btree | medida_id | não | sim |  |
| public.medidas_disciplinares_anexos | idx_medidas_disciplinares_anexos_uploaded_by | btree | uploaded_by | não | sim |  |
| public.medidas_disciplinares_anexos | medidas_disciplinares_anexos_pkey | btree | id | sim | sim |  |
| public.medidas_disciplinares_contestacao_anexos | idx_medida_contest_anexos_empresa | btree | empresa_id | não | sim |  |
| public.medidas_disciplinares_contestacao_anexos | idx_medida_contest_anexos_medida | btree | medida_id | não | sim |  |
| public.medidas_disciplinares_contestacao_anexos | medidas_disciplinares_contestacao_anexos_pkey | btree | id | sim | sim |  |
| public.medidas_disciplinares_integracao | idx_med_integ_medida | btree | medida_id | não | sim |  |
| public.medidas_disciplinares_integracao | idx_med_integ_pendentes | btree | empresa_id, colaborador_id | não | sim | `(status = 'pendente'::text)` |
| public.medidas_disciplinares_integracao | medidas_disciplinares_integracao_pkey | btree | id | sim | sim |  |
| public.medidas_disciplinares_workflow_log | idx_medidas_wf_log_medida | btree | medida_id, created_at | não | sim |  |
| public.medidas_disciplinares_workflow_log | medidas_disciplinares_workflow_log_pkey | btree | id | sim | sim |  |
| public.metas_okrs | idx_metas_okrs_ciclo_id | btree | ciclo_id | não | sim |  |
| public.metas_okrs | idx_metas_okrs_colaborador_id | btree | colaborador_id | não | sim |  |
| public.metas_okrs | idx_metas_okrs_empresa_id | btree | empresa_id | não | sim |  |
| public.metas_okrs | metas_okrs_pkey | btree | id | sim | sim |  |
| public.metricas_processamento | idx_metricas_processamento_timestamp | btree | timestamp | não | sim |  |
| public.metricas_processamento | idx_metricas_processamento_timestamp_desc | btree | timestamp | não | sim |  |
| public.metricas_processamento | metricas_processamento_pkey | btree | id | sim | sim |  |
| public.motivos_afastamento | motivos_afastamento_nome_key | btree | nome | sim | sim |  |
| public.motivos_afastamento | motivos_afastamento_pkey | btree | id | sim | sim |  |
| public.mv_folha_summary | idx_mv_folha_summary_pk | btree | empresa_id, competencia_month | sim | sim |  |
| public.mv_telemetry_dashboard | idx_mv_telemetry_tenant_key | btree | empresa_id, hour, table_name, operation, severity | sim | sim |  |
| public.mv_telemetry_dashboard | idx_mv_telemetry_tenant_p95 | btree | empresa_id, hour, p95_ms | não | sim |  |
| public.nacionalidades | nacionalidades_nome_key | btree | nome | sim | sim |  |
| public.nacionalidades | nacionalidades_pkey | btree | id | sim | sim |  |
| public.ninebox_permissoes_homologacao | ninebox_permissoes_homologacao_pkey | btree | user_id | sim | sim |  |
| public.notificacoes | idx_notif_user_unread | btree | user_id, created_at | não | sim | `(lida = false)` |
| public.notificacoes | idx_notificacoes_created_at | btree | created_at | não | sim |  |
| public.notificacoes | idx_notificacoes_empresa_created | btree | empresa_id, created_at | não | sim |  |
| public.notificacoes | idx_notificacoes_empresa_created_desc | btree | empresa_id, created_at | não | sim |  |
| public.notificacoes | idx_notificacoes_empresa_id | btree | empresa_id | não | sim |  |
| public.notificacoes | idx_notificacoes_lida | btree | lida | não | sim |  |
| public.notificacoes | idx_notificacoes_tipo | btree | tipo | não | sim |  |
| public.notificacoes | idx_notificacoes_user_id | btree | user_id | não | sim |  |
| public.notificacoes | idx_notificacoes_user_unread | btree | user_id, created_at | não | sim | `(lida = false)` |
| public.notificacoes | notificacoes_pkey | btree | id | sim | sim |  |
| public.notificacoes | uq_notif_ferias_d5_dia | btree | user_id, entidade_tipo, entidade_id, data_referencia | sim | sim | `(tipo = 'ferias_pagamento_d5'::text)` |
| public.notificacoes_admissao | idx_notificacoes_admissao_admissao_id | btree | admissao_id | não | sim |  |
| public.notificacoes_admissao | notificacoes_admissao_pkey | btree | id | sim | sim |  |
| public.onboarding_colaborador | idx_onboarding_colab | btree | colaborador_id | não | sim |  |
| public.onboarding_colaborador | idx_onboarding_colaborador_colaborador_id | btree | colaborador_id | não | sim |  |
| public.onboarding_colaborador | idx_onboarding_colaborador_created_by | btree | created_by | não | sim |  |
| public.onboarding_colaborador | idx_onboarding_colaborador_empresa_id | btree | empresa_id | não | sim |  |
| public.onboarding_colaborador | idx_onboarding_colaborador_template_id | btree | template_id | não | sim |  |
| public.onboarding_colaborador | onboarding_colaborador_pkey | btree | id | sim | sim |  |
| public.onboarding_documentos_obrigatorios | idx_onboarding_documentos_obrigatorios_empresa_id | btree | empresa_id | não | sim |  |
| public.onboarding_documentos_obrigatorios | idx_onboarding_documentos_obrigatorios_onboarding_id | btree | onboarding_id | não | sim |  |
| public.onboarding_documentos_obrigatorios | onboarding_documentos_obrigatorios_pkey | btree | id | sim | sim |  |
| public.onboarding_kits | onboarding_kits_pkey | btree | id | sim | sim |  |
| public.onboarding_tarefas | idx_onboarding_tarefas_concluida_por | btree | concluida_por | não | sim |  |
| public.onboarding_tarefas | idx_onboarding_tarefas_empresa_id | btree | empresa_id | não | sim |  |
| public.onboarding_tarefas | idx_onboarding_tarefas_onboarding_id | btree | onboarding_id | não | sim |  |
| public.onboarding_tarefas | idx_onboarding_tarefas_template_tarefa_id | btree | template_tarefa_id | não | sim |  |
| public.onboarding_tarefas | onboarding_tarefas_pkey | btree | id | sim | sim |  |
| public.onboarding_template_tarefas | idx_onboarding_template_tarefas_template_id | btree | template_id | não | sim |  |
| public.onboarding_template_tarefas | onboarding_template_tarefas_pkey | btree | id | sim | sim |  |
| public.onboarding_templates | idx_onboarding_templates_created_by | btree | created_by | não | sim |  |
| public.onboarding_templates | idx_onboarding_templates_empresa_id | btree | empresa_id | não | sim |  |
| public.onboarding_templates | onboarding_templates_pkey | btree | id | sim | sim |  |
| public.paises | paises_nome_key | btree | nome | sim | sim |  |
| public.paises | paises_pkey | btree | id | sim | sim |  |
| public.parametros_fiscais | parametros_fiscais_pkey | btree | id | sim | sim |  |
| public.parametros_sistema | parametros_sistema_empresa_id_nome_key | btree | empresa_id, nome | sim | sim |  |
| public.parametros_sistema | parametros_sistema_pkey | btree | id | sim | sim |  |
| public.password_history | idx_password_history_user_id | btree | user_id | não | sim |  |
| public.password_history | password_history_pkey | btree | id | sim | sim |  |
| public.password_policies | password_policies_pkey | btree | id | sim | sim |  |
| public.password_reset_config | idx_password_reset_config_updated_by | btree | updated_by | não | sim |  |
| public.password_reset_config | password_reset_config_pkey | btree | id | sim | sim |  |
| public.password_reset_requests | idx_password_reset_expires | btree | expires_at | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  |
| public.password_reset_requests | idx_password_reset_status | btree | status | não | sim |  |
| public.password_reset_requests | idx_password_reset_user | btree | user_id | não | sim |  |
| public.password_reset_requests | password_reset_requests_pkey | btree | id | sim | sim |  |
| public.pcs_avaliacoes_cargo | idx_pcs_aval_cargo | btree | cargo_id | não | sim |  |
| public.pcs_avaliacoes_cargo | idx_pcs_aval_plano | btree | plano_id, pontos_total | não | sim |  |
| public.pcs_avaliacoes_cargo | pcs_avaliacoes_cargo_pkey | btree | id | sim | sim |  |
| public.pcs_avaliacoes_cargo | pcs_avaliacoes_cargo_plano_id_cargo_id_key | btree | plano_id, cargo_id | sim | sim |  |
| public.pcs_fatores | idx_pcs_fatores_plano | btree | plano_id, ordem | não | sim |  |
| public.pcs_fatores | pcs_fatores_pkey | btree | id | sim | sim |  |
| public.pcs_fatores | pcs_fatores_plano_id_nome_key | btree | plano_id, nome | sim | sim |  |
| public.pcs_fatores | pcs_fatores_plano_id_ordem_key | btree | plano_id, ordem | sim | sim |  |
| public.pcs_grades | idx_pcs_grades_plano | btree | plano_id, ordem | não | sim |  |
| public.pcs_grades | pcs_grades_pkey | btree | id | sim | sim |  |
| public.pcs_grades | pcs_grades_plano_id_ordem_key | btree | plano_id, ordem | sim | sim |  |
| public.pcs_pesquisa_salarial | idx_pcs_pesquisa_cargo | btree | cargo_id | não | sim | `(cargo_id IS NOT NULL)` |
| public.pcs_pesquisa_salarial | idx_pcs_pesquisa_empresa | btree | empresa_id, data_referencia | não | sim |  |
| public.pcs_pesquisa_salarial | pcs_pesquisa_salarial_pkey | btree | id | sim | sim |  |
| public.pcs_planos | idx_pcs_planos_empresa | btree | empresa_id, created_at | não | sim | `(deleted_at IS NULL)` |
| public.pcs_planos | pcs_planos_empresa_id_nome_versao_key | btree | empresa_id, nome, versao | sim | sim |  |
| public.pcs_planos | pcs_planos_pkey | btree | id | sim | sim |  |
| public.pcs_planos | uq_pcs_plano_ativo_por_empresa | btree | empresa_id | sim | sim | `((status = 'ativo'::text) AND (deleted_at IS NULL))` |
| public.pdi_plano_desenvolvimento | idx_pdi_plano_desenvolvimento_colaborador_id | btree | colaborador_id | não | sim |  |
| public.pdi_plano_desenvolvimento | idx_pdi_plano_desenvolvimento_empresa_id | btree | empresa_id | não | sim |  |
| public.pdi_plano_desenvolvimento | pdi_plano_desenvolvimento_pkey | btree | id | sim | sim |  |
| public.pdis | idx_pdis_colaborador_id | btree | colaborador_id | não | sim |  |
| public.pdis | idx_pdis_empresa_id | btree | empresa_id | não | sim |  |
| public.pdis | pdis_pkey | btree | id | sim | sim |  |
| public.pendencias | idx_pendencias_empresa_id | btree | empresa_id | não | sim |  |
| public.pendencias | pendencias_pkey | btree | id | sim | sim |  |
| public.pensoes | idx_pensoes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.pensoes | pensoes_pkey | btree | id | sim | sim |  |
| public.periodos_aquisitivos | idx_periodos_aquisitivos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.periodos_aquisitivos | periodos_aquisitivos_colaborador_id_numero_periodo_key | btree | colaborador_id, numero_periodo | sim | sim |  |
| public.periodos_aquisitivos | periodos_aquisitivos_pkey | btree | id | sim | sim |  |
| public.periodos_experiencia | idx_periodos_experiencia_col | btree | colaborador_id | não | sim |  |
| public.periodos_experiencia | idx_periodos_experiencia_colaborador_id | btree | colaborador_id | não | sim |  |
| public.periodos_experiencia | periodos_experiencia_pkey | btree | id | sim | sim |  |
| public.periodos_ponto | periodos_ponto_pkey | btree | id | sim | sim |  |
| public.permissao_perfis | permissao_perfis_empresa_id_nome_key | btree | empresa_id, nome | sim | sim |  |
| public.permissao_perfis | permissao_perfis_pkey | btree | id | sim | sim |  |
| public.permissao_recursos | permissao_recursos_nome_key | btree | nome | sim | sim |  |
| public.permissao_recursos | permissao_recursos_pkey | btree | id | sim | sim |  |
| public.permissao_recursos | permissao_recursos_slug_key | btree | slug | sim | sim |  |
| public.permissions | permissions_pkey | btree | id | sim | sim |  |
| public.permissions | permissions_role_resource_action_key | btree | role, resource, action | sim | sim |  |
| public.personnel_budget | personnel_budget_empresa_id_departamento_ano_mes_key | btree | empresa_id, departamento, ano, mes | sim | sim |  |
| public.personnel_budget | personnel_budget_pkey | btree | id | sim | sim |  |
| public.pesquisas | idx_pesquisas_empresa_id | btree | empresa_id | não | sim |  |
| public.pesquisas | pesquisas_pkey | btree | id | sim | sim |  |
| public.pesquisas_perguntas | idx_pesquisas_perguntas_pesquisa_id | btree | pesquisa_id | não | sim |  |
| public.pesquisas_perguntas | pesquisas_perguntas_pkey | btree | id | sim | sim |  |
| public.pesquisas_respostas | idx_pesquisas_respostas_colaborador_id | btree | colaborador_id | não | sim |  |
| public.pesquisas_respostas | idx_pesquisas_respostas_pergunta_id | btree | pergunta_id | não | sim |  |
| public.pesquisas_respostas | idx_pesquisas_respostas_pesquisa_id | btree | pesquisa_id | não | sim |  |
| public.pesquisas_respostas | pesquisas_respostas_pkey | btree | id | sim | sim |  |
| public.pii_access_alerts | pii_access_alerts_dedup | btree | user_id, empresa_id, tabela, acao, janela | sim | sim |  |
| public.pii_access_alerts | pii_access_alerts_pkey | btree | id | sim | sim |  |
| public.pii_access_logs | idx_pii_access_logs_empresa_ts | btree | empresa_id, created_at | não | sim |  |
| public.pii_access_logs | idx_pii_access_logs_tabela_ts | btree | tabela, created_at | não | sim |  |
| public.pii_access_logs | idx_pii_access_logs_user_ts | btree | user_id, created_at | não | sim |  |
| public.pii_access_logs | pii_access_logs_pkey | btree | id | sim | sim |  |
| public.pix_itens | idx_pix_itens_colaborador_id | btree | colaborador_id | não | sim |  |
| public.pix_itens | idx_pix_itens_lote_id | btree | lote_id | não | sim |  |
| public.pix_itens | pix_itens_pkey | btree | id | sim | sim |  |
| public.pix_lotes | idx_pix_lotes_empresa_id | btree | empresa_id | não | sim |  |
| public.pix_lotes | pix_lotes_empresa_folha_uk | btree | empresa_id, folha_id | sim | sim | `(folha_id IS NOT NULL)` |
| public.pix_lotes | pix_lotes_pkey | btree | id | sim | sim |  |
| public.plano_contas | plano_contas_empresa_id_codigo_key | btree | empresa_id, codigo | sim | sim |  |
| public.plano_contas | plano_contas_pkey | btree | id | sim | sim |  |
| public.planos_saude | idx_planos_saude_colaborador_id | btree | colaborador_id | não | sim |  |
| public.planos_saude | idx_planos_saude_empresa_id | btree | empresa_id | não | sim |  |
| public.planos_saude | planos_saude_pkey | btree | id | sim | sim |  |
| public.ponto_ajustes | idx_ponto_ajustes_gestor_id | btree | gestor_id | não | sim |  |
| public.ponto_ajustes | ponto_ajustes_pkey | btree | id | sim | sim |  |
| public.ponto_auditoria | idx_ponto_auditoria_created_at | btree | created_at | não | sim |  |
| public.ponto_auditoria | idx_ponto_auditoria_usuario_id | btree | usuario_id | não | sim |  |
| public.ponto_auditoria | ponto_auditoria_pkey | btree | id | sim | sim |  |
| public.ponto_auditoria_fraude | idx_ponto_auditoria_fraude_batida_id | btree | batida_id | não | sim |  |
| public.ponto_auditoria_fraude | ponto_auditoria_fraude_pkey | btree | id | sim | sim |  |
| public.ponto_espelhos_assinados | idx_espelho_empresa_comp | btree | empresa_id, competencia | não | sim |  |
| public.ponto_espelhos_assinados | idx_ponto_espelhos_assinados_colaborador_id | btree | colaborador_id | não | sim |  |
| public.ponto_espelhos_assinados | ponto_espelhos_assinados_pkey | btree | id | sim | sim |  |
| public.ponto_espelhos_assinados | uq_espelho_colab_competencia | btree | colaborador_id, competencia | sim | sim | `((competencia IS NOT NULL) AND (revogado_em IS NULL))` |
| public.ponto_espelhos_revogacoes | idx_revogacoes_espelho | btree | espelho_id | não | sim |  |
| public.ponto_espelhos_revogacoes | ponto_espelhos_revogacoes_pkey | btree | id | sim | sim |  |
| public.ponto_regras_aprovacao | ponto_regras_aprovacao_pkey | btree | id | sim | sim |  |
| public.ponto_seguranca_blacklist | idx_ponto_seguranca_blacklist_colaborador_id | btree | colaborador_id | não | sim |  |
| public.ponto_seguranca_blacklist | ponto_seguranca_blacklist_dispositivo_id_key | btree | dispositivo_id | sim | sim |  |
| public.ponto_seguranca_blacklist | ponto_seguranca_blacklist_pkey | btree | id | sim | sim |  |
| public.portal_notificacoes_settings | portal_notificacoes_settings_pkey | btree | id | sim | sim |  |
| public.portal_notificacoes_settings | portal_notificacoes_settings_user_id_key | btree | user_id | sim | sim |  |
| public.premiacoes_alertas | idx_premiacoes_alertas_user_id | btree | user_id | não | sim |  |
| public.premiacoes_alertas | premiacoes_alertas_pkey | btree | id | sim | sim |  |
| public.premiacoes_auditoria | idx_premiacoes_aud_created_at | btree | created_at | não | sim |  |
| public.premiacoes_auditoria | idx_premiacoes_aud_entidade | btree | entidade_tipo, entidade_id | não | sim |  |
| public.premiacoes_auditoria | idx_premiacoes_aud_usuario_id | btree | usuario_id | não | sim | `(usuario_id IS NOT NULL)` |
| public.premiacoes_auditoria | idx_premiacoes_auditoria_entidade | btree | entidade_tipo, entidade_id | não | sim |  |
| public.premiacoes_auditoria | idx_premiacoes_auditoria_usuario_id | btree | usuario_id | não | sim |  |
| public.premiacoes_auditoria | premiacoes_auditoria_pkey | btree | id | sim | sim |  |
| public.premiacoes_campanhas | idx_premiacoes_campanhas_empresa_id | btree | empresa_id | não | sim |  |
| public.premiacoes_campanhas | premiacoes_campanhas_pkey | btree | id | sim | sim |  |
| public.premiacoes_cenarios_simulacao | idx_premiacoes_cenarios_simulacao_criado_por | btree | criado_por | não | sim |  |
| public.premiacoes_cenarios_simulacao | idx_premiacoes_cenarios_simulacao_empresa_id | btree | empresa_id | não | sim |  |
| public.premiacoes_cenarios_simulacao | premiacoes_cenarios_simulacao_pkey | btree | id | sim | sim |  |
| public.premiacoes_pagamentos | idx_premiacoes_pagamentos_campanha_id | btree | campanha_id | não | sim |  |
| public.premiacoes_pagamentos | idx_premiacoes_pagamentos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.premiacoes_pagamentos | idx_premiacoes_pagamentos_folha | btree | integrado_folha, referencia_folha | não | sim |  |
| public.premiacoes_pagamentos | idx_premiacoes_pagamentos_regra_id | btree | regra_id | não | sim |  |
| public.premiacoes_pagamentos | premiacoes_pagamentos_pkey | btree | id | sim | sim |  |
| public.premiacoes_regras | idx_premiacoes_regras_campanha_id | btree | campanha_id | não | sim |  |
| public.premiacoes_regras | idx_premiacoes_regras_meta_id | btree | meta_id | não | sim |  |
| public.premiacoes_regras | premiacoes_regras_pkey | btree | id | sim | sim |  |
| public.premiacoes_roi_cenarios | idx_premiacoes_roi_cenarios_user_id | btree | user_id | não | sim |  |
| public.premiacoes_roi_cenarios | premiacoes_roi_cenarios_pkey | btree | id | sim | sim |  |
| public.profiles | profiles_govbr_uid_key | btree | govbr_uid | sim | sim |  |
| public.profiles | profiles_pkey | btree | id | sim | sim |  |
| public.profiles | profiles_user_id_key | btree | user_id | sim | sim |  |
| public.promo_brindes | promo_brindes_nome_key | btree | nome | sim | sim |  |
| public.promo_brindes | promo_brindes_pkey | btree | id | sim | sim |  |
| public.promocoes | idx_promocoes_cargo_anterior_id | btree | cargo_anterior_id | não | sim |  |
| public.promocoes | idx_promocoes_cargo_novo_id | btree | cargo_novo_id | não | sim |  |
| public.promocoes | idx_promocoes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.promocoes | promocoes_pkey | btree | id | sim | sim |  |
| public.prorrogacoes_afastamento | idx_prorrogacoes_afastamento_afastamento_id | btree | afastamento_id | não | sim |  |
| public.prorrogacoes_afastamento | prorrogacoes_afastamento_pkey | btree | id | sim | sim |  |
| public.provisao_auditoria | idx_provisao_auditoria_usuario_id | btree | usuario_id | não | sim |  |
| public.provisao_auditoria | provisao_auditoria_pkey | btree | id | sim | sim |  |
| public.provisao_logs | idx_provisao_logs_usuario_id | btree | usuario_id | não | sim |  |
| public.provisao_logs | provisao_logs_pkey | btree | id | sim | sim |  |
| public.provisoes_folha | idx_provisoes_folha_colaborador_id | btree | colaborador_id | não | sim |  |
| public.provisoes_folha | idx_provisoes_folha_empresa_id | btree | empresa_id | não | sim |  |
| public.provisoes_folha | provisoes_folha_empresa_colaborador_competencia_key | btree | empresa_id, colaborador_id, competencia | sim | sim |  |
| public.provisoes_folha | provisoes_folha_pkey | btree | id | sim | sim |  |
| public.provisoes_mensais | idx_provisoes_colaborador | btree | colaborador_id | não | sim |  |
| public.provisoes_mensais | idx_provisoes_empresa_competencia | btree | empresa_id, competencia | não | sim |  |
| public.provisoes_mensais | idx_provisoes_mensais_log_id | btree | log_id | não | sim |  |
| public.provisoes_mensais | provisoes_mensais_pkey | btree | id | sim | sim |  |
| public.push_subscriptions | idx_push_subscriptions_user_id | btree | user_id | não | sim |  |
| public.push_subscriptions | push_subscriptions_pkey | btree | id | sim | sim |  |
| public.query_telemetry | idx_query_telemetry_created_at | btree | created_at | não | sim |  |
| public.query_telemetry | idx_query_telemetry_empresa_created | btree | empresa_id, created_at | não | sim | `(empresa_id IS NOT NULL)` |
| public.query_telemetry | idx_query_telemetry_severity | btree | severity | não | sim |  |
| public.query_telemetry | idx_query_telemetry_severity_created | btree | severity, created_at | não | sim | `(severity = ANY (ARRAY['slow'::text, 'error'::text]))` |
| public.query_telemetry | idx_query_telemetry_trace_id | btree | trace_id | não | sim | `(trace_id IS NOT NULL)` |
| public.query_telemetry | query_telemetry_pkey | btree | id | sim | sim |  |
| public.rate_limit_config | rate_limit_config_endpoint_key | btree | endpoint | sim | sim |  |
| public.rate_limit_config | rate_limit_config_pkey | btree | id | sim | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_ip_endpoint | btree | ip_address, endpoint, created_at | não | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_user_id | btree | user_id | não | sim |  |
| public.rate_limit_logs | rate_limit_logs_pkey | btree | id | sim | sim |  |
| public.rate_limits | idx_rate_limits_key_timestamp | btree | key, timestamp | não | sim |  |
| public.rate_limits | rate_limits_pkey | btree | id | sim | sim |  |
| public.recargas_vale | idx_recargas_vale_colaborador_id | btree | colaborador_id | não | sim |  |
| public.recargas_vale | idx_recargas_vale_vale_id | btree | vale_id | não | sim |  |
| public.recargas_vale | recargas_vale_pkey | btree | id | sim | sim |  |
| public.recrutamento_agendamentos | idx_recrutamento_agendamentos_candidatura_id | btree | candidatura_id | não | sim |  |
| public.recrutamento_agendamentos | idx_recrutamento_agendamentos_responsavel_id | btree | responsavel_id | não | sim |  |
| public.recrutamento_agendamentos | recrutamento_agendamentos_pkey | btree | id | sim | sim |  |
| public.recrutamento_anotacoes | idx_recrutamento_anotacoes_candidatura_id | btree | candidatura_id | não | sim |  |
| public.recrutamento_anotacoes | idx_recrutamento_anotacoes_usuario_id | btree | usuario_id | não | sim |  |
| public.recrutamento_anotacoes | recrutamento_anotacoes_pkey | btree | id | sim | sim |  |
| public.recrutamento_entrevistas | idx_recrutamento_entrevistas_candidatura_id | btree | candidatura_id | não | sim |  |
| public.recrutamento_entrevistas | idx_recrutamento_entrevistas_entrevistador_id | btree | entrevistador_id | não | sim |  |
| public.recrutamento_entrevistas | recrutamento_entrevistas_pkey | btree | id | sim | sim |  |
| public.recrutamento_testes | idx_recrutamento_testes_candidatura_id | btree | candidatura_id | não | sim |  |
| public.recrutamento_testes | recrutamento_testes_pkey | btree | id | sim | sim |  |
| public.registros_ponto | idx_registros_ponto_colab_aprovado | btree | colaborador_id, data | não | sim | `(aprovado = true)` |
| public.registros_ponto | idx_registros_ponto_colab_data | btree | colaborador_id, data | não | sim |  |
| public.registros_ponto | idx_registros_ponto_colaborador_data | btree | colaborador_id, data | não | sim |  |
| public.registros_ponto | idx_registros_ponto_colaborador_id | btree | colaborador_id | não | sim |  |
| public.registros_ponto | idx_registros_ponto_empresa_data | btree | empresa_id, data | não | sim |  |
| public.registros_ponto | idx_registros_ponto_empresa_id | btree | empresa_id | não | sim |  |
| public.registros_ponto | registros_ponto_colaborador_data_uq | btree | colaborador_id, data | sim | sim |  |
| public.registros_ponto | registros_ponto_colaborador_id_data_key | btree | colaborador_id, data | sim | sim |  |
| public.registros_ponto | registros_ponto_pkey | btree | id | sim | sim |  |
| public.relacionamentos_contato_emergencia | relacionamentos_contato_emergencia_nome_key | btree | nome | sim | sim |  |
| public.relacionamentos_contato_emergencia | relacionamentos_contato_emergencia_pkey | btree | id | sim | sim |  |
| public.relacionamentos_dependentes | relacionamentos_dependentes_nome_key | btree | nome | sim | sim |  |
| public.relacionamentos_dependentes | relacionamentos_dependentes_pkey | btree | id | sim | sim |  |
| public.relatorios_agendados | idx_relatorios_agendados_created_by | btree | created_by | não | sim |  |
| public.relatorios_agendados | idx_relatorios_agendados_dispatch_claim | btree | ativo, proximo_envio, dispatch_claimed_at | não | sim | `(ativo IS TRUE)` |
| public.relatorios_agendados | idx_relatorios_agendados_empresa_id | btree | empresa_id | não | sim |  |
| public.relatorios_agendados | relatorios_agendados_pkey | btree | id | sim | sim |  |
| public.report_dispatch_attempts | idx_report_dispatch_attempts_schedule | btree | agendamento_id, created_at | não | sim |  |
| public.report_dispatch_attempts | report_dispatch_attempts_dispatch_key_hash_key | btree | dispatch_key_hash | sim | sim |  |
| public.report_dispatch_attempts | report_dispatch_attempts_pkey | btree | id | sim | sim |  |
| public.role_permissions | idx_role_permissions_created_by | btree | created_by | não | sim |  |
| public.role_permissions | idx_role_permissions_permission | btree | permission_code | não | sim |  |
| public.role_permissions | idx_role_permissions_role | btree | role | não | sim |  |
| public.role_permissions | role_permissions_pkey | btree | id | sim | sim |  |
| public.role_permissions | role_permissions_role_permission_code_key | btree | role, permission_code | sim | sim |  |
| public.rubricas_folha | rubricas_folha_empresa_codigo_unique | btree | empresa_id, codigo | sim | sim |  |
| public.rubricas_folha | rubricas_folha_pkey | btree | id | sim | sim |  |
| public.saved_filters | saved_filters_pkey | btree | id | sim | sim |  |
| public.sec_policy_regressions | idx_sec_policy_regressions_scan_at | btree | scan_at | não | sim |  |
| public.sec_policy_regressions | sec_policy_regressions_pkey | btree | id | sim | sim |  |
| public.sec_seal_events | idx_sec_seal_events_tabela_data | btree | tabela, created_at | não | sim |  |
| public.sec_seal_events | sec_seal_events_pkey | btree | id | sim | sim |  |
| public.security_alerts | idx_security_alerts_open | btree | severity, created_at | não | sim | `(COALESCE(resolved, false) = false)` |
| public.security_alerts | idx_security_alerts_resolved_by | btree | resolved_by | não | sim |  |
| public.security_alerts | idx_security_alerts_type | btree | type, severity, resolved | não | sim |  |
| public.security_alerts | idx_security_alerts_unresolved | btree | created_at | não | sim | `(resolved = false)` |
| public.security_alerts | idx_security_alerts_user_id | btree | user_id | não | sim |  |
| public.security_alerts | security_alerts_pkey | btree | id | sim | sim |  |
| public.sefip_arquivos | idx_sefip_arquivos_empresa_id | btree | empresa_id | não | sim |  |
| public.sefip_arquivos | sefip_arquivos_pkey | btree | id | sim | sim |  |
| public.seguros_colaboradores | idx_seguros_colaboradores_colaborador_id | btree | colaborador_id | não | sim |  |
| public.seguros_colaboradores | idx_seguros_colaboradores_seguro_vida_id | btree | seguro_vida_id | não | sim |  |
| public.seguros_colaboradores | seguros_colaboradores_pkey | btree | id | sim | sim |  |
| public.seguros_vida | idx_seguros_vida_colaborador_id | btree | colaborador_id | não | sim |  |
| public.seguros_vida | idx_seguros_vida_empresa_id | btree | empresa_id | não | sim |  |
| public.seguros_vida | seguros_vida_pkey | btree | id | sim | sim |  |
| public.simulacoes_fiscais | idx_simulacoes_fiscais_empresa_id | btree | empresa_id | não | sim |  |
| public.simulacoes_fiscais | idx_simulacoes_fiscais_usuario_id | btree | usuario_id | não | sim |  |
| public.simulacoes_fiscais | simulacoes_fiscais_pkey | btree | id | sim | sim |  |
| public.sindicatos | sindicatos_pkey | btree | id | sim | sim |  |
| public.sinistros_seguro | idx_sinistros_seguro_colaborador_id | btree | colaborador_id | não | sim |  |
| public.sinistros_seguro | idx_sinistros_seguro_seguro_vida_id | btree | seguro_vida_id | não | sim |  |
| public.sinistros_seguro | sinistros_seguro_pkey | btree | id | sim | sim |  |
| public.solicitacoes_ajuste_ponto | idx_solic_ajuste_pendente | btree | empresa_id, created_at | não | sim | `(status = 'pendente'::text)` |
| public.solicitacoes_ajuste_ponto | idx_solicitacoes_ajuste_ponto_analisado_por | btree | analisado_por | não | sim |  |
| public.solicitacoes_ajuste_ponto | idx_solicitacoes_ajuste_ponto_aprovado_por | btree | aprovado_por | não | sim |  |
| public.solicitacoes_ajuste_ponto | idx_solicitacoes_ajuste_ponto_colaborador_id | btree | colaborador_id | não | sim |  |
| public.solicitacoes_ajuste_ponto | idx_solicitacoes_ajuste_ponto_empresa_id | btree | empresa_id | não | sim |  |
| public.solicitacoes_ajuste_ponto | solicitacoes_ajuste_ponto_pkey | btree | id | sim | sim |  |
| public.solicitacoes_hora_extra | idx_solicitacoes_hora_extra_colaborador_id | btree | colaborador_id | não | sim |  |
| public.solicitacoes_hora_extra | idx_solicitacoes_hora_extra_empresa_id | btree | empresa_id | não | sim |  |
| public.solicitacoes_hora_extra | solicitacoes_hora_extra_pkey | btree | id | sim | sim |  |
| public.sst_cat | idx_sst_cat_cat_origem_id | btree | cat_origem_id | não | sim |  |
| public.sst_cat | idx_sst_cat_colaborador_id | btree | colaborador_id | não | sim |  |
| public.sst_cat | idx_sst_cat_created_by | btree | created_by | não | sim |  |
| public.sst_cat | idx_sst_cat_data | btree | data_acidente | não | sim |  |
| public.sst_cat | idx_sst_cat_empresa_id | btree | empresa_id | não | sim |  |
| public.sst_cat | idx_sst_cat_prazo | btree | prazo_limite_envio | não | sim | `(data_envio_esocial IS NULL)` |
| public.sst_cat | idx_sst_cat_retifica_cat_id | btree | retifica_cat_id | não | sim |  |
| public.sst_cat | idx_sst_cat_status | btree | status_esocial | não | sim |  |
| public.sst_cat | sst_cat_pkey | btree | id | sim | sim |  |
| public.sst_cat_anexos | idx_sst_cat_anexos_cat | btree | cat_id | não | sim |  |
| public.sst_cat_anexos | idx_sst_cat_anexos_uploaded_by | btree | uploaded_by | não | sim |  |
| public.sst_cat_anexos | sst_cat_anexos_pkey | btree | id | sim | sim |  |
| public.sst_cat_testemunhas | idx_sst_cat_testemunhas_cat | btree | cat_id | não | sim |  |
| public.sst_cat_testemunhas | sst_cat_testemunhas_pkey | btree | id | sim | sim |  |
| public.sst_exposicao_riscos | idx_sst_exposicao_riscos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.sst_exposicao_riscos | sst_exposicao_riscos_pkey | btree | id | sim | sim |  |
| public.sst_extintores | idx_extintores_empresa | btree | empresa_id | não | sim | `(deleted_at IS NULL)` |
| public.sst_extintores | idx_extintores_hidro | btree | empresa_id, data_proximo_teste_hidrostatico | não | sim | `(deleted_at IS NULL)` |
| public.sst_extintores | idx_extintores_recarga | btree | empresa_id, data_proxima_recarga | não | sim | `(deleted_at IS NULL)` |
| public.sst_extintores | idx_extintores_status | btree | empresa_id, status | não | sim | `(deleted_at IS NULL)` |
| public.sst_extintores | idx_sst_extintores_created_by | btree | created_by | não | sim |  |
| public.sst_extintores | idx_sst_extintores_local_id | btree | local_trabalho_id | não | sim |  |
| public.sst_extintores | sst_extintores_empresa_id_codigo_patrimonio_key | btree | empresa_id, codigo_patrimonio | sim | sim |  |
| public.sst_extintores | sst_extintores_pkey | btree | id | sim | sim |  |
| public.sst_extintores | sst_extintores_qr_code_key | btree | qr_code | sim | sim |  |
| public.sst_extintores_inspecoes | idx_insp_empresa_data | btree | empresa_id, data_inspecao | não | sim |  |
| public.sst_extintores_inspecoes | idx_insp_extintor | btree | extintor_id, data_inspecao | não | sim |  |
| public.sst_extintores_inspecoes | idx_sst_extint_insp_inspetor | btree | inspetor_id | não | sim |  |
| public.sst_extintores_inspecoes | sst_extintores_inspecoes_pkey | btree | id | sim | sim |  |
| public.sst_incidentes | idx_sst_incidentes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.sst_incidentes | sst_incidentes_pkey | btree | id | sim | sim |  |
| public.sst_ltcat_laudos | idx_ltcat_ativo_unico | btree | empresa_id | sim | sim | `(status = 'ativo'::text)` |
| public.sst_ltcat_laudos | idx_ltcat_empresa | btree | empresa_id | não | sim |  |
| public.sst_ltcat_laudos | idx_ltcat_status | btree | empresa_id, status | não | sim |  |
| public.sst_ltcat_laudos | idx_sst_ltcat_gerado_por | btree | gerado_por | não | sim |  |
| public.sst_ltcat_laudos | sst_ltcat_laudos_pkey | btree | id | sim | sim |  |
| public.sst_ordens_servico | idx_sst_os_cargo | btree | cargo_id | não | sim | `(cargo_id IS NOT NULL)` |
| public.sst_ordens_servico | idx_sst_os_colab | btree | colaborador_id | não | sim | `(colaborador_id IS NOT NULL)` |
| public.sst_ordens_servico | idx_sst_os_empresa | btree | empresa_id | não | sim |  |
| public.sst_ordens_servico | idx_sst_os_gerado_por | btree | gerado_por | não | sim |  |
| public.sst_ordens_servico | idx_sst_os_status | btree | empresa_id, status | não | sim |  |
| public.sst_ordens_servico | sst_ordens_servico_pkey | btree | id | sim | sim |  |
| public.sst_programas | idx_sst_programas_gerado_por | btree | gerado_por | não | sim |  |
| public.sst_programas | sst_programas_pkey | btree | id | sim | sim |  |
| public.sst_programas | uq_sst_programa_ativo | btree | empresa_id, tipo | sim | sim | `(status = 'ativo'::text)` |
| public.sst_regimento_assinaturas | idx_regimento_ass_colab | btree | colaborador_id | não | sim |  |
| public.sst_regimento_assinaturas | idx_regimento_ass_empresa | btree | empresa_id | não | sim |  |
| public.sst_regimento_assinaturas | sst_regimento_assinaturas_documento_id_colaborador_id_key | btree | documento_id, colaborador_id | sim | sim |  |
| public.sst_regimento_assinaturas | sst_regimento_assinaturas_pkey | btree | id | sim | sim |  |
| public.sst_regimento_documentos | idx_regimento_doc_empresa | btree | empresa_id, status | não | sim |  |
| public.sst_regimento_documentos | sst_regimento_documentos_pkey | btree | id | sim | sim |  |
| public.sst_regimento_documentos | uniq_regimento_publicado | btree | empresa_id | sim | sim | `(status = 'PUBLICADO'::text)` |
| public.sst_regimento_interno | sst_regimento_interno_pkey | btree | id | sim | sim |  |
| public.sst_riscos_ambientais | idx_sst_riscos_ambientais_local_id | btree | local_id | não | sim |  |
| public.sst_riscos_ambientais | sst_riscos_ambientais_pkey | btree | id | sim | sim |  |
| public.tarefas_onboarding | idx_tarefas_onboarding_admissao_id | btree | admissao_id | não | sim |  |
| public.tarefas_onboarding | idx_tarefas_onboarding_responsavel_id | btree | responsavel_id | não | sim |  |
| public.tarefas_onboarding | tarefas_onboarding_pkey | btree | id | sim | sim |  |
| public.taxas_cambio | taxas_cambio_pkey | btree | id | sim | sim |  |
| public.tempos_residencia | tempos_residencia_nome_key | btree | nome | sim | sim |  |
| public.tempos_residencia | tempos_residencia_pkey | btree | id | sim | sim |  |
| public.times | idx_times_departamento_id | btree | departamento_id | não | sim |  |
| public.times | idx_times_empresa_id | btree | empresa_id | não | sim |  |
| public.times | idx_times_lider_id | btree | lider_id | não | sim |  |
| public.times | times_nome_empresa_key | btree | nome, empresa_id | sim | sim |  |
| public.times | times_pkey | btree | id | sim | sim |  |
| public.times_brindes | idx_times_brindes_brinde_id | btree | brinde_id | não | sim |  |
| public.times_brindes | times_brindes_pkey | btree | id | sim | sim |  |
| public.times_brindes | times_brindes_time_id_brinde_id_key | btree | time_id, brinde_id | sim | sim |  |
| public.tipos_admissao | tipos_admissao_nome_key | btree | nome | sim | sim |  |
| public.tipos_admissao | tipos_admissao_pkey | btree | id | sim | sim |  |
| public.tipos_aviso_previo | tipos_aviso_previo_nome_key | btree | nome | sim | sim |  |
| public.tipos_aviso_previo | tipos_aviso_previo_pkey | btree | id | sim | sim |  |
| public.tipos_beneficio | tipos_beneficio_codigo_key | btree | codigo | sim | sim |  |
| public.tipos_beneficio | tipos_beneficio_pkey | btree | id | sim | sim |  |
| public.tipos_deficiencia | tipos_deficiencia_nome_key | btree | nome | sim | sim |  |
| public.tipos_deficiencia | tipos_deficiencia_pkey | btree | id | sim | sim |  |
| public.tipos_desligamento | tipos_desligamento_nome_key | btree | nome | sim | sim |  |
| public.tipos_desligamento | tipos_desligamento_pkey | btree | id | sim | sim |  |
| public.tipos_estabilidade | tipos_estabilidade_nome_key | btree | nome | sim | sim |  |
| public.tipos_estabilidade | tipos_estabilidade_pkey | btree | id | sim | sim |  |
| public.tipos_pagamento | tipos_pagamento_nome_key | btree | nome | sim | sim |  |
| public.tipos_pagamento | tipos_pagamento_pkey | btree | id | sim | sim |  |
| public.tipos_salario | tipos_salario_nome_key | btree | nome | sim | sim |  |
| public.tipos_salario | tipos_salario_pkey | btree | id | sim | sim |  |
| public.tipos_visto | tipos_visto_nome_key | btree | nome | sim | sim |  |
| public.tipos_visto | tipos_visto_pkey | btree | id | sim | sim |  |
| public.training_image_requests | idx_training_image_requests_empresa | btree | empresa_id, content_type | não | sim |  |
| public.training_image_requests | idx_training_image_requests_status | btree | status, available_at, requested_at | não | sim |  |
| public.training_image_requests | training_image_requests_pkey | btree | id | sim | sim |  |
| public.training_image_requests | training_image_requests_unico | btree | empresa_id, content_type, content_id | sim | sim |  |
| public.training_image_settings | training_image_settings_pkey | btree | id | sim | sim |  |
| public.training_images | idx_training_images_empresa | btree | empresa_id | não | sim |  |
| public.training_images | idx_training_images_origem | btree | source_content_id | não | sim | `(source_content_id IS NOT NULL)` |
| public.training_images | idx_training_images_status | btree | empresa_id, status | não | sim |  |
| public.training_images | training_images_caminho_unico | btree | empresa_id, storage_path | sim | sim |  |
| public.training_images | training_images_conteudo_unico | btree | empresa_id, content_type, content_id | sim | sim |  |
| public.training_images | training_images_pkey | btree | id | sim | sim |  |
| public.transferencias | idx_transferencias_colaborador_id | btree | colaborador_id | não | sim |  |
| public.transferencias | idx_transferencias_departamento_anterior_id | btree | departamento_anterior_id | não | sim |  |
| public.transferencias | idx_transferencias_departamento_novo_id | btree | departamento_novo_id | não | sim |  |
| public.transferencias | transferencias_pkey | btree | id | sim | sim |  |
| public.treinamento_certificados | idx_treinamento_certificados_colaborador_id | btree | colaborador_id | não | sim |  |
| public.treinamento_certificados | idx_treinamento_certificados_curso_id | btree | curso_id | não | sim |  |
| public.treinamento_certificados | idx_treinamento_certificados_inscricao_id | btree | inscricao_id | não | sim |  |
| public.treinamento_certificados | treinamento_certificados_codigo_autenticacao_key | btree | codigo_autenticacao | sim | sim |  |
| public.treinamento_certificados | treinamento_certificados_pkey | btree | id | sim | sim |  |
| public.treinamento_feedback | idx_treinamento_feedback_inscricao_id | btree | inscricao_id | não | sim |  |
| public.treinamento_feedback | treinamento_feedback_pkey | btree | id | sim | sim |  |
| public.treinamento_feedbacks | treinamento_feedbacks_inscricao_id_key | btree | inscricao_id | sim | sim |  |
| public.treinamento_feedbacks | treinamento_feedbacks_pkey | btree | id | sim | sim |  |
| public.treinamento_instancias | idx_treinamento_instancias_curso_id | btree | curso_id | não | sim |  |
| public.treinamento_instancias | idx_treinamento_instancias_instrutor_id | btree | instrutor_id | não | sim |  |
| public.treinamento_instancias | treinamento_instancias_pkey | btree | id | sim | sim |  |
| public.treinamento_participantes | idx_treinamento_participantes_colaborador_id | btree | colaborador_id | não | sim |  |
| public.treinamento_participantes | idx_treinamento_participantes_treinamento_id | btree | treinamento_id | não | sim |  |
| public.treinamento_participantes | treinamento_participantes_pkey | btree | id | sim | sim |  |
| public.treinamentos | idx_treinamentos_empresa_id | btree | empresa_id | não | sim |  |
| public.treinamentos | treinamentos_pkey | btree | id | sim | sim |  |
| public.triagem_notas | idx_triagem_notas_candidatura_id | btree | candidatura_id | não | sim |  |
| public.triagem_notas | idx_triagem_notas_empresa_id | btree | empresa_id | não | sim |  |
| public.triagem_notas | triagem_notas_pkey | btree | id | sim | sim |  |
| public.trilha_auditoria_ponto | idx_trilha_auditoria_ponto_ponto_id | btree | ponto_id | não | sim |  |
| public.trilha_auditoria_ponto | idx_trilha_auditoria_ponto_usuario_id | btree | usuario_id | não | sim |  |
| public.trilha_auditoria_ponto | trilha_auditoria_ponto_pkey | btree | id | sim | sim |  |
| public.trilhas_aprendizado | idx_trilhas_aprendizado_empresa_id | btree | empresa_id | não | sim |  |
| public.trilhas_aprendizado | trilhas_aprendizado_pkey | btree | id | sim | sim |  |
| public.trilhas_cursos | idx_trilhas_cursos_curso_id | btree | curso_id | não | sim |  |
| public.trilhas_cursos | idx_trilhas_cursos_trilha_id | btree | trilha_id | não | sim |  |
| public.trilhas_cursos | trilhas_cursos_pkey | btree | id | sim | sim |  |
| public.turnos | idx_turnos_empresa_id | btree | empresa_id | não | sim |  |
| public.turnos | turnos_pkey | btree | id | sim | sim |  |
| public.user_empresas | idx_user_empresas_empresa | btree | empresa_id | não | sim |  |
| public.user_empresas | idx_user_empresas_user | btree | user_id | não | sim |  |
| public.user_empresas | user_empresas_one_default_per_user | btree | user_id | sim | sim | `(is_default IS TRUE)` |
| public.user_empresas | user_empresas_pkey | btree | id | sim | sim |  |
| public.user_empresas | user_empresas_user_id_empresa_id_key | btree | user_id, empresa_id | sim | sim |  |
| public.user_mfa | idx_user_mfa_user | btree | user_id | não | sim |  |
| public.user_mfa | user_mfa_pkey | btree | id | sim | sim |  |
| public.user_mfa | user_mfa_user_id_key | btree | user_id | sim | sim |  |
| public.user_roles | user_roles_pkey | btree | id | sim | sim |  |
| public.user_roles | user_roles_user_id_role_key | btree | user_id, role | sim | sim |  |
| public.user_sessions | idx_user_sessions_token | btree | session_token | não | sim |  |
| public.user_sessions | idx_user_sessions_user | btree | user_id, is_active | não | sim |  |
| public.user_sessions | user_sessions_pkey | btree | id | sim | sim |  |
| public.user_sessions | user_sessions_session_token_key | btree | session_token | sim | sim |  |
| public.vaga_entrevistas | idx_vaga_entrevistas_candidatura_id | btree | candidatura_id | não | sim |  |
| public.vaga_entrevistas | idx_vaga_entrevistas_empresa_id | btree | empresa_id | não | sim |  |
| public.vaga_entrevistas | idx_vaga_entrevistas_etapa_id | btree | etapa_id | não | sim |  |
| public.vaga_entrevistas | vaga_entrevistas_pkey | btree | id | sim | sim |  |
| public.vaga_etapas | idx_vaga_etapas_empresa_id | btree | empresa_id | não | sim |  |
| public.vaga_etapas | idx_vaga_etapas_vaga_id | btree | vaga_id | não | sim |  |
| public.vaga_etapas | vaga_etapas_pkey | btree | id | sim | sim |  |
| public.vagas | idx_vagas_empresa | btree | empresa_id | não | sim |  |
| public.vagas | vagas_pkey | btree | id | sim | sim |  |
| public.vales_alimentacao | idx_vales_alimentacao_colaborador_id | btree | colaborador_id | não | sim |  |
| public.vales_alimentacao | idx_vales_alimentacao_empresa_id | btree | empresa_id | não | sim |  |
| public.vales_alimentacao | vales_alimentacao_pkey | btree | id | sim | sim |  |
| public.vales_transporte | idx_vales_transporte_colaborador_id | btree | colaborador_id | não | sim |  |
| public.vales_transporte | vales_transporte_pkey | btree | id | sim | sim |  |
| public.valores_campos_customizados | idx_valores_campos_customizados_colaborador_id | btree | colaborador_id | não | sim |  |
| public.valores_campos_customizados | valores_campos_customizados_campo_customizado_id_colaborado_key | btree | campo_customizado_id, colaborador_id | sim | sim |  |
| public.valores_campos_customizados | valores_campos_customizados_pkey | btree | id | sim | sim |  |
| public.verbas_rescisorias | idx_verbas_desligamento | btree | desligamento_id | não | sim |  |
| public.verbas_rescisorias | idx_verbas_rescisorias_rubrica_id | btree | rubrica_id | não | sim |  |
| public.verbas_rescisorias | verbas_rescisorias_pkey | btree | id | sim | sim |  |
| public.verification_tokens | idx_verification_tokens_token | btree | token | não | sim |  |
| public.verification_tokens | idx_verification_tokens_user_id | btree | user_id | não | sim |  |
| public.verification_tokens | verification_tokens_pkey | btree | id | sim | sim |  |
| public.verification_tokens | verification_tokens_token_key | btree | token | sim | sim |  |
| public.versao_banco | versao_banco_pkey | btree | id | sim | sim |  |
| public.vinculos | idx_vinculos_colaborador_id | btree | colaborador_id | não | sim |  |
| public.vinculos | vinculos_pkey | btree | id | sim | sim |  |
| public.webauthn_challenges | idx_webauthn_challenges_expires | btree | expires_at | não | sim |  |
| public.webauthn_challenges | idx_webauthn_challenges_user_id | btree | user_id | não | sim |  |
| public.webauthn_challenges | webauthn_challenges_pkey | btree | id | sim | sim |  |
| public.webauthn_credentials | idx_webauthn_credentials_credential_id | btree | credential_id | não | sim |  |
| public.webauthn_credentials | idx_webauthn_credentials_user_id | btree | user_id | não | sim |  |
| public.webauthn_credentials | webauthn_credentials_credential_id_key | btree | credential_id | sim | sim |  |
| public.webauthn_credentials | webauthn_credentials_pkey | btree | id | sim | sim |  |
| public.webhook_logs | idx_webhook_logs_webhook_id | btree | webhook_id | não | sim |  |
| public.webhook_logs | webhook_logs_event_id_unique | btree | event_id | sim | sim | `(event_id IS NOT NULL)` |
| public.webhook_logs | webhook_logs_pkey | btree | id | sim | sim |  |
| public.webhook_logs | webhook_logs_status_created_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.webhooks | idx_webhooks_empresa_id | btree | empresa_id | não | sim |  |
| public.webhooks | webhooks_pkey | btree | id | sim | sim |  |
| public.webhooks_config | idx_webhooks_config_empresa_id | btree | empresa_id | não | sim |  |
| public.webhooks_config | webhooks_config_pkey | btree | id | sim | sim |  |
| public.webhooks_logs | idx_webhooks_logs_webhook_id | btree | webhook_id | não | sim |  |
| public.webhooks_logs | webhooks_logs_pkey | btree | id | sim | sim |  |
| public.whatsapp_config | whatsapp_config_empresa_id_key | btree | empresa_id | sim | sim |  |
| public.whatsapp_config | whatsapp_config_pkey | btree | id | sim | sim |  |
| public.whatsapp_mensagens_logs | idx_whatsapp_mensagens_logs_colaborador_id | btree | colaborador_id | não | sim |  |
| public.whatsapp_mensagens_logs | idx_whatsapp_mensagens_logs_template_id | btree | template_id | não | sim |  |
| public.whatsapp_mensagens_logs | whatsapp_mensagens_logs_pkey | btree | id | sim | sim |  |
| public.whatsapp_templates | whatsapp_templates_pkey | btree | id | sim | sim |  |
| public.workflows_config | idx_workflows_config_empresa_id | btree | empresa_id | não | sim |  |
| public.workflows_config | workflows_config_pkey | btree | id | sim | sim |  |
| public.workflows_definicoes | idx_workflows_definicoes_empresa_id | btree | empresa_id | não | sim |  |
| public.workflows_definicoes | workflows_definicoes_pkey | btree | id | sim | sim |  |
| public.workflows_etapas | idx_workflows_etapas_workflow_id | btree | workflow_id | não | sim |  |
| public.workflows_etapas | workflows_etapas_pkey | btree | id | sim | sim |  |
| public.workflows_execucoes | idx_workflows_execucoes_empresa_id | btree | empresa_id | não | sim |  |
| public.workflows_execucoes | idx_workflows_execucoes_etapa_atual_id | btree | etapa_atual_id | não | sim |  |
| public.workflows_execucoes | idx_workflows_execucoes_workflow_id | btree | workflow_id | não | sim |  |
| public.workflows_execucoes | workflows_execucoes_pkey | btree | id | sim | sim |  |
| public.workflows_historico | idx_workflows_historico_etapa_id | btree | etapa_id | não | sim |  |
| public.workflows_historico | idx_workflows_historico_execucao_id | btree | execucao_id | não | sim |  |
| public.workflows_historico | workflows_historico_pkey | btree | id | sim | sim |  |
