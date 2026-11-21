-- ok só se recibos_ferias existe com RLS ligada, tem as 4 policies por empresa,
-- anon não acessa, as colunas do contrato do front existem e o gatilho de
-- updated_at está instalado.
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM pg_class c
                    WHERE c.oid = to_regclass('public.recibos_ferias')
                      AND c.relkind = 'r' AND c.relrowsecurity)
    THEN 'FALHOU: recibos_ferias ausente ou sem RLS'
  WHEN (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'recibos_ferias'
           AND p.roles = '{authenticated}'
           AND coalesce(p.qual, p.with_check) LIKE '%get_auth_empresa_id%') <> 4
    THEN 'FALHOU: policies por empresa ausentes ou diferentes'
  WHEN (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'recibos_ferias') <> 4
    THEN 'FALHOU: ha policy extra em recibos_ferias'
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
  ELSE 'ok'
END;