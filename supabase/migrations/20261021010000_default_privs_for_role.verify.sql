-- Verifica que ALTER DEFAULT PRIVILEGES cobre ambos os roles.
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_default_acl da
  JOIN pg_namespace n ON n.oid = da.defaclnamespace
  JOIN pg_roles r ON r.oid = da.defaclrole
  WHERE n.nspname = 'public'
    AND da.defaclobjtype = 'f'
    AND r.rolname IN ('postgres', 'supabase_admin')
    AND array_to_string(da.defaclacl, ',') LIKE '%=X/%';

  IF v_count > 0 THEN
    RAISE EXCEPTION '% entradas de DEFAULT ACL ainda concedem EXECUTE ao PUBLIC para postgres/supabase_admin', v_count;
  END IF;
END;
$$;
SELECT 'ok';
