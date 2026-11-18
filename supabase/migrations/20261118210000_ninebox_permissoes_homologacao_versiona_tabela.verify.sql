-- ok = tabela, colunas, PK, FK para auth.users, RLS ligada, zero policies e
-- grants restritos (nada para anon/authenticated) presentes.
SELECT 'ok'
WHERE to_regclass('public.ninebox_permissoes_homologacao') IS NOT NULL
  AND (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ninebox_permissoes_homologacao'
      AND (
           (column_name = 'user_id'    AND data_type = 'uuid'                        AND is_nullable = 'NO')
        OR (column_name = 'habilitado' AND data_type = 'boolean'                     AND is_nullable = 'NO')
        OR (column_name = 'expira_em'  AND data_type = 'timestamp with time zone'    AND is_nullable = 'NO')
        OR (column_name = 'criado_em'  AND data_type = 'timestamp with time zone'    AND is_nullable = 'NO')
      )
  ) = 4
  AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('public.ninebox_permissoes_homologacao')
      AND contype = 'p'
      AND pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id)'
  )
  AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('public.ninebox_permissoes_homologacao')
      AND contype = 'f'
      AND confrelid = to_regclass('auth.users')
      AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (user_id)%ON DELETE CASCADE'
  )
  AND EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = to_regclass('public.ninebox_permissoes_homologacao')
      AND relrowsecurity
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ninebox_permissoes_homologacao'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'ninebox_permissoes_homologacao'
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  );
