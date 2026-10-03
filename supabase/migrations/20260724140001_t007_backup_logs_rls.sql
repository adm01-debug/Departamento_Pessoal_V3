-- =============================================================================
-- T007 — RLS policies for backup_logs
--
-- Problem: backup_logs has RLS enabled (006_rls_policies.sql:24) but zero
-- policies. With RLS on and no policies, every PostgREST / authenticated
-- read returns 0 rows and every insert is rejected — the table is effectively
-- invisible to all authenticated callers. Service-role edge functions are
-- unaffected (they bypass RLS), but any direct API query silently returns
-- nothing, masking backup history from admin dashboards.
--
-- Fix: add a minimal set of least-privilege policies:
--   SELECT — admin / super_admin within their empresa, super_admin sees all
--   INSERT — admin / super_admin (service_role bypasses RLS regardless)
--   UPDATE / DELETE — denied (immutable audit trail)
-- =============================================================================

-- SELECT: admins see their own empresa; super_admin sees all
DROP POLICY IF EXISTS backup_logs_select ON public.backup_logs;
CREATE POLICY backup_logs_select ON public.backup_logs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- super_admin sees everything
      (auth.jwt() ->> 'role') = 'super_admin'
      OR
      -- admin/rh see their own empresa
      (
        (auth.jwt() ->> 'role') IN ('admin', 'rh')
        AND empresa_id = public.user_empresa_id()
      )
    )
  );

-- INSERT: authenticated admin/super_admin (service_role bypasses this anyway)
DROP POLICY IF EXISTS backup_logs_insert ON public.backup_logs;
CREATE POLICY backup_logs_insert ON public.backup_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin') AND
    empresa_id = public.user_empresa_id()
  );

-- No UPDATE policy — backup logs are immutable
-- No DELETE policy — backup logs are immutable

COMMENT ON TABLE public.backup_logs IS
  'Immutable log of backup operations per empresa. '
  'RLS: admin/rh can SELECT their empresa; admin/super_admin can INSERT. '
  'No UPDATE or DELETE allowed. Service-role (edge functions) bypasses RLS. '
  'T007 fix: added policies — previously RLS was enabled with no policies (silent fail-closed).';
