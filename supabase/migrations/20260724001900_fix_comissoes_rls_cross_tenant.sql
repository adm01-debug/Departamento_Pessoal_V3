-- Issue 47: Substitui políticas RLS cross-tenant em comissoes.
--
-- O stub 2025122813134009_create_comissoes.sql criou:
--   comissoes_select  FOR SELECT USING (auth.uid() IS NOT NULL)
--   comissoes_insert  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)
--   comissoes_update  FOR UPDATE USING (auth.uid() IS NOT NULL)
--   comissoes_delete  FOR DELETE USING (auth.uid() IS NOT NULL)
--
-- Nenhuma migration posterior de 2026 cobriu comissoes:
--   - 20260527130231 trata ['colaboradores','ferias','folhas_pagamento',
--     'registros_ponto','dependentes','jornadas','escalas','turnos']
--   - 20260719100000 e 20260719240000 não incluem comissoes
--   - 20260724000900 trata ['atrasos','adicionais','gratificacoes']
--
-- comissoes tem empresa_id direto → usar get_auth_empresa_id() diretamente.

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comissoes_select"           ON public.comissoes;
DROP POLICY IF EXISTS "comissoes_insert"           ON public.comissoes;
DROP POLICY IF EXISTS "comissoes_update"           ON public.comissoes;
DROP POLICY IF EXISTS "comissoes_delete"           ON public.comissoes;
DROP POLICY IF EXISTS "empresa_isolation_comissoes" ON public.comissoes;
DROP POLICY IF EXISTS "comissoes_tenant"           ON public.comissoes;

CREATE POLICY "comissoes_tenant"
  ON public.comissoes
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());
