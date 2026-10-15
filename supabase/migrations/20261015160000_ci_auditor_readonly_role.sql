-- W23 (plano 100 workflows): role somente-leitura para os auditores de CI
-- (scripts/audit-db-search-path.mjs, smoke-hash-triggers.mjs, audit-rls-*.mjs,
-- audit-secdef-authz.mjs, audit-embed-hints.mjs). Hoje esses scripts rodam
-- com a credencial admin (postgres) do banco canônico em PRs internos
-- (db-integrity-live). Nenhum deles grava dado de negócio nem lê linha de
-- tabela `public.*` -- só introspectam catálogo (policies, triggers,
-- definição de função, hints de relacionamento). `ci_auditor` reduz o raio
-- de exposição dessa credencial ao mínimo necessário para essa introspecção.
--
-- Sem acesso a `public` (dados de RH). Sem CREATEDB/CREATEROLE/SUPERUSER.
-- Sem senha definida aqui -- esta migration é pública (repositório público);
-- a senha é definida fora de banda (ALTER ROLE direto, fora do git) e o
-- secret correspondente (SUPABASE_DB_URL_READONLY) fica no GitHub, nunca
-- commitado.

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ci_auditor') THEN
    CREATE ROLE ci_auditor WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT 5;
  END IF;
END
$migration$;

-- Catálogo do sistema: pg_catalog e information_schema já são legíveis por
-- qualquer role por padrão no Postgres (grants implícitos a PUBLIC) -- os
-- GRANTs abaixo são defensivos/explícitos, não mudam o comportamento padrão,
-- e documentam a intenção caso esses defaults sejam revogados no futuro.
GRANT USAGE ON SCHEMA pg_catalog TO ci_auditor;
GRANT USAGE ON SCHEMA information_schema TO ci_auditor;

-- cron.job NÃO é legível por padrão (extensão pg_cron, schema próprio) --
-- este GRANT é o único que de fato muda o acesso do role.
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA cron TO ci_auditor';
    EXECUTE 'GRANT SELECT ON cron.job TO ci_auditor';
  END IF;
END
$migration$;

-- Garantia explícita: NUNCA conceder acesso ao schema public a este role.
-- Se uma migration futura rodar "GRANT ... ON ALL TABLES IN SCHEMA public
-- TO PUBLIC" (erro comum), este REVOKE idempotente neutraliza o vazamento
-- para ci_auditor especificamente, sem depender de ninguém lembrar a regra.
REVOKE ALL ON SCHEMA public FROM ci_auditor;
