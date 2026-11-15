-- Sidecar de 20261027090000_ninebox_reconciliacao_incremental.sql
-- Prova o estado-alvo ADITIVO desta migration (nada aqui escreve):
--   §1 helper public.pode_finalizar_feedback(uuid) + a versao AUTORIZADA da
--      logica de finalizar_feedback (autorizacao por registro, escala 1-5 da
--      nota, potencial obrigatorio so para 'gestor');
--   §2 rotulo 'editar_feedback' no CHECK de feedbacks_360_operacoes,
--      pode_editar_colaborador/pode_editar_feedback e editar_feedback_seguro
--      (11 args) com maquina de estados e grants so para authenticated;
--   §3 policies ciclos_avaliacao_insert/delete exigindo empresa +
--      pode_gerir_avaliacoes, e o trigger BEFORE DELETE que bloqueia exclusao
--      de ciclo com dependencias.
-- SUPERSESSAO: 20261028090000 renomeia finalizar_feedback -> finalizar_feedback_base
-- e poe um wrapper no nome original; por isso o assert 2 aceita a logica sob
-- qualquer um dos dois nomes com a mesma assinatura (invariante, nao o literal).

-- 1) §1 helper pode_finalizar_feedback(uuid): SQL stable SECURITY DEFINER com
--    search_path fixo, autorizando RH/admin, avaliador designado ou gestor, e
--    executavel apenas por authenticated.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'pode_finalizar_feedback'
       AND pg_get_function_identity_arguments(p.oid) = 'p_feedback_id uuid'
       AND p.prorettype = 'boolean'::regtype
       AND l.lanname = 'sql'
       AND p.provolatile = 's'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%pode_gerir_avaliacoes%'
       AND p.prosrc LIKE '%pode_aprovar_colaborador%'
       AND p.prosrc LIKE '%get_user_empresas%'
       AND p.proacl IS NOT NULL
       AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                    WHERE a.privilege_type = 'EXECUTE' AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                        WHERE a.privilege_type = 'EXECUTE'
                          AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 2) §1 logica autorizada da conclusao: a funcao (uuid,text,text,text) que
--    carrega a regra chama pode_finalizar_feedback e valida categoria, escala
--    1-5 da nota e potencial obrigatorio para gestor. Aceita o nome original
--    OU finalizar_feedback_base (renomeado por 20261028090000).
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname IN ('finalizar_feedback', 'finalizar_feedback_base')
       AND pg_get_function_identity_arguments(p.oid)
           = 'p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text'
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%pode_finalizar_feedback%'
       AND p.prosrc LIKE '%categoria_invalida%'
       AND p.prosrc LIKE '%nota_desempenho_fora_da_escala%'
       AND p.prosrc LIKE '%potencial_obrigatorio_para_gestor%'
       AND p.prosrc LIKE '%for update%'
  )
);

-- 3) §1 porta de entrada finalizar_feedback(uuid,text,text,text): SECURITY
--    DEFINER com search_path fixo e EXECUTE so para authenticated (nunca
--    PUBLIC/anon).
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'finalizar_feedback'
       AND pg_get_function_identity_arguments(p.oid)
           = 'p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.proacl IS NOT NULL
       AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                    WHERE a.privilege_type = 'EXECUTE' AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                        WHERE a.privilege_type = 'EXECUTE'
                          AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 4) §2 CHECK de feedbacks_360_operacoes: um unico check sobre `operacao`, com
--    o nome canonico e os 8 rotulos, incluindo o novo 'editar_feedback'.
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.feedbacks_360_operacoes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%operacao%') = 1
  AND EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.feedbacks_360_operacoes'::regclass
       AND contype = 'c'
       AND conname = 'feedbacks_360_operacoes_operacao_check'
       AND pg_get_constraintdef(oid) LIKE '%''editar_feedback''%'
       AND pg_get_constraintdef(oid) LIKE '%''concluir''%'
       AND pg_get_constraintdef(oid) LIKE '%''cancelar''%'
       AND pg_get_constraintdef(oid) LIKE '%''reabrir''%'
       AND pg_get_constraintdef(oid) LIKE '%''validar_potencial''%'
       AND pg_get_constraintdef(oid) LIKE '%''criar''%'
       AND pg_get_constraintdef(oid) LIKE '%''decidir_aprovacao_gestor''%'
       AND pg_get_constraintdef(oid) LIKE '%''enviar_avaliacao_ao_gestor''%'
  )
);

-- 5) §2 pode_editar_colaborador(uuid): SQL stable SECURITY DEFINER, decide por
--    papel 'gestor' em user_roles, responsabilidade via supervisor_id OU
--    excecao vigente em ninebox_permissoes_homologacao, recortado por empresa;
--    EXECUTE so para authenticated.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'pode_editar_colaborador'
       AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid'
       AND p.prorettype = 'boolean'::regtype
       AND l.lanname = 'sql'
       AND p.provolatile = 's'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%get_user_empresas%'
       AND p.prosrc LIKE '%pode_gerir_avaliacoes%'
       AND p.prosrc LIKE '%user_roles%'
       AND p.prosrc LIKE '%supervisor_id%'
       AND p.prosrc LIKE '%ninebox_permissoes_homologacao%'
       AND p.prosrc LIKE '%habilitado%'
       AND p.prosrc LIKE '%expira_em%'
       AND obj_description(p.oid, 'pg_proc') IS NOT NULL
       AND p.proacl IS NOT NULL
       AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                    WHERE a.privilege_type = 'EXECUTE' AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                        WHERE a.privilege_type = 'EXECUTE'
                          AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 6) §2 pode_editar_feedback(uuid): delega em pode_editar_colaborador e exige a
--    empresa do proprio feedback; EXECUTE so para authenticated.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'pode_editar_feedback'
       AND pg_get_function_identity_arguments(p.oid) = 'p_feedback_id uuid'
       AND p.prorettype = 'boolean'::regtype
       AND l.lanname = 'sql'
       AND p.provolatile = 's'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%pode_editar_colaborador%'
       AND p.prosrc LIKE '%get_user_empresas%'
       AND obj_description(p.oid, 'pg_proc') IS NOT NULL
       AND p.proacl IS NOT NULL
       AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                    WHERE a.privilege_type = 'EXECUTE' AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                        WHERE a.privilege_type = 'EXECUTE'
                          AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 7) §2 editar_feedback_seguro: assinatura de 11 argumentos, plpgsql SECURITY
--    DEFINER com search_path fixo, autorizacao por registro, bloqueio de edicao
--    de feedback cancelado, recusa de avaliado fora da responsabilidade e
--    registro idempotente sob a operacao 'editar_feedback'; EXECUTE so para
--    authenticated.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'editar_feedback_seguro'
       AND pg_get_function_identity_arguments(p.oid)
           = 'p_feedback_id uuid, p_avaliado_id uuid, p_avaliador_id uuid, p_ciclo_id uuid, p_tipo text, p_nota numeric, p_potencial numeric, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text'
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%pode_editar_feedback%'
       AND p.prosrc LIKE '%feedback_cancelado_nao_editavel%'
       AND p.prosrc LIKE '%avaliado_fora_da_responsabilidade%'
       AND p.prosrc LIKE '%''editar_feedback''%'
       AND p.prosrc LIKE '%for update%'
       AND p.prosrc LIKE '%audit_log%'
       AND obj_description(p.oid, 'pg_proc') IS NOT NULL
       AND p.proacl IS NOT NULL
       AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                    WHERE a.privilege_type = 'EXECUTE' AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                        WHERE a.privilege_type = 'EXECUTE'
                          AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 8) §3 policy ciclos_avaliacao_insert: INSERT para authenticated, WITH CHECK
--    exigindo empresa do usuario E pode_gerir_avaliacoes().
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_policy pol
     WHERE pol.polrelid = 'public.ciclos_avaliacao'::regclass
       AND pol.polname = 'ciclos_avaliacao_insert'
       AND pol.polcmd = 'a'
       AND pol.polpermissive
       AND pol.polroles = ARRAY['authenticated'::regrole::oid]
       AND pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%get_user_empresas%'
       AND pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%pode_gerir_avaliacoes%'
  )
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ciclos_avaliacao'::regclass)
);

-- 9) §3 policy ciclos_avaliacao_delete: DELETE para authenticated, USING
--    exigindo empresa do usuario E pode_gerir_avaliacoes().
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_policy pol
     WHERE pol.polrelid = 'public.ciclos_avaliacao'::regclass
       AND pol.polname = 'ciclos_avaliacao_delete'
       AND pol.polcmd = 'd'
       AND pol.polpermissive
       AND pol.polroles = ARRAY['authenticated'::regrole::oid]
       AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%get_user_empresas%'
       AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%pode_gerir_avaliacoes%'
  )
);

-- 10) §3 bloquear_exclusao_ciclo_com_dependencias(): funcao de trigger plpgsql
--     SECURITY DEFINER com search_path fixo, que conta as seis dependencias do
--     ciclo (feedbacks, consolidacoes, aprovacoes, validacoes, metas e trilha)
--     e recusa com 'ciclo_com_dependencias'; sem EXECUTE para PUBLIC/anon.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'bloquear_exclusao_ciclo_com_dependencias'
       AND pg_get_function_identity_arguments(p.oid) = ''
       AND p.prorettype = 'trigger'::regtype
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%ciclo_com_dependencias%'
       AND p.prosrc LIKE '%feedbacks_360%'
       AND p.prosrc LIKE '%feedbacks_360_consolidacoes%'
       AND p.prosrc LIKE '%feedbacks_360_aprovacoes_gestor%'
       AND p.prosrc LIKE '%feedbacks_360_validacoes_potencial%'
       AND p.prosrc LIKE '%metas_okrs%'
       AND p.prosrc LIKE '%audit_log%'
       AND p.proacl IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                        WHERE a.privilege_type = 'EXECUTE'
                          AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 11) §3 trigger ciclos_bloqueio_exclusao_com_dependencias: BEFORE DELETE FOR
--     EACH ROW em ciclos_avaliacao, habilitado e ligado aquela funcao.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE t.tgrelid = 'public.ciclos_avaliacao'::regclass
       AND t.tgname = 'ciclos_bloqueio_exclusao_com_dependencias'
       AND NOT t.tgisinternal
       AND t.tgenabled = 'O'
       AND (t.tgtype & 1) = 1
       AND (t.tgtype & 2) = 2
       AND (t.tgtype & 8) = 8
       AND n.nspname = 'public'
       AND p.proname = 'bloquear_exclusao_ciclo_com_dependencias'
  )
);
