-- SECURITY: Remove usuário de teste hard-coded inserido em 20260516155424_*.
--
-- O migration original inseriu admin@teste.com com senha AdminPassword123! diretamente
-- na tabela auth.users — uma credencial exposta no histórico do repositório.
-- Em produção essa conta deve ser excluída; em branches de preview é igualmente
-- arriscada pois tem role 'authenticated' e pode acionar RLS policies.
DELETE FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@teste.com'
  );

DELETE FROM auth.users WHERE email = 'admin@teste.com';
