-- Sidecar de verificação: confirma que ALTER DEFAULT PRIVILEGES foi aplicado.
-- Deve imprimir literalmente 'ok' (psql -t -A).
-- unnest garante que só entradas com grantee vazio (PUBLIC) disparam: '=X/%'
-- (LIKE '%=X/%' seria falso positivo em 'postgres=X/postgres' que contém '=X/')
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM pg_default_acl da
    JOIN pg_namespace n ON n.oid = da.defaclnamespace
    WHERE n.nspname = 'public'
      AND da.defaclobjtype = 'f'
      AND EXISTS (
        SELECT 1 FROM unnest(da.defaclacl) AS acl_entry
        WHERE acl_entry::text LIKE '=X/%'
      )
  )
  THEN 'fail: ALTER DEFAULT PRIVILEGES não aplicado — PUBLIC ainda tem EXECUTE em funções futuras'
  ELSE 'ok'
END;
