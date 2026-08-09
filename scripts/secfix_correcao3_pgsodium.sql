-- ============================================================
-- CORREÇÃO 3: pgsodium — extensão de criptografia, service_role only
-- ============================================================
DO $$
DECLARE fn_list text[] := ARRAY['create_key','get_key_by_id','get_key_by_name',
  'get_named_keys','mask_role','update_mask','enable_security_label_trigger',
  'disable_security_label_trigger']; r record;
BEGIN
  FOR r IN SELECT n.nspname AS s, p.proname, pg_get_function_identity_arguments(p.oid) AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proname = ANY(fn_list) AND n.nspname='pgsodium'
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
           OR has_function_privilege('authenticated', p.oid, 'EXECUTE')) LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.s, r.proname, r.sig);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FALHOU %.%: %', r.s, r.proname, SQLERRM; END;
  END LOOP;
END $$;
