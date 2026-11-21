-- ok só se a tabela existe com RLS ligada, tem exatamente as 4 policies de
-- admin/RH por empresa, anon não acessa, a unicidade por colaborador+competência
-- e o gatilho de empresa do colaborador existem.
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM pg_class c
                    WHERE c.oid = to_regclass('public.ponto_espelhos_papel') AND c.relrowsecurity)
    THEN 'FALHOU: ponto_espelhos_papel ausente ou sem RLS'
  WHEN (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'ponto_espelhos_papel'
           AND p.roles = '{authenticated}'
           AND coalesce(p.qual, p.with_check) LIKE '%pertence_a_empresa%'
           AND coalesce(p.qual, p.with_check) LIKE '%has_role%'
           AND coalesce(p.qual, p.with_check) NOT LIKE '%IS NULL%') <> 4
    THEN 'FALHOU: policies admin/RH por empresa ausentes ou diferentes'
  WHEN (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'ponto_espelhos_papel') <> 4
    THEN 'FALHOU: ha policy extra em ponto_espelhos_papel'
  WHEN EXISTS (SELECT 1 FROM pg_policies p
                WHERE p.schemaname = 'public' AND p.tablename = 'ponto_espelhos_papel'
                  AND p.cmd IN ('INSERT', 'UPDATE') AND p.with_check IS NULL)
    THEN 'FALHOU: escrita sem WITH CHECK'
  WHEN has_table_privilege('anon', 'public.ponto_espelhos_papel', 'SELECT')
    THEN 'FALHOU: anon le ponto_espelhos_papel'
  WHEN NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'ponto_espelhos_papel_colaborador_competencia_key')
    THEN 'FALHOU: unicidade colaborador+competencia ausente'
  WHEN NOT EXISTS (SELECT 1 FROM pg_trigger
                    WHERE tgrelid = 'public.ponto_espelhos_papel'::regclass
                      AND tgname = 'trg_ponto_espelhos_papel_validar' AND NOT tgisinternal)
    THEN 'FALHOU: gatilho de empresa do colaborador ausente'
  ELSE 'ok'
END;
