-- ============================================================
-- ADIANTAMENTOS SALARIAIS
-- ============================================================
DROP POLICY IF EXISTS "Adiantamentos por empresa" ON public.adiantamentos_salariais;

CREATE POLICY "adiantamentos_rh_manage" ON public.adiantamentos_salariais
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "adiantamentos_self_read" ON public.adiantamentos_salariais
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- DESLIGAMENTOS (prova documental de rescisao)
-- ============================================================
DROP POLICY IF EXISTS "tenant_desligamentos_insert" ON public.desligamentos;
DROP POLICY IF EXISTS "tenant_desligamentos_update" ON public.desligamentos;
DROP POLICY IF EXISTS "tenant_desligamentos_delete" ON public.desligamentos;

CREATE POLICY "desligamentos_rh_insert" ON public.desligamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "desligamentos_rh_update" ON public.desligamentos
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "desligamentos_rh_delete" ON public.desligamentos
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

CREATE POLICY "desligamentos_gestor_read" ON public.desligamentos
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "desligamentos_self_read" ON public.desligamentos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- FERIAS (duas policies tenant-wide redundantes)
-- ============================================================
DROP POLICY IF EXISTS "ferias_tenant_all" ON public.ferias;
DROP POLICY IF EXISTS "tenant_ferias" ON public.ferias;

CREATE POLICY "ferias_rh_manage" ON public.ferias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "ferias_gestor_read" ON public.ferias
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "ferias_self_read" ON public.ferias
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));