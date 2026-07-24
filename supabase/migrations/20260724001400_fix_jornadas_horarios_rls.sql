-- Issue 42: Substitui políticas RLS abertas (USING true) em jornadas_horarios.
--
-- 20260317002431_* criou jornadas_horarios com:
--   "jh_sel" FOR SELECT USING (true)
--   "jh_mod" FOR ALL USING (true)
-- Qualquer usuário autenticado (e potencialmente anônimo) pode ler e escrever
-- os horários de jornada de qualquer empresa.
--
-- jornadas_horarios não tem empresa_id direto mas tem jornada_id FK → jornadas,
-- que tem empresa_id. Usar subquery para isolamento.

ALTER TABLE public.jornadas_horarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jh_sel" ON public.jornadas_horarios;
DROP POLICY IF EXISTS "jh_mod" ON public.jornadas_horarios;
-- Nomes variantes possíveis de migrations anteriores
DROP POLICY IF EXISTS "jornadas_horarios_select" ON public.jornadas_horarios;
DROP POLICY IF EXISTS "jornadas_horarios_all" ON public.jornadas_horarios;

CREATE POLICY "jornadas_horarios_tenant"
  ON public.jornadas_horarios
  FOR ALL
  TO authenticated
  USING (
    jornada_id IN (
      SELECT id FROM public.jornadas
      WHERE empresa_id = public.get_auth_empresa_id()
    )
  )
  WITH CHECK (
    jornada_id IN (
      SELECT id FROM public.jornadas
      WHERE empresa_id = public.get_auth_empresa_id()
    )
  );
