-- ============================================================================
-- P0-001 (part 2): Remove USING (true) - batch 2/5 (Ponto e Banco de Horas)
-- ----------------------------------------------------------------------------
-- Tabelas: registros_ponto, banco_horas, ajustes_ponto, periodos_ponto,
--          periodos_aquisitivos, ferias (Authenticated users can manage),
--          historico_ferias, afastamentos, prorrogacoes_afastamento,
--          documentos_afastamento, config_afastamentos
-- ============================================================================

-- registros_ponto
DROP POLICY IF EXISTS "Authenticated users can manage registros_ponto" ON public.registros_ponto;
CREATE POLICY "registros_ponto_tenant_all" ON public.registros_ponto
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = registros_ponto.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = registros_ponto.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- banco_horas
DROP POLICY IF EXISTS "Authenticated users can manage banco_horas" ON public.banco_horas;
CREATE POLICY "banco_horas_tenant_all" ON public.banco_horas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = banco_horas.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = banco_horas.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- ajustes_ponto
DROP POLICY IF EXISTS "Authenticated users can manage ajustes_ponto" ON public.ajustes_ponto;
CREATE POLICY "ajustes_ponto_tenant_all" ON public.ajustes_ponto
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = ajustes_ponto.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = ajustes_ponto.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- periodos_ponto
DROP POLICY IF EXISTS "Authenticated users can manage periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "periodos_ponto_tenant_all" ON public.periodos_ponto
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = periodos_ponto.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = periodos_ponto.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- periodos_aquisitivos
DROP POLICY IF EXISTS "Authenticated users can manage periodos_aquisitivos" ON public.periodos_aquisitivos;
CREATE POLICY "periodos_aquisitivos_tenant_all" ON public.periodos_aquisitivos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = periodos_aquisitivos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = periodos_aquisitivos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- ferias (policy alternativa)
DROP POLICY IF EXISTS "Authenticated users can manage ferias" ON public.ferias;
DROP POLICY IF EXISTS "Authenticated users can manage historico_ferias" ON public.historico_ferias;
CREATE POLICY "historico_ferias_tenant_all" ON public.historico_ferias
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = historico_ferias.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = historico_ferias.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- afastamentos
DROP POLICY IF EXISTS "Authenticated users can manage afastamentos" ON public.afastamentos;
CREATE POLICY "afastamentos_tenant_all" ON public.afastamentos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = afastamentos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = afastamentos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- prorrogacoes_afastamento
DROP POLICY IF EXISTS "Authenticated users can manage prorrogacoes" ON public.prorrogacoes_afastamento;
CREATE POLICY "prorrogacoes_afastamento_tenant_all" ON public.prorrogacoes_afastamento
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.afastamentos a
      JOIN public.colaboradores c ON c.id = a.colaborador_id
      WHERE a.id = prorrogacoes_afastamento.afastamento_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.afastamentos a
      JOIN public.colaboradores c ON c.id = a.colaborador_id
      WHERE a.id = prorrogacoes_afastamento.afastamento_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- documentos_afastamento
DROP POLICY IF EXISTS "Authenticated users can manage docs_afastamento" ON public.documentos_afastamento;
CREATE POLICY "documentos_afastamento_tenant_all" ON public.documentos_afastamento
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.afastamentos a
      JOIN public.colaboradores c ON c.id = a.colaborador_id
      WHERE a.id = documentos_afastamento.afastamento_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.afastamentos a
      JOIN public.colaboradores c ON c.id = a.colaborador_id
      WHERE a.id = documentos_afastamento.afastamento_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- config_afastamentos
DROP POLICY IF EXISTS "Authenticated users can view config_afastamentos" ON public.config_afastamentos;
CREATE POLICY "config_afastamentos_tenant_select" ON public.config_afastamentos
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id());

COMMENT ON TABLE public.registros_ponto IS
  '[P0-001] RLS tenant-scoped via JOIN colaboradores.';
COMMENT ON TABLE public.afastamentos IS
  '[P0-001] RLS tenant-scoped via JOIN colaboradores.';
