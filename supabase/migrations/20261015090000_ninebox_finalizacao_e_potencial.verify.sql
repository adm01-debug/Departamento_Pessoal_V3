-- Verifica o estado FINAL de schema da migration de finalizacao de feedbacks 360 +
-- validacao de Potencial pelo RH: as 7 funcoes do modulo (3 RPCs, 2 helpers de papel,
-- a versao canonica e o trigger de revisao) com SECURITY DEFINER/INVOKER correto e
-- search_path fixado; a coluna feedbacks_360.revisao e o trigger BEFORE UPDATE que a
-- incrementa; a view de versao com security_invoker; as 2 tabelas de apoio com RLS,
-- policies por papel + empresa, FKs ON DELETE RESTRICT, CHECKs e indice; e o
-- endurecimento de privilegios (UPDATE/DELETE/TRUNCATE fechados em feedbacks_360,
-- anon sem nada, authenticated com o minimo).

-- 1) As 7 funcoes existem com a classe de seguranca certa e search_path fixado.
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('tg_feedbacks_360_revisao','versao_avaliacao_feedback',
                         'pode_gerir_avaliacoes','pode_validar_potencial',
                         'finalizar_feedback','validar_potencial_avaliacao',
                         'criar_feedback_seguro')
       AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 7
  AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.prosecdef
           AND p.proname IN ('pode_gerir_avaliacoes','pode_validar_potencial',
                             'finalizar_feedback','validar_potencial_avaliacao',
                             'criar_feedback_seguro')) = 5
  AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND NOT p.prosecdef
           AND p.proname IN ('tg_feedbacks_360_revisao','versao_avaliacao_feedback')) = 2
);

-- 2) Assinaturas exatas das 3 RPCs (desambiguadas por identity_arguments) e
--    volatilidade STABLE dos helpers/versao canonica.
SELECT 'ok'
WHERE (
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'finalizar_feedback')
    = 'p_feedback_id uuid, p_acao text, p_motivo text, p_idempotencia text'
  AND (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'validar_potencial_avaliacao')
    = 'p_feedback_id uuid, p_idempotencia text, p_observacao text'
  AND (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'criar_feedback_seguro')
    = 'p_empresa_id uuid, p_avaliado_id uuid, p_ciclo_id uuid, p_tipo text, p_nota_geral numeric, p_potencial numeric, p_avaliador_id uuid, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text'
  AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.provolatile = 's'
           AND p.proname IN ('versao_avaliacao_feedback','pode_gerir_avaliacoes','pode_validar_potencial')) = 3
);

-- 3) Papeis dos helpers: gerir = admin|rh, validar potencial = somente rh.
SELECT 'ok'
WHERE (
  (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'pode_gerir_avaliacoes')
    LIKE '%ur.role::text in (''admin'',''rh'')%'
  AND (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'pode_validar_potencial')
    LIKE '%ur.role::text = ''rh''%'
  AND (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'pode_validar_potencial')
    NOT LIKE '%admin%'
);

-- 4) Controle de revisao: coluna monotonica + trigger BEFORE UPDATE FOR EACH ROW,
--    e a versao canonica carregando revisao e microssegundos (tgtype 19 =
--    ROW|BEFORE|UPDATE).
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'feedbacks_360'
       AND column_name = 'revisao' AND data_type = 'integer'
       AND is_nullable = 'NO' AND column_default = '0') = 1
  AND (SELECT COUNT(*) FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
          AND t.tgname = 'trg_feedbacks_360_revisao'
          AND p.proname = 'tg_feedbacks_360_revisao'
          AND t.tgtype = 19 AND t.tgenabled = 'O') = 1
  AND (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'tg_feedbacks_360_revisao')
    LIKE '%coalesce(old.revisao, 0) + 1%'
  AND (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'versao_avaliacao_feedback')
    LIKE '%f.revisao%'
  AND (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'versao_avaliacao_feedback')
    LIKE '%YYYY-MM-DD"T"HH24:MI:SS.US%'
);

-- 5) View de leitura da versao: security_invoker = true, 10 colunas do contrato e
--    delega o calculo para a funcao canonica (o app nunca recalcula).
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'vw_feedbacks_360_versao'
       AND c.relkind = 'v' AND c.reloptions @> ARRAY['security_invoker=true']) = 1
  AND (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'vw_feedbacks_360_versao'
           AND column_name IN ('feedback_id','empresa_id','ciclo_id','avaliado_id',
                               'avaliador_id','tipo','status','potencial',
                               'updated_at','versao_avaliacao')) = 10
  AND pg_get_viewdef('public.vw_feedbacks_360_versao'::regclass) LIKE '%versao_avaliacao_feedback%'
);

-- 6) Tabelas de apoio criadas com as colunas e tipos do contrato.
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'feedbacks_360_operacoes'
       AND (column_name, data_type, is_nullable) IN (
         ('idempotency_key','text','NO'), ('feedback_id','uuid','NO'),
         ('empresa_id','uuid','NO'), ('operacao','text','NO'),
         ('hash_parametros','text','NO'), ('resultado','jsonb','NO'),
         ('criada_em','timestamp with time zone','NO'))) = 7
  AND (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'feedbacks_360_validacoes_potencial'
           AND (column_name, data_type, is_nullable) IN (
             ('id','uuid','NO'), ('empresa_id','uuid','NO'), ('ciclo_id','uuid','YES'),
             ('colaborador_id','uuid','NO'), ('feedback_id','uuid','NO'),
             ('versao_avaliacao','text','NO'), ('potencial_validado','numeric','NO'),
             ('validado_por','uuid','NO'), ('validado_em','timestamp with time zone','NO'),
             ('observacao','text','YES'))) = 10
  AND (SELECT numeric_precision || ',' || numeric_scale FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'feedbacks_360_validacoes_potencial'
           AND column_name = 'potencial_validado') = '4,2'
);

-- 7) Historico preservado: PKs, FKs ON DELETE RESTRICT (nao CASCADE), CHECK de
--    escala 1-5 do potencial validado, CHECK de operacao cobrindo as 5 operacoes
--    do modulo e o indice de busca da validacao vigente.
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     JOIN pg_class r ON r.oid = c.confrelid
    WHERE n.nspname = 'public' AND c.contype = 'f' AND r.relname = 'feedbacks_360'
      AND c.confdeltype = 'r'
      AND t.relname IN ('feedbacks_360_operacoes','feedbacks_360_validacoes_potencial')) = 2
  AND (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND c.contype = 'p'
          AND c.conname IN ('feedbacks_360_operacoes_pkey',
                            'feedbacks_360_validacoes_potencial_pkey')) = 2
  AND (SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'feedbacks_360_validacoes_potencial'
          AND c.conname = 'feedbacks_360_validacoes_potencial_potencial_validado_check')
      LIKE '%>= (1)::numeric%<= (5)::numeric%'
  AND (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace,
         LATERAL unnest(ARRAY['''concluir''','''cancelar''','''reabrir''',
                              '''validar_potencial''','''criar''']) AS v(op)
        WHERE n.nspname = 'public' AND t.relname = 'feedbacks_360_operacoes'
          AND c.conname = 'feedbacks_360_operacoes_operacao_check'
          AND pg_get_constraintdef(c.oid) LIKE '%' || v.op || '%') = 5
  AND (SELECT COUNT(*) FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename = 'feedbacks_360_validacoes_potencial'
           AND indexname = 'idx_fb360_validacoes_potencial'
           AND indexdef LIKE '%(feedback_id, validado_em DESC)%') = 1
);

-- 8) RLS ligada nas tabelas novas e policies de leitura exigindo PAPEL + EMPRESA.
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relrowsecurity
       AND c.relname IN ('feedbacks_360_operacoes','feedbacks_360_validacoes_potencial')) = 2
  AND (SELECT COUNT(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND p.polcmd = 'r'
          AND (c.relname, p.polname) IN (('feedbacks_360_operacoes','fbo_select'),
                                         ('feedbacks_360_validacoes_potencial','fvp_select'))
          AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_gerir_avaliacoes()%'
          AND pg_get_expr(p.polqual, p.polrelid) LIKE '%get_user_empresas(auth.uid())%') = 2
  AND (SELECT COUNT(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('feedbacks_360_operacoes','feedbacks_360_validacoes_potencial')) = 2
);

-- 9) feedbacks_360: a leitura exige PAPEL (nao so vinculo de empresa) E o recorte
--    por empresa, e NAO existe policy de UPDATE/DELETE (status so pela RPC;
--    exclusao substituida por cancelamento).
--    Assertado por invariante, nao pela expressao literal: a 20261115120000
--    amplia a leitura para o gestor supervisor e o avaliador designado, e a
--    20261016090000 derruba a policy de INSERT. Fixar o texto exato aqui faria
--    este sidecar reprovar justamente quando as migrations seguintes fossem
--    aplicadas, e contradiria o sidecar da 20261016090000.
SELECT 'ok'
WHERE (
  (SELECT pg_get_expr(p.polqual, p.polrelid) LIKE '%get_user_empresas(auth.uid())%'
      AND (pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_gerir_avaliacoes()%'
        OR pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_aprovar_colaborador%')
     FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
      AND p.polname = 'feedbacks_360_select' AND p.polcmd = 'r')
  AND (SELECT COUNT(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360'
          AND p.polcmd IN ('w','d')) = 0
);

-- 10) Privilegios de tabela: UPDATE/DELETE/TRUNCATE fechados para authenticated e
--     anon em feedbacks_360 (inclusive por grant a PUBLIC, grantee 0), anon sem
--     leitura das tabelas de apoio e da view, authenticated com o minimo necessario.
SELECT 'ok'
WHERE (
  NOT has_table_privilege('authenticated', 'public.feedbacks_360', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.feedbacks_360', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.feedbacks_360', 'TRUNCATE')
  AND NOT has_table_privilege('anon', 'public.feedbacks_360', 'DELETE')
  AND NOT has_table_privilege('anon', 'public.feedbacks_360', 'TRUNCATE')
  AND (SELECT COUNT(*) FROM aclexplode(
         (SELECT c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360')) a
        WHERE a.grantee = 0
          AND a.privilege_type IN ('TRUNCATE','DELETE','UPDATE')) = 0
  AND has_table_privilege('authenticated', 'public.feedbacks_360', 'SELECT')
  AND has_table_privilege('authenticated', 'public.feedbacks_360', 'INSERT')
  AND has_table_privilege('authenticated', 'public.feedbacks_360_operacoes', 'SELECT')
  AND has_table_privilege('authenticated', 'public.feedbacks_360_validacoes_potencial', 'SELECT')
  AND has_table_privilege('authenticated', 'public.vw_feedbacks_360_versao', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.feedbacks_360_operacoes', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.feedbacks_360_validacoes_potencial', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.vw_feedbacks_360_versao', 'SELECT')
);

-- 11) EXECUTE das funcoes: authenticated pode, anon nao (nem por grant a PUBLIC).
SELECT 'ok'
WHERE (
  has_function_privilege('authenticated', 'public.versao_avaliacao_feedback(uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.pode_gerir_avaliacoes()', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.pode_validar_potencial()', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.finalizar_feedback(uuid,text,text,text)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.validar_potencial_avaliacao(uuid,text,text)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.criar_feedback_seguro(uuid,uuid,uuid,text,numeric,numeric,uuid,text,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.versao_avaliacao_feedback(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.pode_gerir_avaliacoes()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.pode_validar_potencial()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.finalizar_feedback(uuid,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.validar_potencial_avaliacao(uuid,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.criar_feedback_seguro(uuid,uuid,uuid,text,numeric,numeric,uuid,text,text,text,text)', 'EXECUTE')
);

-- 12) Trilha por tenant: audit_log tem a coluna empresa_id (uuid) que a policy de
--     leitura da Trilha e a RPC listar_auditoria usam para recortar por empresa.
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'audit_log'
       AND column_name = 'empresa_id' AND data_type = 'uuid') = 1
);
