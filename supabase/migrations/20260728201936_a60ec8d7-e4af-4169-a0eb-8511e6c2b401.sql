-- ============================================================
-- Correção de predicados de tenant inoperantes
-- (empresa_id IN (SELECT empresas.id FROM empresas)) => get_user_empresas
-- ============================================================

DROP POLICY IF EXISTS "Gestores podem gerenciar adiantamentos da empresa" ON public.adiantamentos_salariais;
CREATE POLICY "Adiantamentos por empresa" ON public.adiantamentos_salariais
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Arquivos acessíveis por empresa" ON public.beneficio_arquivos;
CREATE POLICY "Beneficio arquivos por empresa" ON public.beneficio_arquivos
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Movimentações acessíveis por empresa" ON public.beneficio_movimentacoes;
CREATE POLICY "Beneficio movimentacoes por empresa" ON public.beneficio_movimentacoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.colaboradores c
                 WHERE c.id = beneficio_movimentacoes.colaborador_id
                   AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.colaboradores c
                 WHERE c.id = beneficio_movimentacoes.colaborador_id
                   AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

DROP POLICY IF EXISTS "Regras acessíveis por empresa" ON public.beneficio_regras_elegibilidade;
CREATE POLICY "Beneficio regras por empresa" ON public.beneficio_regras_elegibilidade
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Faixas acessíveis por empresa" ON public.cargo_faixas_salariais;
CREATE POLICY "Faixas salariais por empresa" ON public.cargo_faixas_salariais
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cargos g
                 WHERE g.id = cargo_faixas_salariais.cargo_id
                   AND g.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cargos g
                 WHERE g.id = cargo_faixas_salariais.cargo_id
                   AND g.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

DROP POLICY IF EXISTS "Empresas can view their own CNAB remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Empresas can insert their own CNAB remessas" ON public.cnab_remessas;
CREATE POLICY "CNAB remessas leitura por empresa" ON public.cnab_remessas
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "CNAB remessas insercao por empresa" ON public.cnab_remessas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Competências acessíveis por empresa" ON public.competencias_config;
CREATE POLICY "Competencias config por empresa" ON public.competencias_config
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Configurações de ponto visíveis por membros da empresa" ON public.configuracoes_ponto;
DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de ponto" ON public.configuracoes_ponto;
CREATE POLICY "Config ponto leitura por empresa" ON public.configuracoes_ponto
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "Config ponto atualizacao por admin da empresa" ON public.configuracoes_ponto
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) AND public.is_admin(auth.uid()))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "View logs by company" ON public.conformidade_ponto_logs;
CREATE POLICY "Conformidade ponto logs por empresa" ON public.conformidade_ponto_logs
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Templates acessíveis por empresa" ON public.documento_templates;
CREATE POLICY "Documento templates por empresa" ON public.documento_templates
  FOR ALL TO authenticated
  USING (empresa_id IS NULL OR empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Assinaturas acessíveis por empresa" ON public.documentos_assinatura;
CREATE POLICY "Documentos assinatura por empresa" ON public.documentos_assinatura
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Gestores podem gerenciar empréstimos da empresa" ON public.emprestimos_consignados;
CREATE POLICY "Emprestimos por empresa" ON public.emprestimos_consignados
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Empresas can manage their own epis" ON public.epis;
CREATE POLICY "EPIs por empresa" ON public.epis
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "View ferias audit by company" ON public.ferias_audit_log;
CREATE POLICY "Ferias audit log por empresa" ON public.ferias_audit_log
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Empresas can view their own lancamentos" ON public.lancamentos_contabeis;
CREATE POLICY "Lancamentos contabeis por empresa" ON public.lancamentos_contabeis
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Metas acessíveis por empresa" ON public.metas_okrs;
CREATE POLICY "Metas OKR por empresa" ON public.metas_okrs
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "PDIs acessíveis por empresa" ON public.pdi_plano_desenvolvimento;
CREATE POLICY "PDI por empresa" ON public.pdi_plano_desenvolvimento
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Empresas can view their own PIX lotes" ON public.pix_lotes;
DROP POLICY IF EXISTS "Empresas can insert their own PIX lotes" ON public.pix_lotes;
CREATE POLICY "PIX lotes leitura por empresa" ON public.pix_lotes
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "PIX lotes insercao por empresa" ON public.pix_lotes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Empresas can view their own plano de contas" ON public.plano_contas;
CREATE POLICY "Plano de contas por empresa" ON public.plano_contas
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Gestores veem solicitações da empresa" ON public.solicitacoes_ajuste_ponto;
DROP POLICY IF EXISTS "Gestores e RH aprovam solicitações" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Solicitacoes ajuste leitura por empresa" ON public.solicitacoes_ajuste_ponto
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "Solicitacoes ajuste aprovacao por empresa" ON public.solicitacoes_ajuste_ponto
  FOR UPDATE TO authenticated
  USING (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'rh'::app_role)
      OR public.has_role(auth.uid(),'gestor'::app_role))
  )
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Trilhas acessíveis por empresa" ON public.trilhas_aprendizado;
CREATE POLICY "Trilhas por empresa" ON public.trilhas_aprendizado
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));