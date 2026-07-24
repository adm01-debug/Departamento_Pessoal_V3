
-- Fix 1: Avaliação INSERT policies missing WITH CHECK (empresa_id isolation)
DROP POLICY IF EXISTS "ciclos_avaliacao_insert" ON public.ciclos_avaliacao;
CREATE POLICY "ciclos_avaliacao_insert" ON public.ciclos_avaliacao FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "metas_okrs_insert" ON public.metas_okrs;
CREATE POLICY "metas_okrs_insert" ON public.metas_okrs FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "feedbacks_360_insert" ON public.feedbacks_360;
CREATE POLICY "feedbacks_360_insert" ON public.feedbacks_360 FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "pdis_insert" ON public.pdis;
CREATE POLICY "pdis_insert" ON public.pdis FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "competencias_insert" ON public.competencias_matriz;
CREATE POLICY "competencias_insert" ON public.competencias_matriz FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- Fix 2: Legacy 'escalas' table has USING(true) - replace with tenant isolation
DROP POLICY IF EXISTS "Auth users manage escalas" ON public.escalas;
DROP POLICY IF EXISTS "escalas_select" ON public.escalas;
CREATE POLICY "escalas_select" ON public.escalas FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "escalas_insert" ON public.escalas;
CREATE POLICY "escalas_insert" ON public.escalas FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "escalas_update" ON public.escalas;
CREATE POLICY "escalas_update" ON public.escalas FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "escalas_delete" ON public.escalas;
CREATE POLICY "escalas_delete" ON public.escalas FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
