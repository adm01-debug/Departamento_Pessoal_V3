-- Prova o estado-alvo de 20261022090000 (NineBox / conclusao do feedback pelo
-- responsavel autorizado):
--   1-4) o helper public.pode_finalizar_feedback(uuid) existe como SQL STABLE
--        SECURITY DEFINER com search_path fixo, com os TRES ramos de
--        autorizacao (RH/admin, avaliador designado, gestor responsavel), com o
--        comentario oficial e executavel so por authenticated;
--   5-7) a logica de conclusao passa a chamar esse helper ANTES da chave de
--        idempotencia, e a RPC publica segue SECURITY DEFINER so para
--        authenticated;
--   8-10) o caminho direto de escrita morreu: policy feedbacks_360_update
--        removida, UPDATE revogado de authenticated e TRUNCATE inefetivo para
--        anon, authenticated e PUBLIC.
-- Supersessao tratada: 20261028090000 renomeia finalizar_feedback para
-- finalizar_feedback_base e deixa um wrapper no nome antigo, portanto os
-- asserts de corpo aceitam QUALQUER um dos dois nomes com a assinatura de 4
-- argumentos, em vez de fixar o corpo de um nome so.

-- 1) Helper de autorizacao da conclusao existe com a forma exigida
SELECT CASE WHEN (
  SELECT count(*) = 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
   WHERE n.nspname = 'public'
     AND p.proname = 'pode_finalizar_feedback'
     AND pg_get_function_arguments(p.oid) = 'p_feedback_id uuid'
     AND pg_get_function_result(p.oid) = 'boolean'
     AND l.lanname = 'sql'
     AND p.provolatile = 's'
     AND p.prosecdef IS TRUE
     AND p.proconfig @> ARRAY['search_path=public, pg_temp']
) THEN 'ok' ELSE 'FALHOU' END;

-- 2) Os TRES ramos de autorizacao estao no corpo do helper: RH/admin,
--    avaliador designado (colaboradores.user_id = auth.uid()) e gestor
--    responsavel/excecao sobre o avaliado, todos recortados por empresa
SELECT CASE WHEN COALESCE((
  SELECT p.prosrc LIKE '%pode_gerir_avaliacoes%'
     AND p.prosrc LIKE '%public.feedbacks_360 f%'
     AND p.prosrc LIKE '%c.user_id = auth.uid()%'
     AND p.prosrc LIKE '%f.avaliador_id%'
     AND p.prosrc LIKE '%pode_aprovar_colaborador(f.avaliado_id)%'
     AND p.prosrc LIKE '%get_user_empresas(auth.uid())%'
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'pode_finalizar_feedback'
     AND pg_get_function_arguments(p.oid) = 'p_feedback_id uuid'
), FALSE) THEN 'ok' ELSE 'FALHOU' END;

-- 3) Comentario oficial do helper (nenhuma migration irma posterior o altera)
SELECT CASE WHEN COALESCE((
  obj_description('public.pode_finalizar_feedback(uuid)'::regprocedure, 'pg_proc')
  = 'Autoriza a conclusao do feedback por RH/admin, avaliador designado ou gestor responsavel/excecao; nao depende do tipo nem de supervisor_id para o avaliador.'
), FALSE) THEN 'ok' ELSE 'FALHOU' END;

-- 4) Helper executavel por authenticated; fechado para anon e para PUBLIC
SELECT CASE WHEN (
  has_function_privilege('authenticated', 'public.pode_finalizar_feedback(uuid)', 'EXECUTE') IS TRUE
  AND has_function_privilege('anon', 'public.pode_finalizar_feedback(uuid)', 'EXECUTE') IS FALSE
  AND (SELECT count(*)
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace,
              aclexplode(p.proacl) a
        WHERE n.nspname = 'public'
          AND p.proname = 'pode_finalizar_feedback'
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE') = 0
) THEN 'ok' ELSE 'FALHOU' END;

-- 5) A logica de conclusao (finalizar_feedback ou finalizar_feedback_base, apos
--    a renomeacao de 20261028090000) chama o helper e guarda as checagens de
--    conclusao por categoria
SELECT CASE WHEN (
  SELECT count(*) = 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('finalizar_feedback', 'finalizar_feedback_base')
     AND pg_get_function_identity_arguments(p.oid) LIKE '%uuid, %text, %text, %text'
     AND p.prosecdef IS TRUE
     AND p.proconfig @> ARRAY['search_path=public, pg_temp']
     AND p.prosrc LIKE '%pode_finalizar_feedback(p_feedback_id)%'
     AND p.prosrc LIKE '%perfil_nao_autorizado%'
     AND p.prosrc LIKE '%categoria_invalida%'
) THEN 'ok' ELSE 'FALHOU' END;

-- 6) ORDEM obrigatoria: a autorizacao do registro vem ANTES da consulta da
--    chave de idempotencia (senao o reenvio seria porta lateral entre tenants)
SELECT CASE WHEN COALESCE((
  SELECT position('pode_finalizar_feedback' in p.prosrc) > 0
     AND position('idempotency_key' in p.prosrc) > 0
     AND position('pode_finalizar_feedback' in p.prosrc) < position('idempotency_key' in p.prosrc)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('finalizar_feedback', 'finalizar_feedback_base')
     AND p.prosrc LIKE '%pode_finalizar_feedback(p_feedback_id)%'
), FALSE) THEN 'ok' ELSE 'FALHOU' END;

-- 7) RPC publica finalizar_feedback(uuid,text,text,text): SECURITY DEFINER com
--    search_path fixo, executavel so por authenticated
SELECT CASE WHEN (
  COALESCE((SELECT p.prosecdef IS TRUE AND p.proconfig @> ARRAY['search_path=public, pg_temp']
     FROM pg_proc p
    WHERE p.oid = 'public.finalizar_feedback(uuid,text,text,text)'::regprocedure), FALSE)
  AND has_function_privilege('authenticated', 'public.finalizar_feedback(uuid,text,text,text)', 'EXECUTE') IS TRUE
  AND has_function_privilege('anon', 'public.finalizar_feedback(uuid,text,text,text)', 'EXECUTE') IS FALSE
  AND (SELECT count(*)
         FROM pg_proc p, aclexplode(p.proacl) a
        WHERE p.oid = 'public.finalizar_feedback(uuid,text,text,text)'::regprocedure
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE') = 0
) THEN 'ok' ELSE 'FALHOU' END;

-- 8) A policy de UPDATE direto foi removida e nao voltou; RLS segue ligada
SELECT CASE WHEN (
  (SELECT c.relrowsecurity
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360') IS TRUE
  AND (SELECT count(*)
         FROM pg_policy p
        WHERE p.polrelid = 'public.feedbacks_360'::regclass
          AND p.polname = 'feedbacks_360_update') = 0
  AND (SELECT count(*)
         FROM pg_policy p
        WHERE p.polrelid = 'public.feedbacks_360'::regclass
          AND p.polcmd = 'w') = 0
) THEN 'ok' ELSE 'FALHOU' END;

-- 9) UPDATE em feedbacks_360 revogado de authenticated (a RPC e o unico caminho)
SELECT CASE WHEN (
  has_table_privilege('authenticated', 'public.feedbacks_360', 'UPDATE') IS FALSE
) THEN 'ok' ELSE 'FALHOU' END;

-- 10) TRUNCATE inefetivo para anon, authenticated e PUBLIC
SELECT CASE WHEN (
  has_table_privilege('anon', 'public.feedbacks_360', 'TRUNCATE') IS FALSE
  AND has_table_privilege('authenticated', 'public.feedbacks_360', 'TRUNCATE') IS FALSE
  AND (SELECT count(*)
         FROM aclexplode((SELECT c.relacl FROM pg_class c WHERE c.oid = 'public.feedbacks_360'::regclass)) a
        WHERE a.grantee = 0
          AND a.privilege_type = 'TRUNCATE') = 0
) THEN 'ok' ELSE 'FALHOU' END;
