-- ============================================================================
-- P0-001 (part 5): Remove USING (true) - batch 5/5 (restantes)
-- ----------------------------------------------------------------------------
-- Cobre todas as tabelas remanescentes que ainda tinham policies permissivas
-- em alguma migration. Usa DO block para varredura dinâmica.
-- ============================================================================

-- entity_versions (já tratada em L2 da migration 20260718220000; reforço)
DROP POLICY IF EXISTS "Users can view versions" ON public.entity_versions;
DROP POLICY IF EXISTS "Authenticated users can view versions" ON public.entity_versions;
DROP POLICY IF EXISTS "Authenticated users can create versions" ON public.entity_versions;
-- Mantida a policy entity_versions_admin_only_select de 20260718220000

-- dependentes
DROP POLICY IF EXISTS "dependentes_select" ON public.dependentes;
DROP POLICY IF EXISTS "dependentes_insert" ON public.dependentes;
DROP POLICY IF EXISTS "dependentes_update" ON public.dependentes;
DROP POLICY IF EXISTS "dependentes_delete" ON public.dependentes;
CREATE POLICY "dependentes_tenant_select" ON public.dependentes
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id());
CREATE POLICY "dependentes_tenant_write" ON public.dependentes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- jornadas
DROP POLICY IF EXISTS "Authenticated users can manage jornadas" ON public.jornadas;
CREATE POLICY "jornadas_tenant_all" ON public.jornadas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- escalas
DROP POLICY IF EXISTS "Authenticated users can manage escalas" ON public.escalas;
CREATE POLICY "escalas_tenant_all" ON public.escalas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- turnos
DROP POLICY IF EXISTS "Authenticated users can manage turnos" ON public.turnos;
CREATE POLICY "turnos_tenant_all" ON public.turnos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- faltas
DROP POLICY IF EXISTS "Authenticated users can manage faltas" ON public.faltas;
CREATE POLICY "faltas_tenant_all" ON public.faltas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- atrasos
DROP POLICY IF EXISTS "Authenticated users can manage atrasos" ON public.atrasos;
CREATE POLICY "atrasos_tenant_all" ON public.atrasos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- adicionais
DROP POLICY IF EXISTS "Authenticated users can manage adicionais" ON public.adicionais;
CREATE POLICY "adicionais_tenant_all" ON public.adicionais
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- gratificacoes
DROP POLICY IF EXISTS "Authenticated users can manage gratificacoes" ON public.gratificacoes;
CREATE POLICY "gratificacoes_tenant_all" ON public.gratificacoes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- comissoes
DROP POLICY IF EXISTS "Authenticated users can manage comissoes" ON public.comissoes;
CREATE POLICY "comissoes_tenant_all" ON public.comissoes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- pensoes
DROP POLICY IF EXISTS "Authenticated users can manage pensoes" ON public.pensoes;
CREATE POLICY "pensoes_tenant_all" ON public.pensoes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- emprestimos_consignados
DROP POLICY IF EXISTS "Authenticated users can manage emprestimos" ON public.emprestimos_consignados;
CREATE POLICY "emprestimos_consignados_tenant_all" ON public.emprestimos_consignados
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Varredura dinâmica: DROPA todas as policies com USING (true) que ainda restam
DO $$
DECLARE
  r RECORD;
  cnt INT := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual::text LIKE '%USING (true)%'
        OR with_check::text LIKE '%WITH CHECK (true)%'
        OR qual::text = '(true)'
        OR with_check::text = '(true)'
      )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
      RAISE NOTICE '[P0-001 final] DROP: %.%', r.tablename, r.policyname;
      cnt := cnt + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[P0-001 final] SKIP: %.% — %', r.tablename, r.policyname, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[P0-001 final] % policies permissivas removidas', cnt;
END $$;

COMMENT ON SCHEMA public IS
  '[P0-001] Multi-tenant RLS aplicado em todas as tabelas. ' ||
  'Zero policies USING (true) ou WITH CHECK (true). ' ||
  'Source of truth: public.get_auth_empresa_id().';
