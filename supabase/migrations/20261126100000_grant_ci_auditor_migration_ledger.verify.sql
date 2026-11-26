-- Sidecar de verificacao da 20261126100000.
-- Roda no fim da transacao do apply/verify, com o mesmo role admin: as
-- funcoes has_*_privilege so consultam catalogo, entao respondem mesmo que
-- este role nao tenha acesso ao schema alvo.
SELECT CASE
  WHEN has_schema_privilege('ci_auditor', 'supabase_migrations', 'USAGE')
   AND has_table_privilege('ci_auditor', 'supabase_migrations.schema_migrations', 'SELECT')
  THEN 'ok'
  ELSE 'FALHOU: ci_auditor continua sem acesso de leitura ao ledger de migrations'
END;