-- Sidecar de verificação da onda 4d. Cada SELECT deve retornar exatamente 'ok';
-- qualquer outra linha reprova o deploy no canonical-migrations.yml.
SELECT CASE WHEN pg_get_functiondef('public.vincular_colaborador_ao_usuario()'::regprocedure)
    LIKE '%AND c.user_id IS NULL%' THEN 'ok'
    ELSE 'FAIL vinculo_counts_all' END;
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_empresa_colaborador'
      AND tgrelid = 'public.documentos'::regclass
      AND NOT tgisinternal
  ) THEN 'ok' ELSE 'FAIL documentos_sync_trigger' END;
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_empresa_colaborador'
      AND tgrelid = 'public.documentos_colaborador'::regclass
      AND NOT tgisinternal
  ) THEN 'ok' ELSE 'FAIL documentos_colaborador_sync_trigger' END;
