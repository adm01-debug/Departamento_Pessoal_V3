-- Verifica que a policy de leitura de feedbacks_360 passou a cobrir o gestor
-- supervisor e o avaliador designado, mantendo o recorte por empresa.
-- Reprova se a policy voltar a exigir somente pode_gerir_avaliacoes().
SELECT CASE WHEN (
  -- RLS ligada e a policy de SELECT existe, unica
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360') IS TRUE
  AND (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
          AND p.polname = 'feedbacks_360_select' AND p.polcmd = 'r') = 1
) THEN 'ok' ELSE 'FALHOU' END;

-- A policy vale SOMENTE para `authenticated`. Sem esta assercao, um CREATE
-- POLICY sem clausula TO nasceria TO public (incluindo `anon`) e passaria.
SELECT CASE WHEN (
  SELECT p.roles::text = '{authenticated}'
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'feedbacks_360'
     AND p.policyname = 'feedbacks_360_select'
) THEN 'ok' ELSE 'FALHOU' END;

-- Os tres ramos de autorizacao e o recorte por empresa estao na expressao
SELECT CASE WHEN (
  SELECT pg_get_expr(p.polqual, p.polrelid) LIKE '%get_user_empresas%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_gerir_avaliacoes%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_aprovar_colaborador%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%avaliador_id%'
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
     AND p.polname = 'feedbacks_360_select'
) THEN 'ok' ELSE 'FALHOU' END;

-- As duas funcoes de autorizacao seguem SECURITY DEFINER com search_path fixo
SELECT CASE WHEN (
  SELECT count(*) = 2
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('pode_gerir_avaliacoes', 'pode_aprovar_colaborador')
     AND p.prosecdef IS TRUE
     AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
) THEN 'ok' ELSE 'FALHOU' END;
