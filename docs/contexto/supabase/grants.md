# Grants


Roles da API: `anon` (sem login), `authenticated` (logado), `service_role` (bypass RLS). Grants de sistema (postgres, supabase_*) omitidos.

## Tabelas e views

| objeto | role | privilégios |
|---|---|---|
| public.adiantamentos_salariais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.adiantamentos_salariais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.adiantamentos_salariais | dp_mcp_role | SELECT |
| public.adiantamentos_salariais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admissao_tokens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admissao_tokens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admissao_tokens | dp_mcp_role | SELECT |
| public.admissao_tokens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admissoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admissoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.admissoes | dp_mcp_role | SELECT |
| public.admissoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.aej_geracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.aej_geracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.aej_geracoes | dp_mcp_role | SELECT |
| public.aej_geracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afastamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afastamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afastamentos | dp_mcp_role | SELECT |
| public.afastamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afd_geracoes | authenticated | INSERT, SELECT |
| public.afd_geracoes | dp_mcp_role | SELECT |
| public.afd_geracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_divergencias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_divergencias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_divergencias | dp_mcp_role | SELECT |
| public.afdt_divergencias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_importacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_importacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_importacoes | dp_mcp_role | SELECT |
| public.afdt_importacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_registros_raw | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_registros_raw | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.afdt_registros_raw | dp_mcp_role | SELECT |
| public.afdt_registros_raw | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ajustes_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ajustes_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ajustes_ponto | dp_mcp_role | SELECT |
| public.ajustes_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.anotacoes_colaborador | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.anotacoes_colaborador | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.anotacoes_colaborador | dp_mcp_role | SELECT |
| public.anotacoes_colaborador | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.asos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.asos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.asos | dp_mcp_role | SELECT |
| public.asos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log | anon | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log | dp_mcp_role | SELECT |
| public.audit_log | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_unified | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_unified | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_unified | dp_mcp_role | SELECT |
| public.audit_log_unified | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_unified_archive | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_unified_archive | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_log_unified_archive | dp_mcp_role | SELECT |
| public.audit_log_unified_archive | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.audit_logs | dp_mcp_role | SELECT |
| public.audit_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria | dp_mcp_role | SELECT |
| public.auditoria | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_acesso_bancario | dp_mcp_role | SELECT |
| public.auditoria_acesso_bancario | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_contratual | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_contratual | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_contratual | dp_mcp_role | SELECT |
| public.auditoria_contratual | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auditoria_logs | dp_mcp_role | SELECT |
| public.auditoria_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auth_gov_br_sessions | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auth_gov_br_sessions | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.auth_gov_br_sessions | dp_mcp_role | SELECT |
| public.auth_gov_br_sessions | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.automacao_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.automacao_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.automacao_logs | dp_mcp_role | SELECT |
| public.automacao_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.banco_horas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.banco_horas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.banco_horas | dp_mcp_role | SELECT |
| public.banco_horas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.banco_horas_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.banco_horas_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.banco_horas_config | dp_mcp_role | SELECT |
| public.banco_horas_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.batidas_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.batidas_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.batidas_ponto | dp_mcp_role | SELECT |
| public.batidas_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficiarios_plano | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficiarios_plano | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficiarios_plano | dp_mcp_role | SELECT |
| public.beneficiarios_plano | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficiarios_seguro | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficiarios_seguro | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficiarios_seguro | dp_mcp_role | SELECT |
| public.beneficiarios_seguro | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_arquivos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_arquivos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_arquivos | dp_mcp_role | SELECT |
| public.beneficio_arquivos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_movimentacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_movimentacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_movimentacoes | dp_mcp_role | SELECT |
| public.beneficio_movimentacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_regras_elegibilidade | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_regras_elegibilidade | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_regras_elegibilidade | dp_mcp_role | SELECT |
| public.beneficio_regras_elegibilidade | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_utilizacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_utilizacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficio_utilizacao | dp_mcp_role | SELECT |
| public.beneficio_utilizacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios | dp_mcp_role | SELECT |
| public.beneficios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios_colaborador | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios_colaborador | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios_colaborador | dp_mcp_role | SELECT |
| public.beneficios_colaborador | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios_colaboradores | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios_colaboradores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.beneficios_colaboradores | dp_mcp_role | SELECT |
| public.beneficios_colaboradores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bitrix24_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bitrix24_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bitrix24_config | dp_mcp_role | SELECT |
| public.bitrix24_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bitrix24_sync_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bitrix24_sync_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.bitrix24_sync_logs | dp_mcp_role | SELECT |
| public.bitrix24_sync_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.blocked_ips | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.blocked_ips | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.blocked_ips | dp_mcp_role | SELECT |
| public.blocked_ips | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.campos_customizados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.campos_customizados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.campos_customizados | dp_mcp_role | SELECT |
| public.campos_customizados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.canal_etica | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.canal_etica | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.canal_etica | dp_mcp_role | SELECT |
| public.canal_etica | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.candidatos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.candidatos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.candidatos | dp_mcp_role | SELECT |
| public.candidatos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.candidaturas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.candidaturas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.candidaturas | dp_mcp_role | SELECT |
| public.candidaturas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cargo_faixas_salariais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cargo_faixas_salariais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cargo_faixas_salariais | dp_mcp_role | SELECT |
| public.cargo_faixas_salariais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cargos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cargos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cargos | dp_mcp_role | SELECT |
| public.cargos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalogo_cursos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalogo_cursos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalogo_cursos | dp_mcp_role | SELECT |
| public.catalogo_cursos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalogo_infracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalogo_infracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.catalogo_infracoes | dp_mcp_role | SELECT |
| public.catalogo_infracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.categorias_trabalhador | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.categorias_trabalhador | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.categorias_trabalhador | dp_mcp_role | SELECT |
| public.categorias_trabalhador | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cbo | authenticated | SELECT |
| public.cbo | dp_mcp_role | SELECT |
| public.cbo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.centros_custo | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.centros_custo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.centros_custo | dp_mcp_role | SELECT |
| public.centros_custo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.certificados_digitais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.certificados_digitais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.certificados_digitais | dp_mcp_role | SELECT |
| public.certificados_digitais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ciclos_avaliacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ciclos_avaliacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ciclos_avaliacao | dp_mcp_role | SELECT |
| public.ciclos_avaliacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cid10 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cid10 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cid10 | dp_mcp_role | SELECT |
| public.cid10 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ciencia_rate_limits | dp_mcp_role | SELECT |
| public.ciencia_rate_limits | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners | dp_mcp_role | SELECT |
| public.clinicas_partners | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners_horarios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners_horarios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners_horarios | dp_mcp_role | SELECT |
| public.clinicas_partners_horarios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners_servicos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners_servicos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.clinicas_partners_servicos | dp_mcp_role | SELECT |
| public.clinicas_partners_servicos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_configuracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_configuracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_configuracoes | dp_mcp_role | SELECT |
| public.cnab_configuracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_itens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_itens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_itens | dp_mcp_role | SELECT |
| public.cnab_itens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_remessas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_remessas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_remessas | dp_mcp_role | SELECT |
| public.cnab_remessas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnab_sequencias | dp_mcp_role | SELECT |
| public.cnab_sequencias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.cnae | authenticated | SELECT |
| public.cnae | dp_mcp_role | SELECT |
| public.cnae | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaborador_beneficios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaborador_beneficios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaborador_beneficios | dp_mcp_role | SELECT |
| public.colaborador_beneficios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaboradores | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaboradores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaboradores | dp_mcp_role | SELECT |
| public.colaboradores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaboradores_pin | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaboradores_pin | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.colaboradores_pin | dp_mcp_role | SELECT |
| public.colaboradores_pin | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.competencias_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.competencias_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.competencias_config | dp_mcp_role | SELECT |
| public.competencias_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.competencias_matriz | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.competencias_matriz | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.competencias_matriz | dp_mcp_role | SELECT |
| public.competencias_matriz | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comunicados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comunicados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comunicados | dp_mcp_role | SELECT |
| public.comunicados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comunicados_leituras | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comunicados_leituras | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.comunicados_leituras | dp_mcp_role | SELECT |
| public.comunicados_leituras | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.condicoes_ingresso | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.condicoes_ingresso | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.condicoes_ingresso | dp_mcp_role | SELECT |
| public.condicoes_ingresso | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.config_afastamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.config_afastamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.config_afastamentos | dp_mcp_role | SELECT |
| public.config_afastamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.config_alertas_indicadores | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.config_alertas_indicadores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.config_alertas_indicadores | dp_mcp_role | SELECT |
| public.config_alertas_indicadores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes | dp_mcp_role | SELECT |
| public.configuracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_alertas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_alertas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_alertas | dp_mcp_role | SELECT |
| public.configuracoes_alertas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_esocial | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_esocial | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_esocial | dp_mcp_role | SELECT |
| public.configuracoes_esocial | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_intervalo | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_intervalo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_intervalo | dp_mcp_role | SELECT |
| public.configuracoes_intervalo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.configuracoes_ponto | dp_mcp_role | SELECT |
| public.configuracoes_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.conformidade_ponto_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.conformidade_ponto_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.conformidade_ponto_logs | dp_mcp_role | SELECT |
| public.conformidade_ponto_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_contatos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_contatos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_contatos | dp_mcp_role | SELECT |
| public.contabilidade_contatos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_mensagens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_mensagens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_mensagens | dp_mcp_role | SELECT |
| public.contabilidade_mensagens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_threads | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_threads | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contabilidade_threads | dp_mcp_role | SELECT |
| public.contabilidade_threads | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contas_bancarias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contas_bancarias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contas_bancarias | dp_mcp_role | SELECT |
| public.contas_bancarias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contas_bancarias_decrypted | authenticated | SELECT |
| public.contas_bancarias_decrypted | dp_mcp_role | SELECT |
| public.contas_bancarias_decrypted | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contatos_emergencia | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contatos_emergencia | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contatos_emergencia | dp_mcp_role | SELECT |
| public.contatos_emergencia | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_assinatura_tokens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_assinatura_tokens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_assinatura_tokens | dp_mcp_role | SELECT |
| public.contrato_assinatura_tokens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_templates | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_templates | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_templates | dp_mcp_role | SELECT |
| public.contrato_templates | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_token_eventos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_token_eventos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contrato_token_eventos | dp_mcp_role | SELECT |
| public.contrato_token_eventos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contratos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contratos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contratos | dp_mcp_role | SELECT |
| public.contratos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contratos_gerados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contratos_gerados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.contratos_gerados | dp_mcp_role | SELECT |
| public.contratos_gerados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.controle_acesso | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.controle_acesso | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.controle_acesso | dp_mcp_role | SELECT |
| public.controle_acesso | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.convenios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.convenios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.convenios | dp_mcp_role | SELECT |
| public.convenios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.convenios_colaboradores | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.convenios_colaboradores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.convenios_colaboradores | dp_mcp_role | SELECT |
| public.convenios_colaboradores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.curriculos_arquivos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.curriculos_arquivos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.curriculos_arquivos | dp_mcp_role | SELECT |
| public.curriculos_arquivos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dados_estagiario | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dados_estagiario | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dados_estagiario | dp_mcp_role | SELECT |
| public.dados_estagiario | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dados_estrangeiro | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dados_estrangeiro | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dados_estrangeiro | dp_mcp_role | SELECT |
| public.dados_estrangeiro | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dctfweb_declaracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dctfweb_declaracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dctfweb_declaracoes | dp_mcp_role | SELECT |
| public.dctfweb_declaracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.deficiencias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.deficiencias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.deficiencias | dp_mcp_role | SELECT |
| public.deficiencias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.departamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.departamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.departamentos | dp_mcp_role | SELECT |
| public.departamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dependentes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dependentes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dependentes | dp_mcp_role | SELECT |
| public.dependentes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dependentes_beneficios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dependentes_beneficios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dependentes_beneficios | dp_mcp_role | SELECT |
| public.dependentes_beneficios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.descricoes_logradouro | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.descricoes_logradouro | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.descricoes_logradouro | dp_mcp_role | SELECT |
| public.descricoes_logradouro | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.desligamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.desligamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.desligamentos | dp_mcp_role | SELECT |
| public.desligamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.despesas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.despesas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.despesas | dp_mcp_role | SELECT |
| public.despesas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.despesas_aprovacoes_log | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.despesas_aprovacoes_log | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.despesas_aprovacoes_log | dp_mcp_role | SELECT |
| public.despesas_aprovacoes_log | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documento_templates | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documento_templates | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documento_templates | dp_mcp_role | SELECT |
| public.documento_templates | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos | dp_mcp_role | SELECT |
| public.documentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_admissao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_admissao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_admissao | dp_mcp_role | SELECT |
| public.documentos_admissao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_afastamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_afastamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_afastamento | dp_mcp_role | SELECT |
| public.documentos_afastamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_assinatura | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_assinatura | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_assinatura | dp_mcp_role | SELECT |
| public.documentos_assinatura | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_colaborador | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_colaborador | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_colaborador | dp_mcp_role | SELECT |
| public.documentos_colaborador | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_historico | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_historico | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_historico | dp_mcp_role | SELECT |
| public.documentos_historico | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_pessoais_arquivos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_pessoais_arquivos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.documentos_pessoais_arquivos | dp_mcp_role | SELECT |
| public.documentos_pessoais_arquivos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_config | dp_mcp_role | SELECT |
| public.dp_audit_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log | anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| public.dp_audit_log | authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| public.dp_audit_log | dp_mcp_role | INSERT, SELECT |
| public.dp_audit_log | service_role | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| public.dp_audit_log_2026_07 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_07 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_07 | dp_mcp_role | SELECT |
| public.dp_audit_log_2026_07 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_08 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_08 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_08 | dp_mcp_role | SELECT |
| public.dp_audit_log_2026_08 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_09 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_09 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_09 | dp_mcp_role | SELECT |
| public.dp_audit_log_2026_09 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_10 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_10 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_10 | dp_mcp_role | SELECT |
| public.dp_audit_log_2026_10 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_11 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_11 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_11 | dp_mcp_role | SELECT |
| public.dp_audit_log_2026_11 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_12 | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_12 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2026_12 | dp_mcp_role | SELECT |
| public.dp_audit_log_2026_12 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_2027_01 | dp_mcp_role | SELECT |
| public.dp_audit_log_2027_01 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_colaborador | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_colaborador | dp_mcp_role | SELECT |
| public.dp_audit_log_colaborador | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_default | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_default | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_default | dp_mcp_role | SELECT |
| public.dp_audit_log_default | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_rh | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_audit_log_rh | dp_mcp_role | SELECT |
| public.dp_audit_log_rh | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_backup_runbook | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_backup_runbook | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_backup_runbook | dp_mcp_role | SELECT |
| public.dp_backup_runbook | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_data_catalog | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_data_catalog | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_data_catalog | dp_mcp_role | INSERT, SELECT |
| public.dp_data_catalog | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_data_catalog_public | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_data_catalog_public | dp_mcp_role | SELECT |
| public.dp_data_catalog_public | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_environments | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_environments | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_environments | dp_mcp_role | SELECT |
| public.dp_environments | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_mcp_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_mcp_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_mcp_config | dp_mcp_role | SELECT |
| public.dp_mcp_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_retention_policy | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_retention_policy | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_retention_policy | dp_mcp_role | SELECT |
| public.dp_retention_policy | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_security_advisors | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_security_advisors | dp_mcp_role | SELECT |
| public.dp_security_advisors | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_slow_queries | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_slow_queries | dp_mcp_role | SELECT |
| public.dp_slow_queries | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_user_roles | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_user_roles | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.dp_user_roles | dp_mcp_role | SELECT |
| public.dp_user_roles | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.empresas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.empresas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.empresas | dp_mcp_role | SELECT |
| public.empresas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.emprestimos_consignados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.emprestimos_consignados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.emprestimos_consignados | dp_mcp_role | SELECT |
| public.emprestimos_consignados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis | dp_mcp_role | SELECT |
| public.epis | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_entregas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_entregas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_entregas | dp_mcp_role | SELECT |
| public.epis_entregas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas | dp_mcp_role | SELECT |
| public.epis_fichas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas_assinaturas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas_assinaturas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas_assinaturas | dp_mcp_role | SELECT |
| public.epis_fichas_assinaturas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas_itens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas_itens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.epis_fichas_itens | dp_mcp_role | SELECT |
| public.epis_fichas_itens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.escalas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.escalas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.escalas | dp_mcp_role | SELECT |
| public.escalas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.escalas_trabalho | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.escalas_trabalho | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.escalas_trabalho | dp_mcp_role | SELECT |
| public.escalas_trabalho | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_eventos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_eventos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_eventos | dp_mcp_role | SELECT |
| public.esocial_eventos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_lotes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_lotes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_lotes | dp_mcp_role | SELECT |
| public.esocial_lotes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_transmissao_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_transmissao_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.esocial_transmissao_logs | dp_mcp_role | SELECT |
| public.esocial_transmissao_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.etnias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.etnias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.etnias | dp_mcp_role | SELECT |
| public.etnias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.eventos_variaveis | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.eventos_variaveis | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.eventos_variaveis | dp_mcp_role | SELECT |
| public.eventos_variaveis | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.exames | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.exames | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.exames | dp_mcp_role | SELECT |
| public.exames | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.exames_agendamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.exames_agendamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.exames_agendamentos | dp_mcp_role | SELECT |
| public.exames_agendamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.excecoes_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.excecoes_ponto | dp_mcp_role | SELECT |
| public.excecoes_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.faixas_inss | authenticated | SELECT |
| public.faixas_inss | dp_mcp_role | SELECT |
| public.faixas_inss | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.faixas_irrf | authenticated | SELECT |
| public.faixas_irrf | dp_mcp_role | SELECT |
| public.faixas_irrf | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.faltas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.faltas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.faltas | dp_mcp_role | SELECT |
| public.faltas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feedbacks_360 | anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, UPDATE |
| public.feedbacks_360 | authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER |
| public.feedbacks_360 | dp_mcp_role | SELECT |
| public.feedbacks_360 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feedbacks_360_aprovacoes_gestor | authenticated | SELECT |
| public.feedbacks_360_aprovacoes_gestor | dp_mcp_role | SELECT |
| public.feedbacks_360_aprovacoes_gestor | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feedbacks_360_consolidacoes | authenticated | SELECT |
| public.feedbacks_360_consolidacoes | dp_mcp_role | SELECT |
| public.feedbacks_360_consolidacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feedbacks_360_operacoes | authenticated | SELECT |
| public.feedbacks_360_operacoes | dp_mcp_role | SELECT |
| public.feedbacks_360_operacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feedbacks_360_validacoes_potencial | authenticated | SELECT |
| public.feedbacks_360_validacoes_potencial | dp_mcp_role | SELECT |
| public.feedbacks_360_validacoes_potencial | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feriados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feriados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.feriados | dp_mcp_role | SELECT |
| public.feriados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias | dp_mcp_role | SELECT |
| public.ferias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_aprovacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_aprovacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_aprovacoes | dp_mcp_role | SELECT |
| public.ferias_aprovacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_aprovacoes_log | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_aprovacoes_log | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_aprovacoes_log | dp_mcp_role | SELECT |
| public.ferias_aprovacoes_log | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_arquivos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_arquivos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_arquivos | dp_mcp_role | SELECT |
| public.ferias_arquivos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_audit_log | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_audit_log | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_audit_log | dp_mcp_role | SELECT |
| public.ferias_audit_log | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_coletivas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_coletivas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_coletivas | dp_mcp_role | SELECT |
| public.ferias_coletivas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_programacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_programacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_programacao | dp_mcp_role | SELECT |
| public.ferias_programacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_reconciliacao_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_reconciliacao_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_reconciliacao_logs | dp_mcp_role | SELECT |
| public.ferias_reconciliacao_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_solicitacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_solicitacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ferias_solicitacoes | dp_mcp_role | SELECT |
| public.ferias_solicitacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fgts_digital_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fgts_digital_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fgts_digital_logs | dp_mcp_role | SELECT |
| public.fgts_digital_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fila_notificacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fila_notificacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fila_notificacoes | dp_mcp_role | SELECT |
| public.fila_notificacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fila_processamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fila_processamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.fila_processamento | dp_mcp_role | SELECT |
| public.fila_processamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_assinaturas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_assinaturas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_assinaturas | dp_mcp_role | SELECT |
| public.folha_assinaturas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_auditoria | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_auditoria | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_auditoria | dp_mcp_role | SELECT |
| public.folha_auditoria | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_eventos_auditoria | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_eventos_auditoria | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_eventos_auditoria | dp_mcp_role | SELECT |
| public.folha_eventos_auditoria | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_itens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_itens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_itens | dp_mcp_role | SELECT |
| public.folha_itens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_lock_conflicts | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_lock_conflicts | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folha_lock_conflicts | dp_mcp_role | SELECT |
| public.folha_lock_conflicts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folhas_pagamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folhas_pagamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.folhas_pagamento | dp_mcp_role | SELECT |
| public.folhas_pagamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.formacoes_academicas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.formacoes_academicas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.formacoes_academicas | dp_mcp_role | SELECT |
| public.formacoes_academicas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.generos_documento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.generos_documento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.generos_documento | dp_mcp_role | SELECT |
| public.generos_documento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_allowed_countries | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_allowed_countries | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_allowed_countries | dp_mcp_role | SELECT |
| public.geo_allowed_countries | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_blocked_attempts | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_blocked_attempts | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_blocked_attempts | dp_mcp_role | SELECT |
| public.geo_blocked_attempts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_blocking_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_blocking_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.geo_blocking_config | dp_mcp_role | SELECT |
| public.geo_blocking_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.govbr_auth_state | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.govbr_auth_state | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.govbr_auth_state | dp_mcp_role | SELECT |
| public.govbr_auth_state | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_fgts | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_fgts | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_fgts | dp_mcp_role | SELECT |
| public.guias_fgts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_fgts_digital | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_fgts_digital | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_fgts_digital | dp_mcp_role | SELECT |
| public.guias_fgts_digital | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_inss | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_inss | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.guias_inss | dp_mcp_role | SELECT |
| public.guias_inss | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.health_checks | dp_mcp_role | SELECT |
| public.health_checks | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_alertas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_alertas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_alertas | dp_mcp_role | SELECT |
| public.historico_alertas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_calculos_folha | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_calculos_folha | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_calculos_folha | dp_mcp_role | SELECT |
| public.historico_calculos_folha | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_cargo | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_cargo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_cargo | dp_mcp_role | SELECT |
| public.historico_cargo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_contratos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_contratos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_contratos | dp_mcp_role | SELECT |
| public.historico_contratos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_ferias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_ferias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_ferias | dp_mcp_role | SELECT |
| public.historico_ferias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_rescisoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| public.historico_rescisoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_rescisoes | dp_mcp_role | SELECT |
| public.historico_rescisoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_salarial | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_salarial | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.historico_salarial | dp_mcp_role | SELECT |
| public.historico_salarial | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.holerite_distribuicoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.holerite_distribuicoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.holerite_distribuicoes | dp_mcp_role | SELECT |
| public.holerite_distribuicoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.holerites | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.holerites | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.holerites | dp_mcp_role | SELECT |
| public.holerites | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.homologacoes_rescisao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.homologacoes_rescisao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.homologacoes_rescisao | dp_mcp_role | SELECT |
| public.homologacoes_rescisao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ia_provisoes_alertas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ia_provisoes_alertas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ia_provisoes_alertas | dp_mcp_role | SELECT |
| public.ia_provisoes_alertas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.idempotency_keys | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.idempotency_keys | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.idempotency_keys | dp_mcp_role | SELECT |
| public.idempotency_keys | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.identidades_genero | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.identidades_genero | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.identidades_genero | dp_mcp_role | SELECT |
| public.identidades_genero | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.inscricoes_cursos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.inscricoes_cursos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.inscricoes_cursos | dp_mcp_role | SELECT |
| public.inscricoes_cursos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integracao_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integracao_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integracao_logs | dp_mcp_role | SELECT |
| public.integracao_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.integracoes | dp_mcp_role | SELECT |
| public.integracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ip_whitelist | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ip_whitelist | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ip_whitelist | dp_mcp_role | SELECT |
| public.ip_whitelist | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.itens_folha | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.itens_folha | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.itens_folha | dp_mcp_role | SELECT |
| public.itens_folha | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.jornadas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.jornadas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.jornadas | dp_mcp_role | SELECT |
| public.jornadas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.jornadas_horarios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.jornadas_horarios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.jornadas_horarios | dp_mcp_role | SELECT |
| public.jornadas_horarios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lancamentos_contabeis | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lancamentos_contabeis | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lancamentos_contabeis | dp_mcp_role | SELECT |
| public.lancamentos_contabeis | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lancamentos_folha | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lancamentos_folha | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lancamentos_folha | dp_mcp_role | SELECT |
| public.lancamentos_folha | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_consentimentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_consentimentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_consentimentos | dp_mcp_role | SELECT |
| public.lgpd_consentimentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_fila_limpeza | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_fila_limpeza | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_fila_limpeza | dp_mcp_role | SELECT |
| public.lgpd_fila_limpeza | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_politicas_retencao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_politicas_retencao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_politicas_retencao | dp_mcp_role | SELECT |
| public.lgpd_politicas_retencao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_retencao_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_retencao_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_retencao_logs | dp_mcp_role | SELECT |
| public.lgpd_retencao_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_solicitacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_solicitacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lgpd_solicitacoes | dp_mcp_role | SELECT |
| public.lgpd_solicitacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.linhas_transporte | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.linhas_transporte | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.linhas_transporte | dp_mcp_role | SELECT |
| public.linhas_transporte | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.locais_trabalho | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.locais_trabalho | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.locais_trabalho | dp_mcp_role | SELECT |
| public.locais_trabalho | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.log_envio_relatorios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.log_envio_relatorios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.log_envio_relatorios | dp_mcp_role | SELECT |
| public.log_envio_relatorios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_attempts | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_attempts | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_attempts | dp_mcp_role | SELECT |
| public.login_attempts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_lockouts | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_lockouts | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_lockouts | dp_mcp_role | SELECT |
| public.login_lockouts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_rate_limits | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_rate_limits | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.login_rate_limits | dp_mcp_role | SELECT |
| public.login_rate_limits | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_integracoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_integracoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_integracoes | dp_mcp_role | SELECT |
| public.logs_integracoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_sincronizacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_sincronizacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_sincronizacao | dp_mcp_role | SELECT |
| public.logs_sincronizacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_sistema | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_sistema | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.logs_sistema | dp_mcp_role | SELECT |
| public.logs_sistema | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lotacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lotacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.lotacoes | dp_mcp_role | SELECT |
| public.lotacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_ciencia_tokens | dp_mcp_role | SELECT |
| public.medidas_ciencia_tokens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares | dp_mcp_role | SELECT |
| public.medidas_disciplinares | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_anexos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_anexos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_anexos | dp_mcp_role | SELECT |
| public.medidas_disciplinares_anexos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_contestacao_anexos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_contestacao_anexos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_contestacao_anexos | dp_mcp_role | SELECT |
| public.medidas_disciplinares_contestacao_anexos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_integracao | authenticated | MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| public.medidas_disciplinares_integracao | dp_mcp_role | SELECT |
| public.medidas_disciplinares_integracao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_workflow_log | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_workflow_log | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.medidas_disciplinares_workflow_log | dp_mcp_role | SELECT |
| public.medidas_disciplinares_workflow_log | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.metas_okrs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.metas_okrs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.metas_okrs | dp_mcp_role | SELECT |
| public.metas_okrs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.metricas_processamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.metricas_processamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.metricas_processamento | dp_mcp_role | SELECT |
| public.metricas_processamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.motivos_afastamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.motivos_afastamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.motivos_afastamento | dp_mcp_role | SELECT |
| public.motivos_afastamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.nacionalidades | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.nacionalidades | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.nacionalidades | dp_mcp_role | SELECT |
| public.nacionalidades | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ninebox_permissoes_homologacao | dp_mcp_role | SELECT |
| public.ninebox_permissoes_homologacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notificacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notificacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notificacoes | dp_mcp_role | SELECT |
| public.notificacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notificacoes_admissao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notificacoes_admissao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.notificacoes_admissao | dp_mcp_role | SELECT |
| public.notificacoes_admissao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_colaborador | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_colaborador | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_colaborador | dp_mcp_role | SELECT |
| public.onboarding_colaborador | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_documentos_obrigatorios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_documentos_obrigatorios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_documentos_obrigatorios | dp_mcp_role | SELECT |
| public.onboarding_documentos_obrigatorios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_kits | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_kits | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_kits | dp_mcp_role | SELECT |
| public.onboarding_kits | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_tarefas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_tarefas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_tarefas | dp_mcp_role | SELECT |
| public.onboarding_tarefas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_template_tarefas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_template_tarefas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_template_tarefas | dp_mcp_role | SELECT |
| public.onboarding_template_tarefas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_templates | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_templates | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.onboarding_templates | dp_mcp_role | SELECT |
| public.onboarding_templates | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paises | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paises | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.paises | dp_mcp_role | SELECT |
| public.paises | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.parametros_fiscais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.parametros_fiscais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.parametros_fiscais | dp_mcp_role | SELECT |
| public.parametros_fiscais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.parametros_sistema | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.parametros_sistema | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.parametros_sistema | dp_mcp_role | SELECT |
| public.parametros_sistema | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_history | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_history | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_history | dp_mcp_role | SELECT |
| public.password_history | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_policies | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_policies | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_policies | dp_mcp_role | SELECT |
| public.password_policies | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_config | dp_mcp_role | SELECT |
| public.password_reset_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_requests | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_requests | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.password_reset_requests | dp_mcp_role | SELECT |
| public.password_reset_requests | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_avaliacoes_cargo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_avaliacoes_cargo | dp_mcp_role | SELECT |
| public.pcs_avaliacoes_cargo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_fatores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_fatores | dp_mcp_role | SELECT |
| public.pcs_fatores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_grades | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_grades | dp_mcp_role | SELECT |
| public.pcs_grades | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_pesquisa_salarial | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_pesquisa_salarial | dp_mcp_role | SELECT |
| public.pcs_pesquisa_salarial | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_planos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pcs_planos | dp_mcp_role | SELECT |
| public.pcs_planos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pdi_plano_desenvolvimento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pdi_plano_desenvolvimento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pdi_plano_desenvolvimento | dp_mcp_role | SELECT |
| public.pdi_plano_desenvolvimento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pdis | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pdis | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pdis | dp_mcp_role | SELECT |
| public.pdis | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pendencias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pendencias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pendencias | dp_mcp_role | SELECT |
| public.pendencias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pensoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pensoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pensoes | dp_mcp_role | SELECT |
| public.pensoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_aquisitivos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_aquisitivos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_aquisitivos | dp_mcp_role | SELECT |
| public.periodos_aquisitivos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_experiencia | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_experiencia | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_experiencia | dp_mcp_role | SELECT |
| public.periodos_experiencia | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.periodos_ponto | dp_mcp_role | SELECT |
| public.periodos_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissao_perfis | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissao_perfis | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissao_perfis | dp_mcp_role | SELECT |
| public.permissao_perfis | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissao_recursos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissao_recursos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissao_recursos | dp_mcp_role | SELECT |
| public.permissao_recursos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissions | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissions | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.permissions | dp_mcp_role | SELECT |
| public.permissions | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.personnel_budget | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.personnel_budget | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.personnel_budget | dp_mcp_role | SELECT |
| public.personnel_budget | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas | dp_mcp_role | SELECT |
| public.pesquisas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas_perguntas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas_perguntas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas_perguntas | dp_mcp_role | SELECT |
| public.pesquisas_perguntas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas_respostas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas_respostas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pesquisas_respostas | dp_mcp_role | SELECT |
| public.pesquisas_respostas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pii_access_alerts | dp_mcp_role | SELECT |
| public.pii_access_alerts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pii_access_logs | authenticated | SELECT |
| public.pii_access_logs | dp_mcp_role | SELECT |
| public.pii_access_logs | service_role | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pix_itens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pix_itens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pix_itens | dp_mcp_role | SELECT |
| public.pix_itens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pix_lotes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pix_lotes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pix_lotes | dp_mcp_role | SELECT |
| public.pix_lotes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.plano_contas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.plano_contas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.plano_contas | dp_mcp_role | SELECT |
| public.plano_contas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.planos_saude | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.planos_saude | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.planos_saude | dp_mcp_role | SELECT |
| public.planos_saude | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_ajustes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_ajustes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_ajustes | dp_mcp_role | SELECT |
| public.ponto_ajustes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_auditoria | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_auditoria | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_auditoria | dp_mcp_role | SELECT |
| public.ponto_auditoria | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_auditoria_fraude | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_auditoria_fraude | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_auditoria_fraude | dp_mcp_role | SELECT |
| public.ponto_auditoria_fraude | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_espelhos_assinados | anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| public.ponto_espelhos_assinados | authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| public.ponto_espelhos_assinados | dp_mcp_role | SELECT |
| public.ponto_espelhos_assinados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_espelhos_revogacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_espelhos_revogacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_espelhos_revogacoes | dp_mcp_role | SELECT |
| public.ponto_espelhos_revogacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_regras_aprovacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_regras_aprovacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_regras_aprovacao | dp_mcp_role | SELECT |
| public.ponto_regras_aprovacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_seguranca_blacklist | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_seguranca_blacklist | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.ponto_seguranca_blacklist | dp_mcp_role | SELECT |
| public.ponto_seguranca_blacklist | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pontos_abertos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.pontos_abertos | dp_mcp_role | SELECT |
| public.pontos_abertos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.portal_notificacoes_settings | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.portal_notificacoes_settings | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.portal_notificacoes_settings | dp_mcp_role | SELECT |
| public.portal_notificacoes_settings | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_alertas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_alertas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_alertas | dp_mcp_role | SELECT |
| public.premiacoes_alertas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_auditoria | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_auditoria | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_auditoria | dp_mcp_role | SELECT |
| public.premiacoes_auditoria | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_campanhas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_campanhas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_campanhas | dp_mcp_role | SELECT |
| public.premiacoes_campanhas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_cenarios_simulacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_cenarios_simulacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_cenarios_simulacao | dp_mcp_role | SELECT |
| public.premiacoes_cenarios_simulacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_pagamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_pagamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_pagamentos | dp_mcp_role | SELECT |
| public.premiacoes_pagamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_regras | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_regras | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_regras | dp_mcp_role | SELECT |
| public.premiacoes_regras | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_roi_cenarios | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_roi_cenarios | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.premiacoes_roi_cenarios | dp_mcp_role | SELECT |
| public.premiacoes_roi_cenarios | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.profiles | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.profiles | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.profiles | dp_mcp_role | SELECT |
| public.profiles | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.promo_brindes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.promo_brindes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.promo_brindes | dp_mcp_role | SELECT |
| public.promo_brindes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.promocoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.promocoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.promocoes | dp_mcp_role | SELECT |
| public.promocoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.prorrogacoes_afastamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.prorrogacoes_afastamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.prorrogacoes_afastamento | dp_mcp_role | SELECT |
| public.prorrogacoes_afastamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisao_auditoria | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisao_auditoria | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisao_auditoria | dp_mcp_role | SELECT |
| public.provisao_auditoria | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisao_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisao_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisao_logs | dp_mcp_role | SELECT |
| public.provisao_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisoes_folha | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisoes_folha | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisoes_folha | dp_mcp_role | SELECT |
| public.provisoes_folha | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisoes_mensais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisoes_mensais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.provisoes_mensais | dp_mcp_role | SELECT |
| public.provisoes_mensais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.push_subscriptions | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.push_subscriptions | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.push_subscriptions | dp_mcp_role | SELECT |
| public.push_subscriptions | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.query_telemetry | dp_mcp_role | SELECT |
| public.query_telemetry | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limit_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limit_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limit_config | dp_mcp_role | SELECT |
| public.rate_limit_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limit_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limit_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limit_logs | dp_mcp_role | SELECT |
| public.rate_limit_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limits | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limits | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rate_limits | dp_mcp_role | SELECT |
| public.rate_limits | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recargas_vale | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recargas_vale | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recargas_vale | dp_mcp_role | SELECT |
| public.recargas_vale | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_agendamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_agendamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_agendamentos | dp_mcp_role | SELECT |
| public.recrutamento_agendamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_anotacoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_anotacoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_anotacoes | dp_mcp_role | SELECT |
| public.recrutamento_anotacoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_entrevistas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_entrevistas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_entrevistas | dp_mcp_role | SELECT |
| public.recrutamento_entrevistas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_testes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_testes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.recrutamento_testes | dp_mcp_role | SELECT |
| public.recrutamento_testes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.registros_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.registros_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.registros_ponto | dp_mcp_role | SELECT |
| public.registros_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relacionamentos_contato_emergencia | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relacionamentos_contato_emergencia | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relacionamentos_contato_emergencia | dp_mcp_role | SELECT |
| public.relacionamentos_contato_emergencia | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relacionamentos_dependentes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relacionamentos_dependentes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relacionamentos_dependentes | dp_mcp_role | SELECT |
| public.relacionamentos_dependentes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relatorios_agendados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relatorios_agendados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.relatorios_agendados | dp_mcp_role | SELECT |
| public.relatorios_agendados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.report_dispatch_attempts | dp_mcp_role | SELECT |
| public.report_dispatch_attempts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.role_permissions | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.role_permissions | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.role_permissions | dp_mcp_role | SELECT |
| public.role_permissions | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rubricas_folha | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rubricas_folha | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.rubricas_folha | dp_mcp_role | SELECT |
| public.rubricas_folha | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.saved_filters | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.saved_filters | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.saved_filters | dp_mcp_role | SELECT |
| public.saved_filters | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sec_policy_regressions | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sec_policy_regressions | dp_mcp_role | SELECT |
| public.sec_policy_regressions | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sec_seal_events | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sec_seal_events | dp_mcp_role | SELECT |
| public.sec_seal_events | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.security_alerts | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.security_alerts | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.security_alerts | dp_mcp_role | SELECT |
| public.security_alerts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sefip_arquivos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sefip_arquivos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sefip_arquivos | dp_mcp_role | SELECT |
| public.sefip_arquivos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seguros_colaboradores | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seguros_colaboradores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seguros_colaboradores | dp_mcp_role | SELECT |
| public.seguros_colaboradores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seguros_vida | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seguros_vida | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.seguros_vida | dp_mcp_role | SELECT |
| public.seguros_vida | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.simulacoes_fiscais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.simulacoes_fiscais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.simulacoes_fiscais | dp_mcp_role | SELECT |
| public.simulacoes_fiscais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sindicatos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sindicatos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sindicatos | dp_mcp_role | SELECT |
| public.sindicatos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sinistros_seguro | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sinistros_seguro | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sinistros_seguro | dp_mcp_role | SELECT |
| public.sinistros_seguro | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.solicitacoes_ajuste_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.solicitacoes_ajuste_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.solicitacoes_ajuste_ponto | dp_mcp_role | SELECT |
| public.solicitacoes_ajuste_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.solicitacoes_hora_extra | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.solicitacoes_hora_extra | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.solicitacoes_hora_extra | dp_mcp_role | SELECT |
| public.solicitacoes_hora_extra | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat | dp_mcp_role | SELECT |
| public.sst_cat | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat_anexos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat_anexos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat_anexos | dp_mcp_role | SELECT |
| public.sst_cat_anexos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat_testemunhas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat_testemunhas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_cat_testemunhas | dp_mcp_role | SELECT |
| public.sst_cat_testemunhas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_exposicao_riscos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_exposicao_riscos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_exposicao_riscos | dp_mcp_role | SELECT |
| public.sst_exposicao_riscos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_extintores | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_extintores | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_extintores | dp_mcp_role | SELECT |
| public.sst_extintores | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_extintores_inspecoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_extintores_inspecoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_extintores_inspecoes | dp_mcp_role | SELECT |
| public.sst_extintores_inspecoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_incidentes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_incidentes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_incidentes | dp_mcp_role | SELECT |
| public.sst_incidentes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_ltcat_laudos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_ltcat_laudos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_ltcat_laudos | dp_mcp_role | SELECT |
| public.sst_ltcat_laudos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_ordens_servico | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_ordens_servico | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_ordens_servico | dp_mcp_role | SELECT |
| public.sst_ordens_servico | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_programas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_programas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_programas | dp_mcp_role | SELECT |
| public.sst_programas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_assinaturas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_assinaturas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_assinaturas | dp_mcp_role | SELECT |
| public.sst_regimento_assinaturas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_documentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_documentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_documentos | dp_mcp_role | SELECT |
| public.sst_regimento_documentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_interno | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_interno | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_regimento_interno | dp_mcp_role | SELECT |
| public.sst_regimento_interno | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_riscos_ambientais | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_riscos_ambientais | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.sst_riscos_ambientais | dp_mcp_role | SELECT |
| public.sst_riscos_ambientais | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tarefas_onboarding | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tarefas_onboarding | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tarefas_onboarding | dp_mcp_role | SELECT |
| public.tarefas_onboarding | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.taxas_cambio | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.taxas_cambio | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.taxas_cambio | dp_mcp_role | SELECT |
| public.taxas_cambio | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tempos_residencia | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tempos_residencia | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tempos_residencia | dp_mcp_role | SELECT |
| public.tempos_residencia | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.times | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.times | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.times | dp_mcp_role | SELECT |
| public.times | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.times_brindes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.times_brindes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.times_brindes | dp_mcp_role | SELECT |
| public.times_brindes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_admissao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_admissao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_admissao | dp_mcp_role | SELECT |
| public.tipos_admissao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_aviso_previo | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_aviso_previo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_aviso_previo | dp_mcp_role | SELECT |
| public.tipos_aviso_previo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_beneficio | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_beneficio | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_beneficio | dp_mcp_role | SELECT |
| public.tipos_beneficio | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_deficiencia | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_deficiencia | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_deficiencia | dp_mcp_role | SELECT |
| public.tipos_deficiencia | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_desligamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_desligamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_desligamento | dp_mcp_role | SELECT |
| public.tipos_desligamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_estabilidade | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_estabilidade | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_estabilidade | dp_mcp_role | SELECT |
| public.tipos_estabilidade | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_pagamento | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_pagamento | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_pagamento | dp_mcp_role | SELECT |
| public.tipos_pagamento | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_salario | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_salario | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_salario | dp_mcp_role | SELECT |
| public.tipos_salario | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_visto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_visto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.tipos_visto | dp_mcp_role | SELECT |
| public.tipos_visto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.training_image_requests | dp_mcp_role | SELECT |
| public.training_image_requests | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.training_image_settings | dp_mcp_role | SELECT |
| public.training_image_settings | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.training_images | authenticated | SELECT |
| public.training_images | dp_mcp_role | SELECT |
| public.training_images | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.transferencias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.transferencias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.transferencias | dp_mcp_role | SELECT |
| public.transferencias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_certificados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_certificados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_certificados | dp_mcp_role | SELECT |
| public.treinamento_certificados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_feedback | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_feedback | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_feedback | dp_mcp_role | SELECT |
| public.treinamento_feedback | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_feedbacks | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_feedbacks | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_feedbacks | dp_mcp_role | SELECT |
| public.treinamento_feedbacks | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_instancias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_instancias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_instancias | dp_mcp_role | SELECT |
| public.treinamento_instancias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_participantes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_participantes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamento_participantes | dp_mcp_role | SELECT |
| public.treinamento_participantes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamentos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamentos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.treinamentos | dp_mcp_role | SELECT |
| public.treinamentos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.triagem_notas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.triagem_notas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.triagem_notas | dp_mcp_role | SELECT |
| public.triagem_notas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilha_auditoria_ponto | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilha_auditoria_ponto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilha_auditoria_ponto | dp_mcp_role | SELECT |
| public.trilha_auditoria_ponto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilhas_aprendizado | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilhas_aprendizado | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilhas_aprendizado | dp_mcp_role | SELECT |
| public.trilhas_aprendizado | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilhas_cursos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilhas_cursos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.trilhas_cursos | dp_mcp_role | SELECT |
| public.trilhas_cursos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.turnos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.turnos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.turnos | dp_mcp_role | SELECT |
| public.turnos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_empresas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_empresas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_empresas | dp_mcp_role | SELECT |
| public.user_empresas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_mfa | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_mfa | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_mfa | dp_mcp_role | SELECT |
| public.user_mfa | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_roles | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_roles | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_roles | dp_mcp_role | SELECT |
| public.user_roles | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_sessions | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_sessions | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.user_sessions | dp_mcp_role | SELECT |
| public.user_sessions | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_alertas_timeout | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_alertas_timeout | dp_mcp_role | SELECT |
| public.v_alertas_timeout | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_events_unified | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_events_unified | dp_mcp_role | SELECT |
| public.v_audit_events_unified | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_legacy | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_legacy | dp_mcp_role | SELECT |
| public.v_audit_legacy | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_trail | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| public.v_audit_trail | dp_mcp_role | SELECT |
| public.v_audit_trail | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contrato_token_timeline | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contrato_token_timeline | dp_mcp_role | SELECT |
| public.v_contrato_token_timeline | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contratos_assinatura_kpi | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contratos_assinatura_kpi | dp_mcp_role | SELECT |
| public.v_contratos_assinatura_kpi | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contratos_tokens_pendentes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contratos_tokens_pendentes | dp_mcp_role | SELECT |
| public.v_contratos_tokens_pendentes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contratos_vencendo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_contratos_vencendo | dp_mcp_role | SELECT |
| public.v_contratos_vencendo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_adiant13_elegibilidade | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_adiant13_elegibilidade | dp_mcp_role | SELECT |
| public.v_ferias_adiant13_elegibilidade | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_alerta_pagamento_d2 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_alerta_pagamento_d2 | dp_mcp_role | SELECT |
| public.v_ferias_alerta_pagamento_d2 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_alertas_criticos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_alertas_criticos | dp_mcp_role | SELECT |
| public.v_ferias_alertas_criticos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_folha_reconciliacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_ferias_folha_reconciliacao | dp_mcp_role | SELECT |
| public.v_ferias_folha_reconciliacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_idempotency_metrics | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_idempotency_metrics | dp_mcp_role | SELECT |
| public.v_idempotency_metrics | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_login_anomalies | dp_mcp_role | SELECT |
| public.v_login_anomalies | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_login_anomalies_email | dp_mcp_role | SELECT |
| public.v_login_anomalies_email | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_login_anomalies_ip | dp_mcp_role | SELECT |
| public.v_login_anomalies_ip | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_pii_access_suspeitos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_pii_access_suspeitos | dp_mcp_role | SELECT |
| public.v_pii_access_suspeitos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_slow_queries_top50 | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_slow_queries_top50 | dp_mcp_role | SELECT |
| public.v_slow_queries_top50 | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_system_health | anon | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| public.v_system_health | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_system_health | dp_mcp_role | SELECT |
| public.v_system_health | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_telemetry_last_hour | dp_mcp_role | SELECT |
| public.v_telemetry_last_hour | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.v_telemetry_slow_queries | dp_mcp_role | SELECT |
| public.v_telemetry_slow_queries | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vaga_entrevistas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vaga_entrevistas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vaga_entrevistas | dp_mcp_role | SELECT |
| public.vaga_entrevistas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vaga_etapas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vaga_etapas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vaga_etapas | dp_mcp_role | SELECT |
| public.vaga_etapas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vagas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vagas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vagas | dp_mcp_role | SELECT |
| public.vagas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vales_alimentacao | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vales_alimentacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vales_alimentacao | dp_mcp_role | SELECT |
| public.vales_alimentacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vales_transporte | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vales_transporte | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vales_transporte | dp_mcp_role | SELECT |
| public.vales_transporte | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.valores_campos_customizados | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.valores_campos_customizados | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.valores_campos_customizados | dp_mcp_role | SELECT |
| public.valores_campos_customizados | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.verbas_rescisorias | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.verbas_rescisorias | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.verbas_rescisorias | dp_mcp_role | SELECT |
| public.verbas_rescisorias | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.verification_tokens | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.verification_tokens | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.verification_tokens | dp_mcp_role | SELECT |
| public.verification_tokens | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.versao_banco | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.versao_banco | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.versao_banco | dp_mcp_role | SELECT |
| public.versao_banco | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vinculos | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vinculos | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vinculos | dp_mcp_role | SELECT |
| public.vinculos | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_alertas_compensacao | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_alertas_compensacao | dp_mcp_role | SELECT |
| public.vw_alertas_compensacao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_alertas_rh | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_alertas_rh | dp_mcp_role | SELECT |
| public.vw_alertas_rh | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_banco_horas_saldo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_banco_horas_saldo | dp_mcp_role | SELECT |
| public.vw_banco_horas_saldo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_batidas_dia | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_batidas_dia | dp_mcp_role | SELECT |
| public.vw_batidas_dia | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_batidas_resumo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_batidas_resumo | dp_mcp_role | SELECT |
| public.vw_batidas_resumo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_cadastro_incompleto | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_cadastro_incompleto | dp_mcp_role | SELECT |
| public.vw_cadastro_incompleto | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_colaboradores_completo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_colaboradores_completo | dp_mcp_role | SELECT |
| public.vw_colaboradores_completo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_dashboard_time | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_dashboard_time | dp_mcp_role | SELECT |
| public.vw_dashboard_time | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_espelho_ponto_mensal | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_espelho_ponto_mensal | dp_mcp_role | SELECT |
| public.vw_espelho_ponto_mensal | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_faltas_mensal | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_faltas_mensal | dp_mcp_role | SELECT |
| public.vw_faltas_mensal | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_feedbacks_360_versao | authenticated | SELECT |
| public.vw_feedbacks_360_versao | dp_mcp_role | SELECT |
| public.vw_feedbacks_360_versao | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_ferias_resumo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_ferias_resumo | dp_mcp_role | SELECT |
| public.vw_ferias_resumo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_folha_compliance | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_folha_compliance | dp_mcp_role | SELECT |
| public.vw_folha_compliance | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_folha_ponto_mensal | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_folha_ponto_mensal | dp_mcp_role | SELECT |
| public.vw_folha_ponto_mensal | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_absenteismo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_absenteismo | dp_mcp_role | SELECT |
| public.vw_kpi_absenteismo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_beneficios_custo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_beneficios_custo | dp_mcp_role | SELECT |
| public.vw_kpi_beneficios_custo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_ponto_resumo | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_ponto_resumo | dp_mcp_role | SELECT |
| public.vw_kpi_ponto_resumo | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_turnover | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_kpi_turnover | dp_mcp_role | SELECT |
| public.vw_kpi_turnover | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_matriz_nine_box | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_matriz_nine_box | dp_mcp_role | SELECT |
| public.vw_matriz_nine_box | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_metricas_fila | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_metricas_fila | dp_mcp_role | SELECT |
| public.vw_metricas_fila | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_passivo_trabalhista_consolidado | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_passivo_trabalhista_consolidado | dp_mcp_role | SELECT |
| public.vw_passivo_trabalhista_consolidado | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_saldo_compensacao_mensal | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.vw_saldo_compensacao_mensal | dp_mcp_role | SELECT |
| public.vw_saldo_compensacao_mensal | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webauthn_challenges | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webauthn_challenges | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webauthn_challenges | dp_mcp_role | SELECT |
| public.webauthn_challenges | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webauthn_credentials | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webauthn_credentials | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webauthn_credentials | dp_mcp_role | SELECT |
| public.webauthn_credentials | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhook_logs | dp_mcp_role | SELECT |
| public.webhook_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks | dp_mcp_role | SELECT |
| public.webhooks | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks_config | dp_mcp_role | SELECT |
| public.webhooks_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.webhooks_logs | dp_mcp_role | SELECT |
| public.webhooks_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_config | dp_mcp_role | SELECT |
| public.whatsapp_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_mensagens_logs | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_mensagens_logs | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_mensagens_logs | dp_mcp_role | SELECT |
| public.whatsapp_mensagens_logs | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_templates | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_templates | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.whatsapp_templates | dp_mcp_role | SELECT |
| public.whatsapp_templates | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_config | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_config | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_config | dp_mcp_role | SELECT |
| public.workflows_config | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_definicoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_definicoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_definicoes | dp_mcp_role | SELECT |
| public.workflows_definicoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_etapas | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_etapas | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_etapas | dp_mcp_role | SELECT |
| public.workflows_etapas | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_execucoes | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_execucoes | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_execucoes | dp_mcp_role | SELECT |
| public.workflows_execucoes | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_historico | anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_historico | authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| public.workflows_historico | dp_mcp_role | SELECT |
| public.workflows_historico | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.bucket_lifecycle_states | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets_analytics | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets_analytics | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.buckets_analytics | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.buckets_vectors | anon | SELECT |
| storage.buckets_vectors | authenticated | SELECT |
| storage.buckets_vectors | service_role | SELECT |
| storage.lifecycle_abandoned_artifacts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.objects | anon | DELETE, INSERT, SELECT, UPDATE |
| storage.objects | authenticated | DELETE, INSERT, SELECT, UPDATE |
| storage.objects | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.s3_multipart_uploads | anon | SELECT |
| storage.s3_multipart_uploads | authenticated | SELECT |
| storage.s3_multipart_uploads | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.s3_multipart_uploads_parts | anon | SELECT |
| storage.s3_multipart_uploads_parts | authenticated | SELECT |
| storage.s3_multipart_uploads_parts | service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| storage.vector_indexes | anon | SELECT |
| storage.vector_indexes | authenticated | SELECT |
| storage.vector_indexes | service_role | SELECT |


## Colunas (grants parciais)

_nenhum_


## Sequences (roles da API)

| sequence | role | privilégios |
|---|---|---|
| public.bitrix24_config_id_seq | anon | USAGE, SELECT, UPDATE |
| public.bitrix24_config_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.bitrix24_config_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.categorias_trabalhador_id_seq | anon | USAGE, SELECT, UPDATE |
| public.categorias_trabalhador_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.categorias_trabalhador_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.condicoes_ingresso_id_seq | anon | USAGE, SELECT, UPDATE |
| public.condicoes_ingresso_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.condicoes_ingresso_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.descricoes_logradouro_id_seq | anon | USAGE, SELECT, UPDATE |
| public.descricoes_logradouro_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.descricoes_logradouro_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.faixas_inss_id_seq | anon | USAGE, SELECT, UPDATE |
| public.faixas_inss_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.faixas_inss_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.faixas_irrf_id_seq | anon | USAGE, SELECT, UPDATE |
| public.faixas_irrf_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.faixas_irrf_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.generos_documento_id_seq | anon | USAGE, SELECT, UPDATE |
| public.generos_documento_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.generos_documento_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.motivos_afastamento_id_seq | anon | USAGE, SELECT, UPDATE |
| public.motivos_afastamento_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.motivos_afastamento_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.nacionalidades_id_seq | anon | USAGE, SELECT, UPDATE |
| public.nacionalidades_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.nacionalidades_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.paises_id_seq | anon | USAGE, SELECT, UPDATE |
| public.paises_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.paises_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.relacionamentos_contato_emergencia_id_seq | anon | USAGE, SELECT, UPDATE |
| public.relacionamentos_contato_emergencia_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.relacionamentos_contato_emergencia_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.relacionamentos_dependentes_id_seq | anon | USAGE, SELECT, UPDATE |
| public.relacionamentos_dependentes_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.relacionamentos_dependentes_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tempos_residencia_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tempos_residencia_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tempos_residencia_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tipos_aviso_previo_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tipos_aviso_previo_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tipos_aviso_previo_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tipos_deficiencia_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tipos_deficiencia_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tipos_deficiencia_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tipos_desligamento_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tipos_desligamento_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tipos_desligamento_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tipos_pagamento_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tipos_pagamento_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tipos_pagamento_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tipos_salario_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tipos_salario_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tipos_salario_id_seq | service_role | USAGE, SELECT, UPDATE |
| public.tipos_visto_id_seq | anon | USAGE, SELECT, UPDATE |
| public.tipos_visto_id_seq | authenticated | USAGE, SELECT, UPDATE |
| public.tipos_visto_id_seq | service_role | USAGE, SELECT, UPDATE |


## Default privileges (aplicam-se a objetos NOVOS)

| schema | owner | tipo | ACL |
|---|---|---|---|
| auth | supabase_auth_admin | functions | postgres=X/supabase_auth_admin, dashboard_user=X/supabase_auth_admin |
| auth | supabase_auth_admin | sequences | postgres=rwU/supabase_auth_admin, dashboard_user=rwU/supabase_auth_admin |
| auth | supabase_auth_admin | tables | postgres=arwdDxtm/supabase_auth_admin, dashboard_user=arwdDxtm/supabase_auth_admin |
| cron | supabase_admin | functions | postgres=X*/supabase_admin |
| cron | supabase_admin | sequences | postgres=r*w*U*/supabase_admin |
| cron | supabase_admin | tables | postgres=a*r*w*d*D*x*t*m*/supabase_admin |
| extensions | supabase_admin | functions | postgres=X*/supabase_admin |
| extensions | supabase_admin | sequences | postgres=r*w*U*/supabase_admin |
| extensions | supabase_admin | tables | postgres=a*r*w*d*D*x*t*m*/supabase_admin |
| graphql | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| graphql | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| graphql | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| graphql_public | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| graphql_public | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| graphql_public | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| pgsodium | supabase_admin | sequences | pgsodium_keyholder=rwU/supabase_admin |
| pgsodium | supabase_admin | tables | pgsodium_keyholder=arwdDxtm/supabase_admin |
| pgsodium_masks | supabase_admin | functions | pgsodium_keyiduser=X/supabase_admin |
| pgsodium_masks | supabase_admin | sequences | pgsodium_keyiduser=rwU/supabase_admin |
| pgsodium_masks | supabase_admin | tables | pgsodium_keyiduser=arwdDxtm/supabase_admin |
| public | postgres | functions | postgres=X/postgres, service_role=X/postgres, dp_mcp_role=X/postgres |
| public | postgres | sequences | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| public | postgres | tables | postgres=arwdDxtm/postgres, service_role=arwdDxtm/postgres, dp_mcp_role=r/postgres |
| public | supabase_admin | functions | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| public | supabase_admin | sequences | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| public | supabase_admin | tables | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| realtime | supabase_admin | functions | postgres=X/supabase_admin, dashboard_user=X/supabase_admin |
| realtime | supabase_admin | sequences | postgres=rwU/supabase_admin, dashboard_user=rwU/supabase_admin |
| realtime | supabase_admin | tables | postgres=a*r*wdDxtm/supabase_admin, dashboard_user=arwdDxtm/supabase_admin |
| storage | postgres | functions | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres |
| storage | postgres | sequences | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| storage | postgres | tables | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres |
