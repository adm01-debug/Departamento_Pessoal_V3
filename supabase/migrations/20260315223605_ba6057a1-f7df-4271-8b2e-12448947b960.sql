
-- =====================================================
-- BATCH 1: Tables with direct empresa_id
-- Drop old permissive policies and create tenant-isolated ones
-- =====================================================

-- afastamentos
DROP POLICY IF EXISTS "Authenticated users can manage afastamentos" ON public.afastamentos;
DROP POLICY IF EXISTS "tenant_afastamentos" ON public.afastamentos;
CREATE POLICY "tenant_afastamentos" ON public.afastamentos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- asos
DROP POLICY IF EXISTS "Auth manage asos" ON public.asos;
DROP POLICY IF EXISTS "tenant_asos" ON public.asos;
CREATE POLICY "tenant_asos" ON public.asos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- beneficios
DROP POLICY IF EXISTS "Auth users manage beneficios" ON public.beneficios;
DROP POLICY IF EXISTS "tenant_beneficios" ON public.beneficios;
CREATE POLICY "tenant_beneficios" ON public.beneficios FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- campos_customizados
DROP POLICY IF EXISTS "Auth manage campos_customizados" ON public.campos_customizados;
DROP POLICY IF EXISTS "tenant_campos_customizados" ON public.campos_customizados;
CREATE POLICY "tenant_campos_customizados" ON public.campos_customizados FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- cargos
DROP POLICY IF EXISTS "Auth users manage cargos" ON public.cargos;
DROP POLICY IF EXISTS "tenant_cargos" ON public.cargos;
CREATE POLICY "tenant_cargos" ON public.cargos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- centros_custo
DROP POLICY IF EXISTS "centros_custo_auth" ON public.centros_custo;
DROP POLICY IF EXISTS "tenant_centros_custo" ON public.centros_custo;
CREATE POLICY "tenant_centros_custo" ON public.centros_custo FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- configuracoes_intervalo
DROP POLICY IF EXISTS "Authenticated users can manage configuracoes_intervalo" ON public.configuracoes_intervalo;
DROP POLICY IF EXISTS "tenant_configuracoes_intervalo" ON public.configuracoes_intervalo;
CREATE POLICY "tenant_configuracoes_intervalo" ON public.configuracoes_intervalo FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- contas_bancarias
DROP POLICY IF EXISTS "contas_bancarias_auth" ON public.contas_bancarias;
DROP POLICY IF EXISTS "tenant_contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "tenant_contas_bancarias" ON public.contas_bancarias FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- contratos
DROP POLICY IF EXISTS "Auth users manage contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_contratos" ON public.contratos;
CREATE POLICY "tenant_contratos" ON public.contratos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- convenios
DROP POLICY IF EXISTS "Auth users manage convenios" ON public.convenios;
DROP POLICY IF EXISTS "tenant_convenios" ON public.convenios;
CREATE POLICY "tenant_convenios" ON public.convenios FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- dados_estagiario
DROP POLICY IF EXISTS "dados_estagiario_auth" ON public.dados_estagiario;
DROP POLICY IF EXISTS "tenant_dados_estagiario" ON public.dados_estagiario;
CREATE POLICY "tenant_dados_estagiario" ON public.dados_estagiario FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- dctfweb_declaracoes
DROP POLICY IF EXISTS "Auth users manage dctfweb" ON public.dctfweb_declaracoes;
DROP POLICY IF EXISTS "tenant_dctfweb_declaracoes" ON public.dctfweb_declaracoes;
CREATE POLICY "tenant_dctfweb_declaracoes" ON public.dctfweb_declaracoes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- departamentos
DROP POLICY IF EXISTS "Auth users manage departamentos" ON public.departamentos;
DROP POLICY IF EXISTS "tenant_departamentos" ON public.departamentos;
CREATE POLICY "tenant_departamentos" ON public.departamentos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- esocial_eventos
DROP POLICY IF EXISTS "Auth users manage esocial_eventos" ON public.esocial_eventos;
DROP POLICY IF EXISTS "tenant_esocial_eventos" ON public.esocial_eventos;
CREATE POLICY "tenant_esocial_eventos" ON public.esocial_eventos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- esocial_lotes
DROP POLICY IF EXISTS "Auth users manage esocial_lotes" ON public.esocial_lotes;
DROP POLICY IF EXISTS "tenant_esocial_lotes" ON public.esocial_lotes;
CREATE POLICY "tenant_esocial_lotes" ON public.esocial_lotes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- feriados (has 2 policies - drop both)
DROP POLICY IF EXISTS "Authenticated users can manage feriados" ON public.feriados;
DROP POLICY IF EXISTS "Authenticated users can view feriados" ON public.feriados;
DROP POLICY IF EXISTS "tenant_feriados" ON public.feriados;
CREATE POLICY "tenant_feriados" ON public.feriados FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- ferias
DROP POLICY IF EXISTS "Authenticated users can manage ferias" ON public.ferias;
DROP POLICY IF EXISTS "tenant_ferias" ON public.ferias;
CREATE POLICY "tenant_ferias" ON public.ferias FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- ferias_coletivas
DROP POLICY IF EXISTS "Auth manage ferias_coletivas" ON public.ferias_coletivas;
DROP POLICY IF EXISTS "tenant_ferias_coletivas" ON public.ferias_coletivas;
CREATE POLICY "tenant_ferias_coletivas" ON public.ferias_coletivas FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- ferias_solicitacoes
DROP POLICY IF EXISTS "Auth users manage ferias_solicitacoes" ON public.ferias_solicitacoes;
DROP POLICY IF EXISTS "tenant_ferias_solicitacoes" ON public.ferias_solicitacoes;
CREATE POLICY "tenant_ferias_solicitacoes" ON public.ferias_solicitacoes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- folhas_pagamento
DROP POLICY IF EXISTS "Authenticated users can manage folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "tenant_folhas_pagamento" ON public.folhas_pagamento;
CREATE POLICY "tenant_folhas_pagamento" ON public.folhas_pagamento FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- guias_fgts
DROP POLICY IF EXISTS "Auth users manage guias_fgts" ON public.guias_fgts;
DROP POLICY IF EXISTS "tenant_guias_fgts" ON public.guias_fgts;
CREATE POLICY "tenant_guias_fgts" ON public.guias_fgts FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- guias_inss
DROP POLICY IF EXISTS "Auth users manage guias_inss" ON public.guias_inss;
DROP POLICY IF EXISTS "tenant_guias_inss" ON public.guias_inss;
CREATE POLICY "tenant_guias_inss" ON public.guias_inss FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- historico_contratos
DROP POLICY IF EXISTS "Authenticated users can manage historico_contratos" ON public.historico_contratos;
DROP POLICY IF EXISTS "tenant_historico_contratos" ON public.historico_contratos;
CREATE POLICY "tenant_historico_contratos" ON public.historico_contratos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- historico_salarial
DROP POLICY IF EXISTS "Authenticated users can manage historico_salarial" ON public.historico_salarial;
DROP POLICY IF EXISTS "tenant_historico_salarial" ON public.historico_salarial;
CREATE POLICY "tenant_historico_salarial" ON public.historico_salarial FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- jornadas
DROP POLICY IF EXISTS "Auth users manage jornadas" ON public.jornadas;
DROP POLICY IF EXISTS "tenant_jornadas" ON public.jornadas;
CREATE POLICY "tenant_jornadas" ON public.jornadas FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- locais_trabalho
DROP POLICY IF EXISTS "Authenticated users can manage locais_trabalho" ON public.locais_trabalho;
DROP POLICY IF EXISTS "tenant_locais_trabalho" ON public.locais_trabalho;
CREATE POLICY "tenant_locais_trabalho" ON public.locais_trabalho FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- lotacoes
DROP POLICY IF EXISTS "Auth users manage lotacoes" ON public.lotacoes;
DROP POLICY IF EXISTS "tenant_lotacoes" ON public.lotacoes;
CREATE POLICY "tenant_lotacoes" ON public.lotacoes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- planos_saude
DROP POLICY IF EXISTS "Auth users manage planos_saude" ON public.planos_saude;
DROP POLICY IF EXISTS "tenant_planos_saude" ON public.planos_saude;
CREATE POLICY "tenant_planos_saude" ON public.planos_saude FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- registros_ponto
DROP POLICY IF EXISTS "Authenticated users can manage registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "tenant_registros_ponto" ON public.registros_ponto;
CREATE POLICY "tenant_registros_ponto" ON public.registros_ponto FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- sefip_arquivos
DROP POLICY IF EXISTS "Auth users manage sefip_arquivos" ON public.sefip_arquivos;
DROP POLICY IF EXISTS "tenant_sefip_arquivos" ON public.sefip_arquivos;
CREATE POLICY "tenant_sefip_arquivos" ON public.sefip_arquivos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- seguros_vida
DROP POLICY IF EXISTS "Auth users manage seguros_vida" ON public.seguros_vida;
DROP POLICY IF EXISTS "tenant_seguros_vida" ON public.seguros_vida;
CREATE POLICY "tenant_seguros_vida" ON public.seguros_vida FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- solicitacoes_hora_extra
DROP POLICY IF EXISTS "Authenticated users can manage solicitacoes_hora_extra" ON public.solicitacoes_hora_extra;
DROP POLICY IF EXISTS "tenant_solicitacoes_hora_extra" ON public.solicitacoes_hora_extra;
CREATE POLICY "tenant_solicitacoes_hora_extra" ON public.solicitacoes_hora_extra FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- times
DROP POLICY IF EXISTS "Authenticated users can manage times" ON public.times;
DROP POLICY IF EXISTS "tenant_times" ON public.times;
CREATE POLICY "tenant_times" ON public.times FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- treinamentos
DROP POLICY IF EXISTS "Auth users manage treinamentos" ON public.treinamentos;
DROP POLICY IF EXISTS "tenant_treinamentos" ON public.treinamentos;
CREATE POLICY "tenant_treinamentos" ON public.treinamentos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- vales_alimentacao
DROP POLICY IF EXISTS "Auth users manage vales_alimentacao" ON public.vales_alimentacao;
DROP POLICY IF EXISTS "tenant_vales_alimentacao" ON public.vales_alimentacao;
CREATE POLICY "tenant_vales_alimentacao" ON public.vales_alimentacao FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- webhooks
DROP POLICY IF EXISTS "Authenticated users can manage webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "tenant_webhooks" ON public.webhooks;
CREATE POLICY "tenant_webhooks" ON public.webhooks FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- webhooks_config
DROP POLICY IF EXISTS "Auth manage webhooks_config" ON public.webhooks_config;
DROP POLICY IF EXISTS "tenant_webhooks_config" ON public.webhooks_config;
CREATE POLICY "tenant_webhooks_config" ON public.webhooks_config FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
