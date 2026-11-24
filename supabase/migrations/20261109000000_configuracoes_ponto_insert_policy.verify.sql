-- ok só se: a policy INSERT existe, é TO authenticated, exige empresa E papel,
-- e não existe policy FOR ALL (que concederia DELETE/acesso cross-tenant).
SELECT 'ok' WHERE EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'configuracoes_ponto'
    AND cmd = 'INSERT'
    AND policyname = 'Admins podem inserir configurações de ponto'
    AND roles = '{authenticated}'
    AND with_check LIKE '%pertence_a_empresa%'
    AND with_check LIKE '%has_role%'
) AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'configuracoes_ponto'
    AND cmd IN ('ALL', 'DELETE')
);
