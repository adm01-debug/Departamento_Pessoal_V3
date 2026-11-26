-- Sidecar de verificacao da 20261126120000.
-- Roda no fim da transacao do apply/verify, com o mesmo role admin.
SELECT CASE
  WHEN EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE pg_catalog.pg_policies.schemaname = 'storage'
       AND pg_catalog.pg_policies.tablename = 'objects'
       AND pg_catalog.pg_policies.policyname LIKE 'pol_admissao_docs_%'
  ) THEN 'FALHOU: documentos-admissao ainda tem policy em storage.objects'
  WHEN NOT (
    SELECT c.relrowsecurity
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ) THEN 'FALHOU: RLS desligada em storage.objects'
  ELSE 'ok'
END;