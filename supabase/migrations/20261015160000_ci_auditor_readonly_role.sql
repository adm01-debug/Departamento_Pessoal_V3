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
-- estes GRANTs são os únicos que de fato mudam o acesso do role. SQL estático
-- (sem EXECUTE) -- o schema `cron` já existe neste banco (pg_cron ativo,
-- confirmado ao vivo antes de escrever esta migration); dynamic SQL via
-- EXECUTE com string fixa só adicionava superfície para scanner de segurança
-- sinalizar sem ganho real (nenhuma entrada externa é interpolada).
GRANT USAGE ON SCHEMA cron TO ci_auditor;
GRANT SELECT ON cron.job TO ci_auditor;

-- smoke-hash-triggers.mjs (db-integrity-live) prova que digest() resolve sob
-- o mesmo search_path fixado em cada trigger SECURITY DEFINER -- isso exige
-- EXECUTE de verdade, não só leitura de catálogo. `extensions` só contém
-- pg_stat_statements/uuid-ossp/pgcrypto (utilitários sem acesso a dados de
-- negócio) -- EXECUTE em todas as funções do schema é apropriado ao escopo
-- do role (achado em CI real: sem este GRANT, 13 triggers de hash reportavam
-- falso-positivo "digest() não resolve", porque o role que falhava era o
-- auditor, não a função de produção).
GRANT USAGE ON SCHEMA extensions TO ci_auditor;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO ci_auditor;

-- Garantia explícita: NUNCA conceder USAGE/CREATE no schema public a este
-- role diretamente. Se uma migration futura rodar "GRANT ... ON ALL TABLES
-- IN SCHEMA public TO PUBLIC" (erro comum), este REVOKE idempotente
-- neutraliza o vazamento do GRANT direcionado a ci_auditor, sem depender de
-- ninguém lembrar a regra.
--
-- Codex review (P1, PR #238): este REVOKE NÃO cobre privilégios concedidos
-- ao pseudo-role PUBLIC (ex.: EXECUTE em funções SECURITY DEFINER, que o
-- Postgres concede a PUBLIC por padrão em toda CREATE FUNCTION) -- PUBLIC
-- se aplica a todo role por definição, e REVOKE direcionado a um role
-- específico nunca revoga o que foi concedido a PUBLIC. Esse gap real foi
-- corrigido à parte na migration 20261015170000_ci_auditor_revoke_public_secdef.sql
-- (lista estática das funções que estavam expostas); ver o cabeçalho dela
-- para o detalhamento e a limitação residual conhecida.
REVOKE ALL ON SCHEMA public FROM ci_auditor;
