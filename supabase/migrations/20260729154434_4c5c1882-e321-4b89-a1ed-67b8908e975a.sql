-- ============================================================================
-- Vazamento cross-tenant por política permissiva legada
--
-- Políticas permissivas se combinam por OU. Em rubricas_folha já existia a
-- política correta (`rubricas_read`: catálogo global OU pertence à empresa),
-- mas a legada `USING (true)` permanecia ativa e anulava toda a proteção:
-- basta uma política liberar para o acesso ser concedido.
--
-- anon não é afetado: as demais políticas dependem de auth.uid(), que é nulo
-- para anônimo, então ele já não enxergava linha alguma.
-- ============================================================================

-- 1. rubricas_folha — remove a leitura irrestrita.
DROP POLICY IF EXISTS "Authenticated can read rubricas_folha" ON public.rubricas_folha;

-- 2. rubricas_folha — redundante com `rubricas_read`, que é mais completa
--    (cobre também o catálogo global com empresa_id IS NULL).
DROP POLICY IF EXISTS "Empresas podem ver suas rubricas" ON public.rubricas_folha;

-- 3. rubricas_folha — era FOR ALL: dava a QUALQUER integrante da empresa
--    (estagiário incluso) poder de criar, alterar e apagar rubricas de folha.
--    `rubricas_admin_manage` já cobre o caso exigindo RH/admin.
DROP POLICY IF EXISTS "Empresa vê suas próprias rubricas" ON public.rubricas_folha;

-- 4. parametros_sistema — única política era USING (true) e a tabela é
--    multi-tenant (possui empresa_id). Escrita segue sem política alguma,
--    portanto bloqueada para authenticated (só service_role atravessa).
DROP POLICY IF EXISTS "Users can view system parameters" ON public.parametros_sistema;

CREATE POLICY "parametros_sistema_read"
  ON public.parametros_sistema
  FOR SELECT
  TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));