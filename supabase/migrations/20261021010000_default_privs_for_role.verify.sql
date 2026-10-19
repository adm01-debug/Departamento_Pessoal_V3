-- Verifica que ALTER DEFAULT PRIVILEGES cobre ambos os roles.
-- SELECT CASE evita command tag 'DO' na saída (psql -t -A exige apenas 'ok').
-- Check POSITIVO: exige que AMBOS os roles (postgres e supabase_admin) tenham
-- entradas em pg_default_acl sem '=X/%' (PUBLIC execute revogado).
-- Check negativo anterior retornava 'ok' quando não havia entradas (falso positivo),
-- e não detectava falha silenciosa do DO block para supabase_admin.
SELECT CASE
  WHEN (
    SELECT count(DISTINCT r.rolname)
    FROM pg_default_acl da
    JOIN pg_namespace n ON n.oid = da.defaclnamespace
    JOIN pg_roles r ON r.oid = da.defaclrole
    WHERE n.nspname = 'public'
      AND da.defaclobjtype = 'f'
      AND r.rolname IN ('postgres', 'supabase_admin')
      AND NOT EXISTS (
        SELECT 1 FROM unnest(da.defaclacl) AS acl_entry
        WHERE acl_entry::text LIKE '=X/%'
      )
  ) = 2
  THEN 'ok'
  ELSE 'fail: pg_default_acl não registra revogação de EXECUTE para PUBLIC em ambos os roles (postgres + supabase_admin)'
END;
