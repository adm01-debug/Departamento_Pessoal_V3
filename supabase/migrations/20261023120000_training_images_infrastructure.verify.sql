-- Sidecar de 20261023120000 (migration ja aplicada; resgatada da branch `muri`).
-- Roda por `canonical-migrations.yml` em mode=verify, que le o sidecar do
-- checkout e exige que a versao esteja no ledger -- nao depende da lista
-- fechada de apply. Somente leitura: catalogo do Postgres.
--
-- Contrato afirmado aqui e o estado FINAL de hoje, nao o do arquivo original:
-- 20261028130000_revoke_orphan_secdef_v2.sql revogou depois o EXECUTE de
-- training_images_track_outcomes, e as assercoes 6 e 7 refletem isso.
-- Formato obrigatorio: CASE WHEN (...) THEN 'ok' ELSE 'FALHOU' END -- nunca
-- `SELECT 'ok' WHERE (...)`, que emite zero linha e desaparece entre as que passam.

-- 1. A tabela existe e esta com RLS ligada.
SELECT CASE WHEN (
  SELECT c.relkind = 'r' AND c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'training_images'
) THEN 'ok' ELSE 'FALHOU' END;

-- 2. As 25 colunas declaradas, nos mesmos nomes e na mesma ordem.
SELECT CASE WHEN (
  SELECT string_agg(a.attname, ',' ORDER BY a.attnum)
    FROM pg_attribute a
   WHERE a.attrelid = 'public.training_images'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
) = 'id,empresa_id,content_type,content_id,source_content_id,storage_path,content_hash,status,provider,model,attempts,generations,failures,unknown_outcomes,last_attempt_at,operation_id,reconciled_at,reconciled_by,reconciliation_notes,last_error,prompt_version,requested_at,completed_at,created_at,updated_at'
  THEN 'ok' ELSE 'FALHOU' END;

-- 3. A leitura por tenant existe e e so para `authenticated` (sem TO, a policy
--    nasceria TO public e valeria para `anon`).
SELECT CASE WHEN (
  SELECT p.roles::text = '{authenticated}' AND p.cmd = 'SELECT'
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'training_images'
     AND p.policyname = 'training_images_select_tenant'
) THEN 'ok' ELSE 'FALHOU' END;

-- 4. A policy ampla que o arquivo dropa e nao recria continua ausente.
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'training_images'
     AND policyname = 'training_images_admin_all'
) THEN 'ok' ELSE 'FALHOU' END;

-- 5. As 4 policies do bucket em storage.objects.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname IN ('training_images_select_authenticated',
                        'training_images_insert_admin',
                        'training_images_update_admin',
                        'training_images_delete_admin')
) = 4 THEN 'ok' ELSE 'FALHOU' END;

-- 6. Os 2 triggers da tabela.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_trigger
   WHERE NOT tgisinternal AND tgrelid = 'public.training_images'::regclass
     AND tgname IN ('update_training_images_updated_at', 'track_training_images_outcomes')
) = 2 THEN 'ok' ELSE 'FALHOU' END;

-- 7. As 3 funcoes: SECURITY DEFINER com search_path fixo e EXECUTE so para
--    service_role -- nem anon nem authenticated.
SELECT CASE WHEN (
  SELECT count(*) = 3 AND bool_and(
           p.prosecdef
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
       AND has_function_privilege('service_role', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('claim_training_image', 'reconcile_training_image',
                       'training_images_track_outcomes')
) THEN 'ok' ELSE 'FALHOU' END;

-- 8. Escrita da tabela e so do backend: authenticated le e nao escreve, anon
--    nao enxerga.
SELECT CASE WHEN (
      has_table_privilege('authenticated', 'public.training_images', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.training_images', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.training_images', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.training_images', 'DELETE')
  AND NOT has_table_privilege('anon', 'public.training_images', 'SELECT')
  AND has_table_privilege('service_role', 'public.training_images', 'INSERT')
) THEN 'ok' ELSE 'FALHOU' END;
