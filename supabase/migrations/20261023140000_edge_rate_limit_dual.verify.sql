-- Sidecar de 20261023140000 (migration ja aplicada; resgatada da branch `muri`).
-- Roda em mode=verify, lendo do checkout. Somente leitura.

-- 1. A funcao existe com a assinatura e o retorno declarados.
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid::regprocedure::text = 'edge_rate_limit_check_dual(text,integer,text,integer,integer,bigint)'
     AND pg_get_function_result(p.oid) = 'jsonb'
) THEN 'ok' ELSE 'FALHOU' END;

-- 2. SECURITY DEFINER com search_path fixo.
SELECT CASE WHEN (
  SELECT p.prosecdef AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'edge_rate_limit_check_dual'
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. EXECUTE so de service_role: o gateway chama, o cliente nao. Agrega por
--    bool_and para valer para qualquer assinatura que exista.
SELECT CASE WHEN (
  SELECT bool_and(has_function_privilege('service_role', p.oid, 'EXECUTE')
              AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
              AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'edge_rate_limit_check_dual'
) THEN 'ok' ELSE 'FALHOU' END;
