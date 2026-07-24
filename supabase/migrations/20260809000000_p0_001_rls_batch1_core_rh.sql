-- ============================================================================
-- P0-001 (part 1): Remove USING (true) - batch 1/5 (tabelas core de RH)
-- ----------------------------------------------------------------------------
-- Substitui políticas permissivas USING (true) por isolamento multi-tenant.
-- Batch 1: colaboradores, ferias, pontos, folhas, holerites, folhas_pagamento,
--          lancamentos_folha, eventos_variaveis, rubricas_folha
-- ============================================================================

-- colaboradores
DROP POLICY IF EXISTS "Allow all" ON public.colaboradores;
CREATE POLICY "colaboradores_tenant_select" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id());
CREATE POLICY "colaboradores_tenant_insert" ON public.colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = public.get_auth_empresa_id()
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'))
  );
CREATE POLICY "colaboradores_tenant_update" ON public.colaboradores
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());
CREATE POLICY "colaboradores_tenant_delete" ON public.colaboradores
  FOR DELETE TO authenticated
  USING (
    empresa_id = public.get_auth_empresa_id()
    AND public.is_admin(auth.uid())
  );

-- ferias
DROP POLICY IF EXISTS "Allow all" ON public.ferias;
CREATE POLICY "ferias_tenant_all" ON public.ferias
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- pontos (legado)
DROP POLICY IF EXISTS "Allow all" ON public.pontos;
CREATE POLICY "pontos_tenant_all" ON public.pontos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- folhas (legado)
DROP POLICY IF EXISTS "Allow all" ON public.folhas;
CREATE POLICY "folhas_tenant_all" ON public.folhas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = folhas.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = folhas.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- folhas_pagamento
DROP POLICY IF EXISTS "Authenticated users can manage folhas" ON public.folhas_pagamento;
CREATE POLICY "folhas_pagamento_tenant_all" ON public.folhas_pagamento
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- holerites
DROP POLICY IF EXISTS "Authenticated users can manage holerites" ON public.holerites;
CREATE POLICY "holerites_tenant_all" ON public.holerites
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- lancamentos_folha
DROP POLICY IF EXISTS "Authenticated users can manage lancamentos" ON public.lancamentos_folha;
CREATE POLICY "lancamentos_folha_tenant_all" ON public.lancamentos_folha
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.folhas_pagamento f
      WHERE f.id = lancamentos_folha.folha_id
        AND f.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.folhas_pagamento f
      WHERE f.id = lancamentos_folha.folha_id
        AND f.empresa_id = public.get_auth_empresa_id()
    )
  );

-- eventos_variaveis
DROP POLICY IF EXISTS "Authenticated users can manage eventos_variaveis" ON public.eventos_variaveis;
CREATE POLICY "eventos_variaveis_tenant_all" ON public.eventos_variaveis
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- rubricas_folha
DROP POLICY IF EXISTS "Authenticated users can view rubricas" ON public.rubricas_folha;
DROP POLICY IF EXISTS "Authenticated users can manage rubricas" ON public.rubricas_folha;
CREATE POLICY "rubricas_folha_tenant_select" ON public.rubricas_folha
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_auth_empresa_id()
    OR empresa_id IS NULL  -- rubricas globais (somente leitura)
  );
CREATE POLICY "rubricas_folha_tenant_write" ON public.rubricas_folha
  FOR ALL TO authenticated
  USING (
    empresa_id = public.get_auth_empresa_id()
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'))
  )
  WITH CHECK (
    empresa_id = public.get_auth_empresa_id()
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'))
  );

COMMENT ON TABLE public.colaboradores IS
  '[P0-001] RLS tenant-scoped via get_auth_empresa_id().';
COMMENT ON TABLE public.holerites IS
  '[P0-001] RLS tenant-scoped. Acesso direto só authenticated da empresa.';
COMMENT ON TABLE public.rubricas_folha IS
  '[P0-001] RLS: rubricas globais (empresa_id IS NULL) só leitura; tenant-scoped só admin/RH.';
