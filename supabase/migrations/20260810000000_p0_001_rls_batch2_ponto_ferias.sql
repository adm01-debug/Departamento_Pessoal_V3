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
DROP POLICY IF EXISTS "registros_ponto_tenant_all" ON public.registros_ponto;
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
DROP POLICY IF EXISTS "banco_horas_tenant_all" ON public.banco_horas;
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
DROP POLICY IF EXISTS "ajustes_ponto_tenant_all" ON public.ajustes_ponto;
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
DROP POLICY IF EXISTS "periodos_ponto_tenant_all" ON public.periodos_ponto;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='periodos_ponto' AND column_name='colaborador_id') THEN
    EXECUTE $pol$
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
        )
    $pol$;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='periodos_ponto' AND column_name='empresa_id') THEN
    EXECUTE $pol$
      CREATE POLICY "periodos_ponto_tenant_all" ON public.periodos_ponto
        FOR ALL TO authenticated
        USING (empresa_id = public.get_auth_empresa_id())
        WITH CHECK (empresa_id = public.get_auth_empresa_id())
    $pol$;
  ELSE
    RAISE NOTICE 'periodos_ponto_tenant_all pulada: tabela sem colaborador_id/empresa_id (schema legado sem tenant)';
  END IF;
END $$;

-- periodos_aquisitivos
DROP POLICY IF EXISTS "Authenticated users can manage periodos_aquisitivos" ON public.periodos_aquisitivos;
DROP POLICY IF EXISTS "periodos_aquisitivos_tenant_all" ON public.periodos_aquisitivos;
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
DROP POLICY IF EXISTS "historico_ferias_tenant_all" ON public.historico_ferias;
CREATE POLICY "historico_ferias_tenant_all" ON public.historico_ferias
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ferias f
      JOIN public.colaboradores c ON c.id = f.colaborador_id
      WHERE f.id = historico_ferias.ferias_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ferias f
      JOIN public.colaboradores c ON c.id = f.colaborador_id
      WHERE f.id = historico_ferias.ferias_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- afastamentos
DROP POLICY IF EXISTS "Authenticated users can manage afastamentos" ON public.afastamentos;
DROP POLICY IF EXISTS "afastamentos_tenant_all" ON public.afastamentos;
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
DROP POLICY IF EXISTS "prorrogacoes_afastamento_tenant_all" ON public.prorrogacoes_afastamento;
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
DROP POLICY IF EXISTS "documentos_afastamento_tenant_all" ON public.documentos_afastamento;
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
DROP POLICY IF EXISTS "config_afastamentos_tenant_select" ON public.config_afastamentos;
CREATE POLICY "config_afastamentos_tenant_select" ON public.config_afastamentos
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id());

COMMENT ON TABLE public.registros_ponto IS
  '[P0-001] RLS tenant-scoped via JOIN colaboradores.';
COMMENT ON TABLE public.afastamentos IS
  '[P0-001] RLS tenant-scoped via JOIN colaboradores.';
