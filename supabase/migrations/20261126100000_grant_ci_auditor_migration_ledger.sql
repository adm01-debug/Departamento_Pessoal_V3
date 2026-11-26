-- Gate de drift de migrations: dá ao role de leitura do CI acesso ao ledger.
--
-- O job `db-integrity-live` (`.github/workflows/ci.yml`) usa o secret
-- SUPABASE_DB_URL_READONLY (role ci_auditor, least-privilege: catálogo e
-- auditoria, nunca dado de negócio). O gate `scripts/audit-schema-drift.mjs`
-- compara as versões em `supabase/migrations/` com
-- `supabase_migrations.schema_migrations`, e hoje falha com
-- "permission denied for schema supabase_migrations" — o mesmo bloqueio que
-- impedia diagnosticar o Supabase Preview.
--
-- Escopo mínimo e sem dado pessoal: só o schema de escrituração de migrations
-- e só leitura das versões aplicadas. Nada em `public`, nada gravável.
--
-- Sem isso o gate não pode ser ligado: um gate que não consegue ler o ledger
-- ou reprova o build por credencial (falso vermelho permanente) ou finge
-- aprovar (falso verde) — os dois piores desfechos possíveis.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ci_auditor') THEN
    RAISE EXCEPTION
      'role ci_auditor ausente: e o role de SUPABASE_DB_URL_READONLY usado pelo CI. Confira o nome antes de aplicar.';
  END IF;

  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RAISE EXCEPTION
      'supabase_migrations.schema_migrations ausente: o ledger deste projeto nao esta nesse schema.';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA supabase_migrations TO ci_auditor;
GRANT SELECT ON supabase_migrations.schema_migrations TO ci_auditor;