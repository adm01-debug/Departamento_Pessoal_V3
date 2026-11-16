-- Sidecar de 20261023130000 (migration ja aplicada; resgatada da branch `muri`).
-- Roda em mode=verify, lendo do checkout. Somente leitura.

-- 1. As 2 tabelas da fila existem com RLS ligada.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
     AND c.relname IN ('training_image_settings', 'training_image_requests')
) = 2 THEN 'ok' ELSE 'FALHOU' END;

-- 2. Colunas de training_image_requests, nomes e ordem.
SELECT CASE WHEN (
  SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
   WHERE a.attrelid = 'public.training_image_requests'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
) = 'id,empresa_id,content_type,content_id,requested_by,status,attempts,last_error,requested_at,available_at,started_at,finished_at'
  THEN 'ok' ELSE 'FALHOU' END;

-- 3. Colunas de training_image_settings.
SELECT CASE WHEN (
  SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
   WHERE a.attrelid = 'public.training_image_settings'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
) = 'id,autoqueue_enabled,updated_at' THEN 'ok' ELSE 'FALHOU' END;

-- 4. A fila e exclusivamente do backend: anon e authenticated nao tem nenhum
--    privilegio nas 2 tabelas, e service_role tem.
SELECT CASE WHEN (
      NOT has_table_privilege('anon', 'public.training_image_requests', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.training_image_requests', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.training_image_settings', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.training_image_settings', 'SELECT')
  AND has_table_privilege('service_role', 'public.training_image_requests', 'INSERT')
  AND has_table_privilege('service_role', 'public.training_image_settings', 'UPDATE')
) THEN 'ok' ELSE 'FALHOU' END;

-- 5. As 4 funcoes CHAMAVEIS por RPC: SECURITY DEFINER, search_path fixo,
--    EXECUTE so de service_role.
SELECT CASE WHEN (
  SELECT count(*) = 4 AND bool_and(
           p.prosecdef
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
       AND has_function_privilege('service_role', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('claim_training_image_requests', 'finish_training_image_request',
                       'set_training_image_autoqueue', 'backfill_training_image_requests')
) THEN 'ok' ELSE 'FALHOU' END;

-- 6. `enqueue_training_image_request` e funcao de TRIGGER (retorna trigger):
--    nao e chamavel por RPC nem pelo PostgREST, mesmo com EXECUTE amplo, e o
--    Postgres recusa chamada direta. O que o sidecar exige dela e ser SECURITY
--    DEFINER com search_path fixo e continuar retornando trigger -- se um dia
--    virar funcao normal, esta assercao reprova.
--    (Hoje ela carrega EXECUTE de PUBLIC, herdado do arquivo original, que
--    revogou as outras e nao esta. Revogar e DDL em producao: decisao do dono.)
SELECT CASE WHEN (
  SELECT p.prosecdef
     AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
     AND pg_get_function_result(p.oid) = 'trigger'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'enqueue_training_image_request'
) THEN 'ok' ELSE 'FALHOU' END;

-- 7. Os 3 triggers da esteira.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgname IN ('enqueue_training_image_course', 'enqueue_training_image_learning_path',
                    'update_training_image_settings_updated_at')
) = 3 THEN 'ok' ELSE 'FALHOU' END;
