DROP POLICY IF EXISTS "Usuarios autenticados podem inserir rescisoes" ON public.historico_rescisoes;
DROP POLICY IF EXISTS "Usuarios inserem proprias rescisoes" ON public.historico_rescisoes;
CREATE POLICY "Usuarios inserem proprias rescisoes"
  ON public.historico_rescisoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);