-- =============================================================================
-- fix: recria policy RLS configuracoes_ponto_tenant_manage (drift migrations × banco)
--
-- A policy FOR ALL "configuracoes_ponto_tenant_manage" (definida em
-- 20260719120000_rls_fix_public_access_batch2.sql) não existe no banco canônico
-- (drift de schema). O E2E autenticado falha no INSERT em configuracoes_ponto
-- com "new row violates row-level security policy" (run 1331, step 'Garantir
-- fixtures do E2E autenticado'). Nenhuma migration dropa esta policy.
--
-- DROP POLICY IF EXISTS + CREATE POLICY = idempotente. Sem alteração de dados.
-- =============================================================================

-- audit-migration-style: allow-silent-drop policy ausente no banco por drift; recriada logo abaixo
DROP POLICY IF EXISTS "configuracoes_ponto_tenant_manage" ON public.configuracoes_ponto;

CREATE POLICY "configuracoes_ponto_tenant_manage"
  ON public.configuracoes_ponto FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));
