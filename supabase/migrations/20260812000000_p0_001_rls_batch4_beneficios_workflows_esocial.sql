-- ============================================================================
-- P0-001 (part 4): Remove USING (true) - batch 4/5 (Beneficios, Workflows, eSocial)
-- ----------------------------------------------------------------------------
-- Tabelas: beneficios, workflow_definicoes, workflow_execucoes, esocial_eventos,
--          esocial_lotes, guias_impostos, documentos, notificacoes
-- ============================================================================

-- beneficios
DROP POLICY IF EXISTS "Authenticated users can manage beneficios" ON public.beneficios;
CREATE POLICY "beneficios_tenant_all" ON public.beneficios
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = beneficios.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = beneficios.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- workflows_definicoes
DROP POLICY IF EXISTS "Authenticated users can manage workflows" ON public.workflows_definicoes;
CREATE POLICY "workflows_definicoes_tenant_all" ON public.workflows_definicoes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- workflows_execucoes
DROP POLICY IF EXISTS "Authenticated users can manage workflow_execucoes" ON public.workflows_execucoes;
CREATE POLICY "workflows_execucoes_tenant_all" ON public.workflows_execucoes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows_definicoes w
      WHERE w.id = workflows_execucoes.workflow_id
        AND w.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflows_definicoes w
      WHERE w.id = workflows_execucoes.workflow_id
        AND w.empresa_id = public.get_auth_empresa_id()
    )
  );

-- esocial_eventos
DROP POLICY IF EXISTS "Authenticated users can manage esocial_eventos" ON public.esocial_eventos;
CREATE POLICY "esocial_eventos_tenant_all" ON public.esocial_eventos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- esocial_lotes
DROP POLICY IF EXISTS "Authenticated users can manage esocial_lotes" ON public.esocial_lotes;
CREATE POLICY "esocial_lotes_tenant_all" ON public.esocial_lotes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- guias_impostos
DROP POLICY IF EXISTS "Authenticated users can manage guias_impostos" ON public.guias_impostos;
CREATE POLICY "guias_impostos_tenant_all" ON public.guias_impostos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- documentos
DROP POLICY IF EXISTS "Authenticated users can manage documentos" ON public.documentos;
CREATE POLICY "documentos_tenant_all" ON public.documentos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = documentos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = documentos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- notificacoes (reforço — já existe policy em 006_rls_policies.sql)
DROP POLICY IF EXISTS "Authenticated users can manage notificacoes" ON public.notificacoes;
-- Mantida policy notif_select/insert/update criadas em 006_rls_policies.sql

COMMENT ON TABLE public.beneficios IS
  '[P0-001] RLS tenant-scoped via JOIN colaboradores.';
COMMENT ON TABLE public.workflows_execucoes IS
  '[P0-001] RLS tenant-scoped via JOIN workflows_definicoes.';
COMMENT ON TABLE public.esocial_eventos IS
  '[P0-001] RLS tenant-scoped. Eventos eSocial sensíveis (LGPD).';
