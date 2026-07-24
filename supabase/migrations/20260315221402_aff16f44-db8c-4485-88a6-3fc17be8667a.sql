
-- Fix training tables: replace permissive USING(true) with proper tenant isolation

-- catalogo_cursos
DROP POLICY IF EXISTS "auth_catalogo_cursos_all" ON public.catalogo_cursos;
DROP POLICY IF EXISTS "catalogo_cursos_select" ON public.catalogo_cursos;
CREATE POLICY "catalogo_cursos_select" ON public.catalogo_cursos FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "catalogo_cursos_insert" ON public.catalogo_cursos;
CREATE POLICY "catalogo_cursos_insert" ON public.catalogo_cursos FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "catalogo_cursos_update" ON public.catalogo_cursos;
CREATE POLICY "catalogo_cursos_update" ON public.catalogo_cursos FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "catalogo_cursos_delete" ON public.catalogo_cursos;
CREATE POLICY "catalogo_cursos_delete" ON public.catalogo_cursos FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- trilhas_aprendizado
DROP POLICY IF EXISTS "auth_trilhas_all" ON public.trilhas_aprendizado;
DROP POLICY IF EXISTS "trilhas_select" ON public.trilhas_aprendizado;
CREATE POLICY "trilhas_select" ON public.trilhas_aprendizado FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "trilhas_insert" ON public.trilhas_aprendizado;
CREATE POLICY "trilhas_insert" ON public.trilhas_aprendizado FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "trilhas_update" ON public.trilhas_aprendizado;
CREATE POLICY "trilhas_update" ON public.trilhas_aprendizado FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "trilhas_delete" ON public.trilhas_aprendizado;
CREATE POLICY "trilhas_delete" ON public.trilhas_aprendizado FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- inscricoes_cursos
DROP POLICY IF EXISTS "auth_inscricoes_all" ON public.inscricoes_cursos;
DROP POLICY IF EXISTS "inscricoes_select" ON public.inscricoes_cursos;
CREATE POLICY "inscricoes_select" ON public.inscricoes_cursos FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "inscricoes_insert" ON public.inscricoes_cursos;
CREATE POLICY "inscricoes_insert" ON public.inscricoes_cursos FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "inscricoes_update" ON public.inscricoes_cursos;
CREATE POLICY "inscricoes_update" ON public.inscricoes_cursos FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "inscricoes_delete" ON public.inscricoes_cursos;
CREATE POLICY "inscricoes_delete" ON public.inscricoes_cursos FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- trilhas_cursos (no empresa_id, link table — restrict to authenticated only)
DROP POLICY IF EXISTS "auth_trilhas_cursos_all" ON public.trilhas_cursos;
DROP POLICY IF EXISTS "trilhas_cursos_select" ON public.trilhas_cursos;
CREATE POLICY "trilhas_cursos_select" ON public.trilhas_cursos FOR SELECT TO authenticated USING (
  trilha_id IN (SELECT id FROM public.trilhas_aprendizado WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
);
DROP POLICY IF EXISTS "trilhas_cursos_insert" ON public.trilhas_cursos;
CREATE POLICY "trilhas_cursos_insert" ON public.trilhas_cursos FOR INSERT TO authenticated WITH CHECK (
  trilha_id IN (SELECT id FROM public.trilhas_aprendizado WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
);
DROP POLICY IF EXISTS "trilhas_cursos_delete" ON public.trilhas_cursos;
CREATE POLICY "trilhas_cursos_delete" ON public.trilhas_cursos FOR DELETE TO authenticated USING (
  trilha_id IN (SELECT id FROM public.trilhas_aprendizado WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
);
