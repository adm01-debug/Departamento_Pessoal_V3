
-- 1. Remove overlapping log_envio_relatorios policy
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs" ON public.log_envio_relatorios;

-- 2. Fix historico_alertas SELECT - admin only
DROP POLICY IF EXISTS "Authenticated users can view historico_alertas" ON public.historico_alertas;
DROP POLICY IF EXISTS "Admins can view historico_alertas" ON public.historico_alertas;
CREATE POLICY "Admins can view historico_alertas" ON public.historico_alertas
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 3. Fix webauthn_challenges - remove NULL user access
DROP POLICY IF EXISTS "Users can manage own webauthn challenges" ON public.webauthn_challenges;
CREATE POLICY "Users can manage own webauthn challenges" ON public.webauthn_challenges
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
