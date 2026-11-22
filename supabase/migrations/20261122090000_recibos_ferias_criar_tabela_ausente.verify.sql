-- ok só se recibos_ferias existe com RLS ligada, tem exatamente as 4 policies
-- de RH por empresa (nenhuma policy de empresa aberta sobrou), anon não acessa,
-- as colunas do contrato do front existem, os gatilhos estão instalados e o
-- vínculo colaborador x empresa é barrado no banco.
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM pg_class c
                    WHERE c.oid = to_regclass('public.recibos_ferias')
                      AND c.relkind = 'r' AND c.relrowsecurity)
    THEN 'FALHOU: recibos_ferias ausente ou sem RLS'
  WHEN (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'recibos_ferias') <> 4
    THEN 'FALHOU: recibos_ferias deveria ter exatamente 4 policies (RH por empresa)'
  WHEN (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'recibos_ferias'
           AND p.roles = '{authenticated}'
           AND coalesce(p.qual, p.with_check) LIKE '%pode_gerir_rh%') <> 4
    THEN 'FALHOU: policies nao usam pode_gerir_rh(empresa_id)'
  WHEN EXISTS (SELECT 1 FROM pg_policies p
                WHERE p.schemaname = 'public' AND p.tablename = 'recibos_ferias'
                  AND p.cmd = 'INSERT' AND p.with_check IS NULL)
    THEN 'FALHOU: INSERT sem WITH CHECK'
  WHEN has_table_privilege('anon', 'public.recibos_ferias', 'SELECT')
    THEN 'FALHOU: anon le recibos_ferias'
  WHEN has_table_privilege('anon', 'public.recibos_ferias', 'INSERT')
    THEN 'FALHOU: anon escreve em recibos_ferias'
  WHEN (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'recibos_ferias'
           AND column_name IN ('id','empresa_id','colaborador_id','descricao','valor',
                               'data_inicio','data_fim','ativo','observacoes',
                               'created_at','updated_at','created_by','updated_by')) <> 13
    THEN 'FALHOU: faltam colunas do contrato de FeriasActions/types.ts'
  WHEN NOT EXISTS (SELECT 1 FROM pg_trigger
                    WHERE tgrelid = 'public.recibos_ferias'::regclass
                      AND tgname = 'trg_recibos_ferias_updated_at' AND NOT tgisinternal)
    THEN 'FALHOU: gatilho de updated_at ausente'
  WHEN NOT EXISTS (SELECT 1 FROM pg_trigger
                    WHERE tgrelid = 'public.recibos_ferias'::regclass
                      AND tgname = 'trg_recibos_ferias_validar' AND NOT tgisinternal)
    THEN 'FALHOU: gatilho de coerencia colaborador x empresa ausente'
  WHEN NOT EXISTS (SELECT 1 FROM pg_proc pr
                    WHERE pr.oid = to_regprocedure('public.pode_gerir_rh(uuid)'))
    THEN 'FALHOU: pode_gerir_rh(uuid) ausente — as policies nao resolveriam'
  ELSE 'ok'
END;