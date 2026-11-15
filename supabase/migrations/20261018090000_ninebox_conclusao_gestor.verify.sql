-- Sidecar de 20261018090000_ninebox_conclusao_gestor.sql
-- Prova o ESTADO-ALVO desta migration (conclusao da avaliacao = gestor responsavel):
--   1. `finalizar_feedback(uuid,text,text,text)` existe em plpgsql, retorna jsonb,
--      e SECURITY DEFINER com search_path fixado em `public, pg_temp`;
--   2. exposicao inalterada da RPC: EXECUTE para `authenticated`, nunca para
--      `anon` nem para `PUBLIC`;
--   3. a autorizacao da CONCLUSAO alcanca `pode_aprovar_colaborador` (gestor
--      responsavel) enquanto o caminho administrativo segue em
--      `pode_gerir_avaliacoes`, recusando com `perfil_nao_autorizado`;
--   4. `feedbacks_360` sem UPDATE/DELETE para `authenticated` e sem DELETE para
--      `anon` (revogacoes reafirmadas por esta migration);
--   5. `feedbacks_360` sem UPDATE e sem INSERT para `anon` (revogacoes exclusivas
--      desta migration, linhas 256-257).
-- SUPERSESSAO: o corpo de `finalizar_feedback` e reescrito por 20261022090000 e
-- 20261027090000 (a conclusao passa a delegar a `pode_finalizar_feedback`) e
-- 20261028090000 renomeia a logica para `finalizar_feedback_base`, deixando um
-- wrapper com o nome antigo. Por isso o assert 3 verifica a INVARIANTE da cadeia
-- (finalizar_feedback + finalizar_feedback_base + pode_finalizar_feedback), e nao
-- o texto do corpo. Tambem por supersessao NAO se asserta `versao_avaliacao` na
-- trilha: 20261022090000 removeu esse campo da auditoria de `finalizar_feedback`.

-- 1 · frame da RPC reescrita: assinatura, retorno, linguagem, SECURITY DEFINER, search_path
SELECT CASE WHEN (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'finalizar_feedback'
       AND pg_get_function_identity_arguments(p.oid)
             = 'p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text'
       AND pg_get_function_result(p.oid) = 'jsonb'
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
  )
) THEN 'ok' ELSE 'FALHOU' END;

-- 2 · exposicao: `authenticated` executa; `anon` e `PUBLIC` nao
SELECT CASE WHEN (
  has_function_privilege('authenticated', 'public.finalizar_feedback(uuid,text,text,text)', 'execute')
  AND NOT has_function_privilege('anon', 'public.finalizar_feedback(uuid,text,text,text)', 'execute')
  AND NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace,
           aclexplode(p.proacl) a
     WHERE n.nspname = 'public'
       AND p.oid = 'public.finalizar_feedback(uuid,text,text,text)'::regprocedure
       AND a.grantee = 0            -- 0 = PUBLIC (pseudo-papel)
       AND a.privilege_type = 'EXECUTE'
  )
) THEN 'ok' ELSE 'FALHOU' END;

-- 3 · conclusao = gestor responsavel: a cadeia de autorizacao alcanca
--     `pode_aprovar_colaborador`, mantem `pode_gerir_avaliacoes` no caminho
--     administrativo e recusa com `perfil_nao_autorizado`
SELECT CASE WHEN (
  to_regprocedure('public.pode_aprovar_colaborador(uuid)') IS NOT NULL
  AND (
    SELECT coalesce(string_agg(p.prosrc, E'\n'), '')
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('finalizar_feedback', 'finalizar_feedback_base', 'pode_finalizar_feedback')
  ) LIKE '%pode_aprovar_colaborador%'
  AND (
    SELECT coalesce(string_agg(p.prosrc, E'\n'), '')
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('finalizar_feedback', 'finalizar_feedback_base', 'pode_finalizar_feedback')
  ) LIKE '%pode_gerir_avaliacoes%'
  AND (
    SELECT coalesce(string_agg(p.prosrc, E'\n'), '')
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('finalizar_feedback', 'finalizar_feedback_base', 'pode_finalizar_feedback')
  ) LIKE '%perfil_nao_autorizado%'
) THEN 'ok' ELSE 'FALHOU' END;

-- 4 · nenhuma escrita direta reafirmada: `authenticated` sem UPDATE/DELETE,
--     `anon` sem DELETE em feedbacks_360 (o caminho e a RPC SECURITY DEFINER)
SELECT CASE WHEN (
  NOT has_table_privilege('authenticated', 'public.feedbacks_360', 'update')
  AND NOT has_table_privilege('authenticated', 'public.feedbacks_360', 'delete')
  AND NOT has_table_privilege('anon', 'public.feedbacks_360', 'delete')
) THEN 'ok' ELSE 'FALHOU' END;

-- 5 · revogacoes novas desta migration: `anon` sem UPDATE e sem INSERT em feedbacks_360
SELECT CASE WHEN (
  NOT has_table_privilege('anon', 'public.feedbacks_360', 'update')
  AND NOT has_table_privilege('anon', 'public.feedbacks_360', 'insert')
) THEN 'ok' ELSE 'FALHOU' END;
