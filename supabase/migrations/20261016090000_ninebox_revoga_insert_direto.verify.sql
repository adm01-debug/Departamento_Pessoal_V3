-- Verifica a ETAPA 2 da criacao segura do Nine-Box: que a gravacao em
-- public.feedbacks_360 so pode acontecer pela RPC public.criar_feedback_seguro.
-- Prova (a) a pre-condicao: a RPC existe na assinatura exata, e SECURITY DEFINER
-- e tem search_path fixado; (b) que nenhum privilegio de INSERT restou para
-- authenticated/anon/PUBLIC, mas o SELECT das telas continua valendo;
-- (c) que a policy "feedbacks_360_insert" caiu, com RLS ligada e a de SELECT
-- intacta; (d) que o comentario da tabela registra a regra.

-- (a) Pre-condicao do bloco 1) da migration: RPC de criacao presente e segura.
SELECT CASE WHEN (
  (SELECT COUNT(*) FROM pg_proc p
     WHERE p.oid = to_regprocedure(
             'public.criar_feedback_seguro(uuid, uuid, uuid, text, numeric, numeric, uuid, text, text, text, text)')
       AND p.prosecdef IS TRUE
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=%') = 1
) THEN 'ok' ELSE 'FALHOU' END;

-- (b) Bloco 2) da migration: INSERT revogado dos papeis de aplicacao; SELECT mantido.
SELECT CASE WHEN (
  has_table_privilege('authenticated', 'public.feedbacks_360', 'INSERT') IS FALSE
  AND has_table_privilege('anon', 'public.feedbacks_360', 'INSERT') IS FALSE
  AND (SELECT COUNT(*) FROM information_schema.role_table_grants
         WHERE table_schema = 'public'
           AND table_name = 'feedbacks_360'
           AND privilege_type = 'INSERT'
           AND upper(grantee) IN ('AUTHENTICATED', 'ANON', 'PUBLIC')) = 0
  AND has_table_privilege('authenticated', 'public.feedbacks_360', 'SELECT') IS TRUE
) THEN 'ok' ELSE 'FALHOU' END;

-- (c) Bloco 2)/3) da migration: nenhuma policy de INSERT, RLS ligada, SELECT preservada.
SELECT CASE WHEN (
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360') IS TRUE
  AND (SELECT COUNT(*) FROM pg_policy pol
         JOIN pg_class c ON c.oid = pol.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
          AND (pol.polcmd = 'a' OR pol.polname = 'feedbacks_360_insert')) = 0
  AND (SELECT COUNT(*) FROM pg_policy pol
         JOIN pg_class c ON c.oid = pol.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
          AND pol.polcmd = 'r') >= 1
) THEN 'ok' ELSE 'FALHOU' END;

-- (d) Bloco 4) da migration: comentario da tabela com a regra de criacao.
SELECT CASE WHEN (
  obj_description('public.feedbacks_360'::regclass, 'pg_class') =
  'Criacao EXCLUSIVAMENTE pela RPC public.criar_feedback_seguro (feedback + auditoria na mesma transacao). INSERT direto revogado; correcao por CANCELAMENTO auditado, nunca DELETE.'
) THEN 'ok' ELSE 'FALHOU' END;
