-- ============================================================================
-- P0-010: Policies de write em provisoes_folha e historico_calculos_folha
-- ----------------------------------------------------------------------------
-- Sem policies de INSERT/UPDATE/DELETE, o RLS habilitado bloqueia silenciosamente
-- as operações (PostgreSQL deny-by-default). Triggers e CRUDs legítimos quebram
-- em runtime.
-- ============================================================================

-- ---------- provisoes_folha ----------
DROP POLICY IF EXISTS "provisoes_folha_insert" ON public.provisoes_folha;
DROP POLICY IF EXISTS "provisoes_folha_update" ON public.provisoes_folha;
DROP POLICY IF EXISTS "provisoes_folha_delete" ON public.provisoes_folha;

-- INSERT: usado pelo trigger calcular_provisao_mensal (SECURITY DEFINER bypassa
-- RLS, mas adicionar policy explícita é defense-in-depth).
CREATE POLICY "provisoes_folha_insert" ON public.provisoes_folha
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id::uuid = (
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'empresa_id'
    )::uuid
  );

-- UPDATE: apenas admins/RH (imutabilidade para histórico fiscal)
CREATE POLICY "provisoes_folha_update" ON public.provisoes_folha
  FOR UPDATE TO authenticated
  USING (
    empresa_id::uuid = (
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'empresa_id'
    )::uuid
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'))
  )
  WITH CHECK (
    empresa_id::uuid = (
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'empresa_id'
    )::uuid
  );

-- DELETE: apenas admin (auditoria)
CREATE POLICY "provisoes_folha_delete" ON public.provisoes_folha
  FOR DELETE TO authenticated
  USING (
    empresa_id::uuid = (
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'empresa_id'
    )::uuid
    AND public.is_admin(auth.uid())
  );

-- ---------- historico_calculos_folha ----------
DROP POLICY IF EXISTS "historico_calculos_update" ON public.historico_calculos_folha;
DROP POLICY IF EXISTS "historico_calculos_delete" ON public.historico_calculos_folha;

-- UPDATE: histórico fiscal é IMUTÁVEL. Não permitir update via cliente.
-- (Qualquer ajuste precisa ser feito por SECURITY DEFINER function com log.)
REVOKE UPDATE ON public.historico_calculos_folha FROM authenticated, anon;

-- DELETE: apenas admin (LGPD Art. 16 — após finalidade)
CREATE POLICY "historico_calculos_delete" ON public.historico_calculos_folha
  FOR DELETE TO authenticated
  USING (
    empresa_id::uuid = (
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'empresa_id'
    )::uuid
    AND public.is_admin(auth.uid())
  );

-- Comentários
COMMENT ON TABLE public.provisoes_folha IS
  '[P0-010] INSERT/UPDATE/DELETE adicionados. Tenant isolation via app_metadata.';
COMMENT ON TABLE public.historico_calculos_folha IS
  '[P0-010] Histórico fiscal imutável (UPDATE bloqueado). DELETE só admin.';
