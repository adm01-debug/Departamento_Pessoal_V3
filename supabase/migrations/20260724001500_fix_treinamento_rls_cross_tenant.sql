-- Issue 43: Substitui políticas RLS cross-tenant em treinamento_instancias e
-- treinamento_feedback.
--
-- 20260619150451_* criou em ambas as tabelas:
--   USING (auth.uid() IS NOT NULL)
-- Qualquer usuário autenticado de qualquer empresa lê e escreve dados de
-- treinamento de outras empresas.
--
-- treinamento_instancias não tem empresa_id direto; escopo via
--   curso_id → catalogo_cursos.empresa_id
-- treinamento_feedback não tem empresa_id direto; escopo via
--   inscricao_id → inscricoes_cursos.colaborador_id → colaboradores.empresa_id

-- ── treinamento_instancias ────────────────────────────────────────────────────
ALTER TABLE public.treinamento_instancias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instâncias acessíveis por empresa"    ON public.treinamento_instancias;
DROP POLICY IF EXISTS "Premiacoes pagamentos scoped"          ON public.treinamento_instancias;
DROP POLICY IF EXISTS "Treinamento instancias authenticated"  ON public.treinamento_instancias;

CREATE POLICY "treinamento_instancias_tenant"
  ON public.treinamento_instancias
  FOR ALL
  TO authenticated
  USING (
    curso_id IN (
      SELECT id FROM public.catalogo_cursos
      WHERE empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    curso_id IN (
      SELECT id FROM public.catalogo_cursos
      WHERE empresa_id = public.get_auth_empresa_id()
    )
  );

-- ── treinamento_feedback ──────────────────────────────────────────────────────
ALTER TABLE public.treinamento_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feedbacks acessíveis por inscrição"   ON public.treinamento_feedback;
DROP POLICY IF EXISTS "Treinamento feedback authenticated"    ON public.treinamento_feedback;

CREATE POLICY "treinamento_feedback_tenant"
  ON public.treinamento_feedback
  FOR ALL
  TO authenticated
  USING (
    inscricao_id IN (
      SELECT ic.id FROM public.inscricoes_cursos ic
      JOIN public.colaboradores c ON c.id = ic.colaborador_id
      WHERE c.empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    inscricao_id IN (
      SELECT ic.id FROM public.inscricoes_cursos ic
      JOIN public.colaboradores c ON c.id = ic.colaborador_id
      WHERE c.empresa_id = public.get_auth_empresa_id()
    )
  );
