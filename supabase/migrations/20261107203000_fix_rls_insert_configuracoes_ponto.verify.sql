-- Sidecar de verificação pós-apply (contrato: cada linha não-vazia = 'ok').
SELECT 'ok' WHERE EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'configuracoes_ponto'
    AND policyname = 'configuracoes_ponto_tenant_manage'
    AND cmd = 'ALL'
);