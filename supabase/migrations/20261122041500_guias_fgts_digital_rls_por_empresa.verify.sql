-- ok so se guias_fgts_digital tem RLS ligada e exatamente 4 policies por verbo,
-- todas restritas a authenticated, nenhuma com predicado que ignore empresa_id,
-- anon sem acesso, e a policy aberta antiga removida.
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM pg_class c
                    WHERE c.oid = to_regclass('public.guias_fgts_digital')
                      AND c.relkind = 'r' AND c.relrowsecurity)
    THEN 'FALHOU: guias_fgts_digital ausente ou sem RLS'
  WHEN EXISTS (SELECT 1 FROM pg_policies
                WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital'
                  AND policyname = 'Gestores e RH veem guias FGTS')
    THEN 'FALHOU: policy aberta antiga ainda presente'
  WHEN (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital') <> 4
    THEN 'FALHOU: guias_fgts_digital deveria ter exatamente 4 policies'
  WHEN (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital'
           AND roles = '{authenticated}') <> 4
    THEN 'FALHOU: policies deveriam ser exclusivas de authenticated'
  WHEN (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital'
           AND coalesce(qual, with_check) LIKE '%empresa_id%') <> 4
    THEN 'FALHOU: policy sem predicado por empresa_id'
  WHEN (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital'
           AND cmd = 'SELECT'
           AND coalesce(qual, '') LIKE '%get_user_empresas%') <> 1
    THEN 'FALHOU: leitura nao usa get_user_empresas(auth.uid())'
  WHEN (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital'
           AND cmd IN ('INSERT','UPDATE','DELETE')
           AND coalesce(qual, with_check) LIKE '%pode_gerir_rh%') <> 3
    THEN 'FALHOU: escrita nao usa pode_gerir_rh(empresa_id)'
  WHEN EXISTS (SELECT 1 FROM pg_policies
                WHERE schemaname = 'public' AND tablename = 'guias_fgts_digital'
                  AND cmd = 'INSERT' AND with_check IS NULL)
    THEN 'FALHOU: policy de INSERT sem WITH CHECK'
  ELSE 'ok'
END AS resultado;
