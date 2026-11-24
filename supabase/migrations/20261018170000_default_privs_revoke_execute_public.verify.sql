-- Sidecar de verificação: confirma que ALTER DEFAULT PRIVILEGES foi aplicado.
-- Deve imprimir literalmente 'ok' (psql -t -A).
-- Check POSITIVO: exige que exista ao menos uma entrada em pg_default_acl para
-- o schema public / funções que NÃO contenha '=X/%' (PUBLIC execute).
-- Check negativo anterior retornava 'ok' quando pg_default_acl estava vazio
-- (migration não aplicada), o que era um falso positivo silencioso.
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM pg_default_acl da
    JOIN pg_namespace n ON n.oid = da.defaclnamespace
    WHERE n.nspname = 'public'
      AND da.defaclobjtype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(da.defaclacl) AS acl_entry
        WHERE acl_entry::text LIKE '=X/%'
      )
  )
  THEN 'ok'
  ELSE 'fail: pg_default_acl não registra revogação de EXECUTE para PUBLIC no schema public'
END;
