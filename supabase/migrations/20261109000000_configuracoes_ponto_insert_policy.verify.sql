-- Verifica que a política INSERT existe após a migration
SELECT 'ok' WHERE EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'configuracoes_ponto'
    AND cmd = 'INSERT'
    AND policyname = 'Admins podem inserir configurações de ponto'
);
