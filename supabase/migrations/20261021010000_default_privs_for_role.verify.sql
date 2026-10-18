-- Verifica que ALTER DEFAULT PRIVILEGES cobre ambos os roles.
-- SELECT CASE evita command tag 'DO' na saída (psql -t -A exige apenas 'ok').
-- unnest garante que só entradas com grantee vazio (PUBLIC) disparam: '=X/%'
-- Padrão LIKE '%=X/%' seria falso positivo (postgres=X/postgres também contém '=X/').
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM pg_default_acl da
    JOIN pg_namespace n ON n.oid = da.defaclnamespace
    JOIN pg_roles r ON r.oid = da.defaclrole
    WHERE n.nspname = 'public'
      AND da.defaclobjtype = 'f'
      AND r.rolname IN ('postgres', 'supabase_admin')
      AND EXISTS (
        SELECT 1 FROM unnest(da.defaclacl) AS acl_entry
        WHERE acl_entry::text LIKE '=X/%'
      )
  )
  THEN 'fail: entradas de DEFAULT ACL ainda concedem EXECUTE ao PUBLIC para postgres/supabase_admin'
  ELSE 'ok'
END;
