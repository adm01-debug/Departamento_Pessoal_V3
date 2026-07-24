-- ============================================================================
-- P0-001 (part 3): Remove USING (true) - batch 3/5 (Estrutura, Treinamentos, Auditoria)
-- ----------------------------------------------------------------------------
-- Tabelas: departamentos, cargos, vinculos, treinamentos, auditoria (read),
--          ferias_audit_log, feriados, admissoes, candidaturas
-- ============================================================================

-- departamentos
DROP POLICY IF EXISTS "Auth users manage departamentos" ON public.departamentos;
CREATE POLICY "departamentos_tenant_all" ON public.departamentos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- cargos
DROP POLICY IF EXISTS "Auth users manage cargos" ON public.cargos;
CREATE POLICY "cargos_tenant_all" ON public.cargos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- vinculos
DROP POLICY IF EXISTS "Auth users manage vinculos" ON public.vinculos;
CREATE POLICY "vinculos_tenant_all" ON public.vinculos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = vinculos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = vinculos.colaborador_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- treinamentos
DROP POLICY IF EXISTS "Auth users manage treinamentos" ON public.treinamentos;
CREATE POLICY "treinamentos_tenant_all" ON public.treinamentos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- auditoria (read) — agora também via RPC de insert
DROP POLICY IF EXISTS "Authenticated users can read auditoria" ON public.auditoria;
-- (mantida a policy admin_select_logs criada em P0-005)

-- ferias_audit_log
DROP POLICY IF EXISTS "Authenticated users can view ferias_audit" ON public.ferias_audit_log;
CREATE POLICY "ferias_audit_log_tenant_select" ON public.ferias_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ferias f
      JOIN public.colaboradores c ON c.id = f.colaborador_id
      WHERE f.id = ferias_audit_log.ferias_id
        AND c.empresa_id = public.get_auth_empresa_id()
    )
  );

-- feriados
DROP POLICY IF EXISTS "Authenticated users can view feriados" ON public.feriados;
DROP POLICY IF EXISTS "Authenticated users can manage feriados" ON public.feriados;
CREATE POLICY "feriados_tenant_select" ON public.feriados
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id() OR empresa_id IS NULL);
CREATE POLICY "feriados_tenant_write" ON public.feriados
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- admissoes
DROP POLICY IF EXISTS "Authenticated users can manage admissoes" ON public.admissoes;
CREATE POLICY "admissoes_tenant_all" ON public.admissoes
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- candidaturas
DROP POLICY IF EXISTS "Authenticated users can manage candidaturas" ON public.candidaturas;
CREATE POLICY "candidaturas_tenant_all" ON public.candidaturas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = candidaturas.vaga_id
        AND v.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vagas v
      WHERE v.id = candidaturas.vaga_id
        AND v.empresa_id = public.get_auth_empresa_id()
    )
  );

COMMENT ON TABLE public.departamentos IS
  '[P0-001] RLS tenant-scoped. Departamento só visível dentro da empresa.';
COMMENT ON TABLE public.feriados IS
  '[P0-001] Feriados globais (empresa_id IS NULL) visíveis a todos; tenant-scoped editável.';
