# Schemas

Schemas internos do Supabase ficam fora da introspecção geral (`_analytics, _realtime, _supavisor, auth, cron, extensions, graphql, graphql_public, net, pg_stat_statements, pgbouncer, pgmq, pgsodium, pgsodium_masks, pgtle, realtime, repack, storage, supabase_functions, supabase_migrations, vault`).

| schema | owner | USAGE para roles da API | comentário |
|---|---|---|---|
| public | pg_database_owner | anon, authenticated, service_role | Departamento Pessoal (dp_*) — Convenções obrigatórias:   PKs: UUID DEFAULT gen_random_uuid()   Timestamps: TIMESTAMPTZ NOT NULL DEFAULT NOW()   RLS: SEMPRE habilitado antes do primeiro dado   Migrations: YYYYMMDDHHMMSS_dp_nome.sql via supabase_apply_migration   PII: COMMENTs em colunas com dados pessoais indicando classificação LGPD   Audit: toda operação sensível registra em dp_audit_log   Imutabilidade: logs não permitem UPDATE/DELETE sem role postgres |
