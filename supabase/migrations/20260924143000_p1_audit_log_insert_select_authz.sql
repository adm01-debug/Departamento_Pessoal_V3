-- P1: close the 2 remaining audit-rls-pii violations on audit_log, found by
-- the gate itself after 20260924140000/141500 fixed the original 6 (A-035).
--
-- "Authenticated users can insert audit_logs" only checked auth.role() =
-- 'authenticated', with no WITH CHECK correlating the row to the inserting
-- user — a client could insert an audit_log row claiming to be any user_id.
-- "Users can view relevant audit_logs" OR'd a self-view (safe) with a
-- auth.jwt()->>'role' = 'service_role' branch — service_role already
-- bypasses RLS at the Postgres role level, so this branch is dead at best
-- and an unverified-claim pattern at worst. "Admins podem ver todo
-- audit_log" (20260912190000) already covers the admin-read case, so the
-- self-view policy is simplified to just that.

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'P1 audit_log remediation requires audit_log.user_id';
  END IF;
END
$preflight$;

DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_log;
CREATE POLICY "audit_log_self_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view relevant audit_logs" ON public.audit_log;
CREATE POLICY "audit_log_self_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
