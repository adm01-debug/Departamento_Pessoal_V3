
CREATE OR REPLACE VIEW public.v_system_health
WITH (security_invoker = true)
AS
SELECT
  (SELECT count(*) FROM pg_tables t
     WHERE t.schemaname='public' AND EXISTS (
       SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=t.tablename AND c.relrowsecurity
     )) AS tables_with_rls,
  (SELECT count(*) FROM pg_tables WHERE schemaname='public') AS tables_total,
  (SELECT count(*) FROM public.audit_log_unified) AS audit_events_total,
  (SELECT max(occurred_at) FROM public.audit_log_unified) AS audit_last_event_at,
  (SELECT count(*) FROM public.security_alerts WHERE resolved_at IS NULL) AS security_alerts_open,
  (SELECT count(*) FROM (
      SELECT c.conrelid, c.conkey::int[] AS keys
      FROM pg_constraint c
      WHERE c.contype='f' AND c.connamespace='public'::regnamespace
      EXCEPT
      SELECT c.conrelid, c.conkey::int[]
      FROM pg_constraint c
      JOIN pg_index i ON i.indrelid = c.conrelid AND (c.conkey::int[] <@ i.indkey::int[])
      WHERE c.contype='f' AND c.connamespace='public'::regnamespace
  ) missing) AS fks_without_index,
  now() AS snapshot_at
WHERE public.has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.v_system_health TO authenticated;
COMMENT ON VIEW public.v_system_health IS 'Snapshot 1-linha de saúde do sistema. Visível apenas para admins.';
