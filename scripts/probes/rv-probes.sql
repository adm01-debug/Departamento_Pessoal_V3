-- Canonical security probes — read-only, all wrapped in ROLLBACK transactions.
-- Executed by scripts/probes/run-probes.mjs against SUPABASE_DB_URL.
-- Output: JSON line per probe with { probe, result, pass }.
--
-- RV-01: user_empresa_id() ignores forged user_metadata.
-- RV-02: medidas_ciencia_tokens has no ACL or policy.
-- RV-03: Zero permissive (USING true) policies on critical tables.
-- RV-04: Required auth/membership RPCs are present.
-- VIEWS: PII views are not readable by anon.
-- LEDGER: Migration ledger row count (info only).

-- RV-01
BEGIN TRANSACTION READ ONLY;
SELECT public.user_empresa_id() AS rv01_result;
ROLLBACK;

-- RV-02
BEGIN TRANSACTION READ ONLY;
SELECT (NOT has_table_privilege('anon','public.medidas_ciencia_tokens','SELECT'))
   AND (NOT has_table_privilege('authenticated','public.medidas_ciencia_tokens','SELECT'))
   AND (SELECT count(*) = 0 FROM pg_catalog.pg_policies
        WHERE schemaname='public' AND tablename='medidas_ciencia_tokens') AS rv02_result;
ROLLBACK;

-- RV-03
BEGIN TRANSACTION READ ONLY;
SELECT count(*) AS rv03_result FROM pg_catalog.pg_policies
WHERE schemaname='public'
  AND tablename IN ('audit_log','cnab_configuracoes','historico_rescisoes')
  AND regexp_replace(COALESCE(qual,''), '\s+', '', 'g') ~* '(^|\()(true)(\)|$)';
ROLLBACK;

-- RV-04
BEGIN TRANSACTION READ ONLY;
SELECT to_regprocedure('public.get_my_user_empresas()') IS NOT NULL
   AND to_regprocedure('public.set_own_default_empresa(uuid)') IS NOT NULL
   AND to_regprocedure('public.admin_associar_usuario_empresa(uuid,uuid)') IS NOT NULL
   AND to_regprocedure('public.pode_gerir_rh_para(uuid,uuid)') IS NOT NULL
   AND to_regprocedure('public.pode_gerir_pessoas_para(uuid,uuid)') IS NOT NULL AS rv04_result;
ROLLBACK;

-- VIEWS — PII views blocked for anon
BEGIN TRANSACTION READ ONLY;
SELECT (NOT has_table_privilege('anon','public.vw_colaboradores_completo','SELECT'))
   AND (NOT has_table_privilege('anon','public.v_audit_events_unified','SELECT'))
   AND (NOT has_table_privilege('anon','public.dp_slow_queries','SELECT'))
   AND (NOT has_table_privilege('anon','public.vw_banco_horas_saldo','SELECT')) AS views_result;
ROLLBACK;

-- LEDGER — migration count (informational)
BEGIN TRANSACTION READ ONLY;
SELECT count(*) AS ledger_count FROM supabase_migrations.schema_migrations;
ROLLBACK;
