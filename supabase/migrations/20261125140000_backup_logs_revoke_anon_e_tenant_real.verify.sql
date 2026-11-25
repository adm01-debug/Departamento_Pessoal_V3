-- Exige 'ok': record_backup_run nao executavel por anon/authenticated e nenhuma
-- policy de backup_logs derivando tenant de claim do JWT.
WITH fn AS (
  SELECT p.oid,
         has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'record_backup_run'
), pol AS (
  SELECT count(*) FILTER (
    WHERE coalesce(qual, '') || ' ' || coalesce(with_check, '')
          ~* 'get_auth_empresa_id|request\.jwt|auth\.jwt|app_metadata'
  ) AS com_claim
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'backup_logs'
)
SELECT CASE
  WHEN (SELECT count(*) FROM fn WHERE anon_exec OR auth_exec) = 0
   AND (SELECT com_claim FROM pol) = 0 THEN 'ok'
  ELSE format(
    'FALHOU: record_backup_run exposta=%s; policies de backup_logs com claim=%s',
    (SELECT count(*) FROM fn WHERE anon_exec OR auth_exec),
    (SELECT com_claim FROM pol))
END AS resultado;
