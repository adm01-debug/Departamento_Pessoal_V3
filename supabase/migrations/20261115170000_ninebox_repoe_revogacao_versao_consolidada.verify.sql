-- Sidecar de 20261115170000: prova que o lote NineBox terminou SEM devolver
-- EXECUTE a anon/authenticated nas funcoes `security definer` cobertas pelo
-- invariante orphan_secdef_revoked (scripts/canonical-invariants.sql:335-346).
-- Somente leitura: pg_proc e has_function_privilege.
--
-- As asserções 1 e 2 agregam com `bool_and` em vez de subconsulta escalar: se
-- um dia existir mais de uma assinatura da funcao, a asserção vale para TODAS
-- (e devolve NULL -> FALHOU se nao existir nenhuma).

-- 1. Nem anon nem authenticated executam versao_consolidada_avaliacao.
SELECT CASE WHEN (
  SELECT bool_and(NOT has_function_privilege('anon', p.oid, 'EXECUTE')
              AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'versao_consolidada_avaliacao'
) THEN 'ok' ELSE 'FALHOU' END;

-- 2. A funcao segue SECURITY DEFINER (a revogacao nao a transformou em invoker).
SELECT CASE WHEN (
  SELECT bool_and(p.prosecdef)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'versao_consolidada_avaliacao'
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. O invariante inteiro do gate: nenhuma das duas funcoes orfas executavel.
SELECT CASE WHEN (
  NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('versao_consolidada_avaliacao','training_images_track_outcomes')
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  )
) THEN 'ok' ELSE 'FALHOU' END;
