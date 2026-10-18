-- Reconciliação do ledger: duas migrações foram aplicadas via SQL direto/workflow
-- sem registro no supabase_migrations.schema_migrations. Inserção idempotente.

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20261015170000', 'ci_auditor_revoke_public_secdef'
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version = '20261015170000'
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '20261018160000', 'default_privs_revoke_execute_public'
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version = '20261018160000'
);
