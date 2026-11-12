-- ok só se: INSERT admin/rh (empresa E papel) e INSERT/UPDATE de
-- supervisor/coordenador via pode_gerir_config_ponto existem, nenhuma policy
-- FOR ALL/DELETE, nenhuma UPDATE fora do helper, e o enum tem os papéis novos.
SELECT 'ok' WHERE EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'configuracoes_ponto'
    AND cmd = 'INSERT' AND policyname = 'Admins podem inserir configurações de ponto'
    AND roles = '{authenticated}'
    AND with_check LIKE '%pertence_a_empresa%' AND with_check LIKE '%has_role%'
) AND EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'configuracoes_ponto'
    AND cmd = 'INSERT' AND roles = '{authenticated}'
    AND with_check LIKE '%pode_gerir_config_ponto%'
) AND EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'configuracoes_ponto'
    AND cmd = 'UPDATE' AND roles = '{authenticated}'
    AND qual LIKE '%pode_gerir_config_ponto%' AND with_check LIKE '%pode_gerir_config_ponto%'
) AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'configuracoes_ponto'
    AND (cmd IN ('ALL', 'DELETE') OR (cmd = 'UPDATE' AND qual NOT LIKE '%pode_gerir_config_ponto%'))
) AND (
  SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'app_role' AND e.enumlabel IN ('supervisor', 'coordenador')
) = 2;
