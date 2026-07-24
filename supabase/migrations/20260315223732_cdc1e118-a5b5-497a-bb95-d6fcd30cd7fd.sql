
-- =====================================================
-- BATCH 3: Tables linked via parent FK chains + remaining
-- =====================================================

-- documentos_afastamento → via afastamento_id → afastamentos.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage docs_afastamento" ON public.documentos_afastamento;
DROP POLICY IF EXISTS "tenant_documentos_afastamento" ON public.documentos_afastamento;
CREATE POLICY "tenant_documentos_afastamento" ON public.documentos_afastamento FOR ALL TO authenticated
  USING (afastamento_id IN (SELECT id FROM public.afastamentos WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (afastamento_id IN (SELECT id FROM public.afastamentos WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- ferias_aprovacoes → via ferias_id → ferias.empresa_id
DROP POLICY IF EXISTS "ferias_aprovacoes_auth" ON public.ferias_aprovacoes;
DROP POLICY IF EXISTS "tenant_ferias_aprovacoes" ON public.ferias_aprovacoes;
CREATE POLICY "tenant_ferias_aprovacoes" ON public.ferias_aprovacoes FOR ALL TO authenticated
  USING (ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- ferias_arquivos → via ferias_id → ferias.empresa_id
DROP POLICY IF EXISTS "ferias_arquivos_auth" ON public.ferias_arquivos;
DROP POLICY IF EXISTS "tenant_ferias_arquivos" ON public.ferias_arquivos;
CREATE POLICY "tenant_ferias_arquivos" ON public.ferias_arquivos FOR ALL TO authenticated
  USING (ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- historico_ferias → via ferias_id → ferias.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage historico_ferias" ON public.historico_ferias;
DROP POLICY IF EXISTS "tenant_historico_ferias" ON public.historico_ferias;
CREATE POLICY "tenant_historico_ferias" ON public.historico_ferias FOR ALL TO authenticated
  USING (ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (ferias_id IN (SELECT id FROM public.ferias WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- prorrogacoes_afastamento → via afastamento_id → afastamentos.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage prorrogacoes" ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS "tenant_prorrogacoes_afastamento" ON public.prorrogacoes_afastamento;
CREATE POLICY "tenant_prorrogacoes_afastamento" ON public.prorrogacoes_afastamento FOR ALL TO authenticated
  USING (afastamento_id IN (SELECT id FROM public.afastamentos WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (afastamento_id IN (SELECT id FROM public.afastamentos WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- dependentes_beneficios → via dependente_id → dependentes.colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "dependentes_beneficios_auth" ON public.dependentes_beneficios;
DROP POLICY IF EXISTS "tenant_dependentes_beneficios" ON public.dependentes_beneficios;
CREATE POLICY "tenant_dependentes_beneficios" ON public.dependentes_beneficios FOR ALL TO authenticated
  USING (dependente_id IN (SELECT id FROM public.dependentes WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))))
  WITH CHECK (dependente_id IN (SELECT id FROM public.dependentes WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))));

-- lancamentos_folha → via holerite_id → holerites.colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage lancamentos" ON public.lancamentos_folha;
DROP POLICY IF EXISTS "tenant_lancamentos_folha" ON public.lancamentos_folha;
CREATE POLICY "tenant_lancamentos_folha" ON public.lancamentos_folha FOR ALL TO authenticated
  USING (holerite_id IN (SELECT id FROM public.holerites WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))))
  WITH CHECK (holerite_id IN (SELECT id FROM public.holerites WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))));

-- linhas_transporte → via vale_transporte_id → vales_transporte.colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "Auth users manage linhas_transporte" ON public.linhas_transporte;
DROP POLICY IF EXISTS "tenant_linhas_transporte" ON public.linhas_transporte;
CREATE POLICY "tenant_linhas_transporte" ON public.linhas_transporte FOR ALL TO authenticated
  USING (vale_transporte_id IN (SELECT id FROM public.vales_transporte WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))))
  WITH CHECK (vale_transporte_id IN (SELECT id FROM public.vales_transporte WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))));

-- webhook_logs → via webhook_id → webhooks.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "tenant_webhook_logs" ON public.webhook_logs;
CREATE POLICY "tenant_webhook_logs" ON public.webhook_logs FOR ALL TO authenticated
  USING (webhook_id IN (SELECT id FROM public.webhooks WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (webhook_id IN (SELECT id FROM public.webhooks WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- webhooks_logs → via webhook_id → webhooks_config.empresa_id
DROP POLICY IF EXISTS "Auth manage webhooks_logs" ON public.webhooks_logs;
DROP POLICY IF EXISTS "tenant_webhooks_logs" ON public.webhooks_logs;
CREATE POLICY "tenant_webhooks_logs" ON public.webhooks_logs FOR ALL TO authenticated
  USING (webhook_id IN (SELECT id FROM public.webhooks_config WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (webhook_id IN (SELECT id FROM public.webhooks_config WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- =====================================================
-- BATCH 3b: Global/system tables - keep authenticated but no tenant filter
-- These have no empresa_id chain, they are system-wide config/reference
-- =====================================================

-- integracoes (system-level, no empresa_id)
DROP POLICY IF EXISTS "Auth users manage integracoes" ON public.integracoes;
DROP POLICY IF EXISTS "auth_integracoes" ON public.integracoes;
CREATE POLICY "auth_integracoes" ON public.integracoes FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- periodos_ponto (system-level periods)
DROP POLICY IF EXISTS "Authenticated users can manage periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "auth_periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "auth_periodos_ponto" ON public.periodos_ponto FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- rubricas_folha (global payroll config, has 2 policies)
DROP POLICY IF EXISTS "Authenticated users can manage rubricas" ON public.rubricas_folha;
DROP POLICY IF EXISTS "Authenticated users can view rubricas" ON public.rubricas_folha;
DROP POLICY IF EXISTS "auth_rubricas_folha" ON public.rubricas_folha;
CREATE POLICY "auth_rubricas_folha" ON public.rubricas_folha FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- sindicatos (reference data, no empresa_id)
DROP POLICY IF EXISTS "Auth users manage sindicatos" ON public.sindicatos;
DROP POLICY IF EXISTS "auth_sindicatos" ON public.sindicatos;
CREATE POLICY "auth_sindicatos" ON public.sindicatos FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- logs_integracoes (system logs via integracao_id)
DROP POLICY IF EXISTS "Auth users read logs_integracoes" ON public.logs_integracoes;
DROP POLICY IF EXISTS "auth_logs_integracoes" ON public.logs_integracoes;
CREATE POLICY "auth_logs_integracoes" ON public.logs_integracoes FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- webauthn_challenges (auth system table)
DROP POLICY IF EXISTS "Allow all operations on challenges" ON public.webauthn_challenges;
DROP POLICY IF EXISTS "auth_webauthn_challenges" ON public.webauthn_challenges;
CREATE POLICY "auth_webauthn_challenges" ON public.webauthn_challenges FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
