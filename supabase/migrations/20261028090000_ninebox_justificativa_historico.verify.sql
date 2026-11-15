-- Sidecar de 20261028090000_ninebox_justificativa_historico.sql — so leitura.
-- Prova: §1 audit_log com justificativa/status_anterior/status_posterior (text,
-- comentadas); §2 logica da conclusao preservada em finalizar_feedback_base, sem
-- EXECUTE para PUBLIC/anon/authenticated, e finalizar_feedback virado wrapper
-- fino que publica motivo/acao em GUC local e delega na base; §3 trigger BEFORE
-- INSERT ROW trg_audit_log_enriquecer_feedback na audit_log; §4
-- listar_historico_feedback(uuid) STABLE SECDEF, 10 colunas, tenant +
-- RH/gestor/avaliador, EXECUTE so authenticated. Nada posterior supersede.

-- 1) §1 audit_log ganhou as tres colunas text, nulavel, e cada uma esta
--    documentada com COMMENT (a migration comenta as tres).
SELECT 'ok' WHERE (
  (SELECT count(*)
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_log'
      AND column_name IN ('justificativa', 'status_anterior', 'status_posterior')
      AND data_type = 'text'
      AND is_nullable = 'YES') = 3
  AND (SELECT count(*)
         FROM pg_attribute a
        WHERE a.attrelid = 'public.audit_log'::regclass
          AND a.attname IN ('justificativa', 'status_anterior', 'status_posterior')
          AND NOT a.attisdropped
          AND col_description(a.attrelid, a.attnum) IS NOT NULL) = 3
);

-- 2) §2 a logica homologada vive em finalizar_feedback_base(uuid,text,text,text):
--    plpgsql SECURITY DEFINER com search_path fixo, carregando a autorizacao por
--    registro (pode_finalizar_feedback), e sem EXECUTE para PUBLIC, anon ou
--    authenticated — chamada direta nao pode contornar a gravacao do motivo.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'finalizar_feedback_base'
       AND pg_get_function_identity_arguments(p.oid)
           = 'p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text'
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%pode_finalizar_feedback%'
       AND p.proacl IS NOT NULL
       AND NOT EXISTS (
             SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.privilege_type = 'EXECUTE'
                AND (a.grantee = 0
                     OR a.grantee = 'anon'::regrole
                     OR a.grantee = 'authenticated'::regrole))
  )
);

-- 3) §2 finalizar_feedback(uuid,text,text,text) passou a ser WRAPPER: publica
--    ninebox.feedback_motivo e ninebox.feedback_acao via set_config local e
--    delega em finalizar_feedback_base, sem reescrever a regra (a autorizacao
--    por registro continua na base); tem COMMENT e EXECUTE so para
--    authenticated, nunca PUBLIC/anon.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'finalizar_feedback'
       AND pg_get_function_identity_arguments(p.oid)
           = 'p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text'
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%set_config%'
       AND p.prosrc LIKE '%ninebox.feedback_motivo%'
       AND p.prosrc LIKE '%ninebox.feedback_acao%'
       AND p.prosrc LIKE '%finalizar_feedback_base%'
       AND p.prosrc NOT LIKE '%pode_finalizar_feedback%'
       AND obj_description(p.oid, 'pg_proc') IS NOT NULL
       AND p.proacl IS NOT NULL
       AND EXISTS (
             SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.privilege_type = 'EXECUTE'
                AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (
             SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.privilege_type = 'EXECUTE'
                AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);

-- 4) §3 tg_audit_log_enriquecer_feedback(): funcao de trigger plpgsql SECURITY
--    DEFINER com search_path fixo, que le as duas GUCs locais, preenche
--    status_anterior/status_posterior a partir do payload e copia a
--    justificativa de feedbacks_360_aprovacoes_gestor.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'tg_audit_log_enriquecer_feedback'
       AND pg_get_function_identity_arguments(p.oid) = ''
       AND p.prorettype = 'trigger'::regtype
       AND l.lanname = 'plpgsql'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND p.prosrc LIKE '%current_setting%'
       AND p.prosrc LIKE '%ninebox.feedback_motivo%'
       AND p.prosrc LIKE '%ninebox.feedback_acao%'
       AND p.prosrc LIKE '%status_anterior%'
       AND p.prosrc LIKE '%status_posterior%'
       AND p.prosrc LIKE '%justificativa%'
       AND p.prosrc LIKE '%feedbacks_360_aprovacoes_gestor%'
  )
);

-- 5) §3 trigger trg_audit_log_enriquecer_feedback: BEFORE INSERT FOR EACH ROW em
--    public.audit_log, habilitado e ligado aquela funcao (unico com esse nome).
SELECT 'ok' WHERE (
  (SELECT count(*)
     FROM pg_trigger t
     JOIN pg_proc p ON p.oid = t.tgfoid
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE t.tgrelid = 'public.audit_log'::regclass
      AND t.tgname = 'trg_audit_log_enriquecer_feedback'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
      AND (t.tgtype & 1) = 1
      AND (t.tgtype & 2) = 2
      AND (t.tgtype & 4) = 4
      AND n.nspname = 'public'
      AND p.proname = 'tg_audit_log_enriquecer_feedback') = 1
);

-- 6) §4 listar_historico_feedback(uuid): plpgsql STABLE SECURITY DEFINER com
--    search_path fixo e a assinatura de saida exata das 10 colunas do historico.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname = 'listar_historico_feedback'
       AND pg_get_function_identity_arguments(p.oid) = 'p_feedback_id uuid'
       AND l.lanname = 'plpgsql'
       AND p.provolatile = 's'
       AND p.proretset
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']
       AND pg_get_function_result(p.oid)
           = 'TABLE(id uuid, tipo text, ocorrido_em timestamp with time zone, responsavel_id uuid, responsavel_email text, responsavel_nome text, justificativa text, status_anterior text, status_posterior text, detalhes jsonb)'
  )
);

-- 7) §4 autorizacao e fontes do historico: exige sessao autenticada, recorta por
--    get_user_empresas, aceita so RH/admin (pode_gerir_avaliacoes), gestor
--    responsavel (pode_aprovar_colaborador) ou avaliador designado, recusando
--    com perfil_nao_autorizado; une audit_log, feedbacks_360_consolidacoes e
--    feedbacks_360_aprovacoes_gestor e rotula encaminhado/reaberto.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'listar_historico_feedback'
       AND pg_get_function_identity_arguments(p.oid) = 'p_feedback_id uuid'
       AND p.prosrc LIKE '%nao_autenticado%'
       AND p.prosrc LIKE '%get_user_empresas%'
       AND p.prosrc LIKE '%nao_autorizado%'
       AND p.prosrc LIKE '%pode_gerir_avaliacoes%'
       AND p.prosrc LIKE '%pode_aprovar_colaborador%'
       AND p.prosrc LIKE '%avaliador_id%'
       AND p.prosrc LIKE '%perfil_nao_autorizado%'
       AND p.prosrc LIKE '%audit_log%'
       AND p.prosrc LIKE '%feedbacks_360_consolidacoes%'
       AND p.prosrc LIKE '%feedbacks_360_aprovacoes_gestor%'
       AND p.prosrc LIKE '%colaborador_id%'
       AND p.prosrc LIKE '%ciclo_id%'
       AND p.prosrc LIKE '%aguardando_gestor%'
       AND p.prosrc LIKE '%reaberto%'
  )
);

-- 8) §4 grants do historico: COMMENT presente e EXECUTE somente para
--    authenticated — nunca PUBLIC nem anon.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'listar_historico_feedback'
       AND pg_get_function_identity_arguments(p.oid) = 'p_feedback_id uuid'
       AND obj_description(p.oid, 'pg_proc') IS NOT NULL
       AND p.proacl IS NOT NULL
       AND EXISTS (
             SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.privilege_type = 'EXECUTE'
                AND a.grantee = 'authenticated'::regrole)
       AND NOT EXISTS (
             SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.privilege_type = 'EXECUTE'
                AND (a.grantee = 0 OR a.grantee = 'anon'::regrole))
  )
);
