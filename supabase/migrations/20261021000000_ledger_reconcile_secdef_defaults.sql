-- Reconciliação do ledger: duas migrações foram aplicadas via SQL direto/workflow
-- sem registro no supabase_migrations.schema_migrations. Inserção idempotente.
-- Padrão ON CONFLICT alinhado com 20261014170000_ledger_repair.sql.

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261015170000', 'ci_auditor_revoke_public_secdef')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261018170000', 'default_privs_revoke_execute_public')
ON CONFLICT (version) DO NOTHING;
