-- ============================================================
-- ASOS (dado de saude — LGPD Art. 11)
-- ============================================================
DROP POLICY IF EXISTS "tenant_asos" ON public.asos;

CREATE POLICY "asos_rh_manage" ON public.asos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "asos_self_read" ON public.asos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- AFASTAMENTOS (dado de saude; gestor precisa enxergar a equipe)
-- ============================================================
DROP POLICY IF EXISTS "tenant_afastamentos" ON public.afastamentos;

CREATE POLICY "afastamentos_rh_manage" ON public.afastamentos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "afastamentos_gestor_read" ON public.afastamentos
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "afastamentos_self_read" ON public.afastamentos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- MEDIDAS DISCIPLINARES
-- ============================================================
DROP POLICY IF EXISTS "medidas_disciplinares_select" ON public.medidas_disciplinares;
DROP POLICY IF EXISTS "medidas_disciplinares_insert" ON public.medidas_disciplinares;
DROP POLICY IF EXISTS "medidas_disciplinares_update" ON public.medidas_disciplinares;
DROP POLICY IF EXISTS "medidas_disciplinares_delete" ON public.medidas_disciplinares;

CREATE POLICY "medidas_gestao_select" ON public.medidas_disciplinares
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "medidas_gestao_insert" ON public.medidas_disciplinares
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "medidas_gestao_update" ON public.medidas_disciplinares
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id))
  WITH CHECK (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "medidas_rh_delete" ON public.medidas_disciplinares
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

CREATE POLICY "medidas_self_read" ON public.medidas_disciplinares
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- CANAL DE ETICA (sigilo do denunciante)
-- ============================================================
DROP POLICY IF EXISTS "empresa_canal_etica" ON public.canal_etica;

CREATE POLICY "canal_etica_rh_only" ON public.canal_etica
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- ============================================================
-- LGPD SOLICITACOES
-- ============================================================
DROP POLICY IF EXISTS "empresa_lgpd_solicitacoes" ON public.lgpd_solicitacoes;

CREATE POLICY "lgpd_rh_manage" ON public.lgpd_solicitacoes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "lgpd_self_read" ON public.lgpd_solicitacoes
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- DEPENDENTES (duas policies redundantes, ambas tenant-wide)
-- ============================================================
DROP POLICY IF EXISTS "dependentes_tenant_all" ON public.dependentes;
DROP POLICY IF EXISTS "tenant_dependentes" ON public.dependentes;

CREATE POLICY "dependentes_rh_manage" ON public.dependentes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));

CREATE POLICY "dependentes_self_read" ON public.dependentes
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));