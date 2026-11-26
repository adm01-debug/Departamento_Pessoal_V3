-- Sidecar de verificacao da 20261126130000.
-- Roda no fim da transacao do apply/verify, com o mesmo role admin.
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE pg_catalog.pg_policies.schemaname = 'storage'
       AND pg_catalog.pg_policies.tablename = 'objects'
       AND pg_catalog.pg_policies.policyname = 'documentos_select_admissao_tenant'
       AND pg_catalog.pg_policies.cmd = 'SELECT'
  ) THEN 'FALHOU: policy documentos_select_admissao_tenant ausente em storage.objects'
  WHEN NOT (
    SELECT c.relrowsecurity
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ) THEN 'FALHOU: RLS desligada em storage.objects'
  WHEN public.storage_path_admissao_id('admissao_11111111-1111-1111-1111-111111111111/cpf_1.pdf')
       IS DISTINCT FROM '11111111-1111-1111-1111-111111111111'::uuid THEN
    'FALHOU: helper nao extrai o admissao_id do caminho padrao'
  WHEN public.storage_path_admissao_id('11111111-1111-1111-1111-111111111111/cpf_1.pdf') IS NOT NULL THEN
    'FALHOU: helper deveria devolver NULL para caminho fora do padrao admissao_<uuid>/'
  ELSE 'ok'
END;