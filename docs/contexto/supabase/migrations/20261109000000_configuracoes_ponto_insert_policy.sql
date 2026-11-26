-- Adiciona política INSERT em configuracoes_ponto
-- Sem ela qualquer INSERT (inclusive o fixture E2E W59/W60) retorna:
--   "new row violates row-level security policy for table configuracoes_ponto"
CREATE POLICY "Admins podem inserir configurações de ponto"
  ON public.configuracoes_ponto
  FOR INSERT
  TO public
  WITH CHECK (pertence_a_empresa(empresa_id));
