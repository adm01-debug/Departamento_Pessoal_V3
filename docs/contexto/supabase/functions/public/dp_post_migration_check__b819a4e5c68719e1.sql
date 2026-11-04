CREATE OR REPLACE FUNCTION public.dp_post_migration_check(p_expected_version text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_latest TEXT;
  v_ok BOOLEAN;
BEGIN
  SELECT version INTO v_latest FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
  v_ok := (v_latest = p_expected_version);
  
  -- Registrar no audit log
  INSERT INTO public.dp_audit_log(event, event_type, payload)
  VALUES('migration_validated', 'compliance', 
    jsonb_build_object('expected', p_expected_version, 'actual', v_latest, 'ok', v_ok));
  
  RETURN jsonb_build_object(
    'ok', v_ok,
    'expected_version', p_expected_version,
    'latest_version', v_latest,
    'checked_at', NOW()
  );
END;
$function$
