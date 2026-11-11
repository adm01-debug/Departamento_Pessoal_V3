-- Adiciona política INSERT em configuracoes_ponto
-- Sem ela qualquer INSERT (inclusive o fixture E2E W59/W60) retorna:
--   "new row violates row-level security policy for table configuracoes_ponto"
-- Só admin/rh DA PRÓPRIA empresa (padrão do repo: empresa AND papel).
-- Substitui a 20261107203000 (nunca aplicada): ela usava rls_tenant_or_admin,
-- que faz OR com is_admin() global e daria a admin de qualquer empresa
-- SELECT/INSERT/UPDATE/DELETE na configuração das outras.
DROP POLICY IF EXISTS "configuracoes_ponto_tenant_manage" ON public.configuracoes_ponto;
CREATE POLICY "Admins podem inserir configurações de ponto"
  ON public.configuracoes_ponto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.pertence_a_empresa(empresa_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  );
