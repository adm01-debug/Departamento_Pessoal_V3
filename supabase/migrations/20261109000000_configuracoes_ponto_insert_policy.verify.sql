-- Verifica que a política INSERT existe após a migration
SELECT COUNT(*) = 1 AS ok
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'configuracoes_ponto'
  AND cmd = 'INSERT'
  AND policyname = 'Admins podem inserir configurações de ponto';
