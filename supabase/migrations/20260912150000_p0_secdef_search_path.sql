-- P0: fix the execution search_path of SECURITY DEFINER routines that were
-- created after the previous hardening batch.  A mutable path lets an attacker
-- shadow an unqualified object through a writable schema.
--
-- This is deliberately an allowlist: it changes only the routines observed in
-- the canonical audit on 2026-09-12 and fails closed if that contract differs.
DO $migration$
DECLARE
  routine_signature text;
  routine_oid oid;
  routine_schema text;
  routine_name text;
  identity_arguments text;
  expected_routines constant text[] := ARRAY[
    'public.dp_audit_log_immutable()',
    'public.dp_audit_log_prevent_future()',
    'public.dp_catalog_pii(text,text,public.dp_pii_sensitivity,text,text,integer)',
    'public.dp_check_log_rotation()',
    'public.dp_check_rls_index_coverage()',
    'public.dp_connection_health()',
    'public.dp_create_next_partition()',
    'public.dp_decrypt_pii(text,text)',
    'public.dp_encrypt_pii(text,text)',
    'public.dp_has_role(public.dp_user_role)',
    'public.dp_hash_pii(text,text)',
    'public.dp_missing_indexes()',
    'public.dp_post_migration_check(text)',
    'public.dp_pre_deploy_gate()',
    'public.dp_require_role(public.dp_user_role)',
    'public.dp_run_retention(uuid)',
    'public.dp_track_pii_access()',
    'public.user_empresa_id()'
  ];
BEGIN
  FOREACH routine_signature IN ARRAY expected_routines LOOP
    routine_oid := to_regprocedure(routine_signature);
    IF routine_oid IS NULL THEN
      RAISE EXCEPTION 'P0 SECURITY DEFINER search_path remediation requires routine %', routine_signature;
    END IF;

    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
      INTO routine_schema, routine_name, identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.oid = routine_oid;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = routine_oid AND prosecdef) THEN
      RAISE EXCEPTION 'P0 SECURITY DEFINER search_path remediation expected SECURITY DEFINER routine %', routine_signature;
    END IF;

    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public, extensions',
      routine_schema,
      routine_name,
      identity_arguments
    );
  END LOOP;
END
$migration$;
