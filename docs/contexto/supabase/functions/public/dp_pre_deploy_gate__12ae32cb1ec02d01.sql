CREATE OR REPLACE FUNCTION public.dp_pre_deploy_gate()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_issues JSONB := '[]'::JSONB;
  v_table TEXT;
  v_ok BOOLEAN := true;
BEGIN
  -- Verificar RLS em todas as tabelas dp_*
  FOR v_table IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname='public' AND tablename LIKE 'dp_%'
      AND tablename NOT LIKE 'dp_audit_log_20%'  -- particoes herdam
  LOOP
    BEGIN
      PERFORM dp_assert_rls(v_table);
    EXCEPTION WHEN OTHERS THEN
      v_issues := v_issues || jsonb_build_object('issue', 'RLS_DISABLED', 'table', v_table, 'severity', 'HIGH');
      v_ok := false;
    END;
  END LOOP;
  
  -- Verificar que nenhuma tabela dp_* tem owner diferente de postgres
  SELECT jsonb_agg(jsonb_build_object('issue', 'WRONG_OWNER', 'table', tablename, 'owner', tableowner, 'severity', 'MEDIUM'))
  INTO v_issues
  FROM (
    SELECT tablename, tableowner FROM pg_tables
    WHERE schemaname='public' AND tablename LIKE 'dp_%' AND tableowner != 'postgres'
  ) t;
  IF v_issues IS NOT NULL AND v_issues != 'null' THEN v_ok := false; END IF;
  
  -- Verificar que funcoes dp_* existem (baseline)
  DECLARE v_fn_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_fn_count FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'dp_%';
    IF v_fn_count < 10 THEN
      v_issues := COALESCE(v_issues,'[]'::JSONB) || jsonb_build_object('issue', 'FN_COUNT_LOW', 'count', v_fn_count, 'expected', 10, 'severity', 'HIGH');
      v_ok := false;
    END IF;
  END;
  
  RETURN jsonb_build_object(
    'gate_passed', v_ok,
    'checked_at', NOW(),
    'issues', COALESCE(v_issues, '[]'::JSONB),
    'migrations_total', (SELECT COUNT(*) FROM supabase_migrations.schema_migrations),
    'schema_version', (SELECT config_val FROM dp_mcp_config WHERE config_key='schema_version' LIMIT 1)
  );
END;
$function$
