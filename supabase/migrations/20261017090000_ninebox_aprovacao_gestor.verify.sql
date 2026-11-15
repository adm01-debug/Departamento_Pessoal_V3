-- Sidecar de 20261017090000_ninebox_aprovacao_gestor.sql (APROVACAO DO GESTOR).
-- Prova o estado-alvo ADITIVO da migration: (1) as funcoes de vinculo
-- colaborador_id_do_usuario/pode_aprovar_colaborador; (2) as tabelas
-- feedbacks_360_consolidacoes (com versao/gestor responsavel/revisao) e
-- feedbacks_360_aprovacoes_gestor, ambas com RLS e policy so de SELECT;
-- (3) a ampliacao do CHECK de feedbacks_360_operacoes.operacao com os dois
-- rotulos novos; (4) as RPCs enviar_avaliacao_ao_gestor/situacao_aprovacao/
-- decidir_aprovacao_gestor, o par versao_consolidada_avaliacao +
-- sincronizar_consolidacao_avaliacao e o trigger de encaminhamento; (5) o gate
-- de aprovacao do gestor dentro de validar_potencial_avaliacao; (6) os
-- privilegios minimos (so authenticated executa; tabelas apenas leitura).
-- Supersessao tratada: funcoes rescritas depois (decidir_aprovacao_gestor por
-- 20261021/20261025, sincronizar por 20261021, pode_aprovar_colaborador e
-- enviar_avaliacao_ao_gestor ja divergentes em producao) sao verificadas por
-- INVARIANTE de corpo/assinatura, nunca por texto literal; o CHECK de operacao
-- e verificado por CONTINENCIA (20261020/20261027 acrescentam 'editar_feedback')
-- e o EXECUTE de authenticated em versao_consolidada_avaliacao nao e assertado
-- porque 20261028130000 o revoga de proposito.

-- 1. §0 — as duas funcoes de vinculo existem, STABLE, SECURITY DEFINER, search_path fixo
SELECT CASE WHEN (
  SELECT count(*) = 2
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND (p.proname, pg_get_function_identity_arguments(p.oid)) IN
         (('colaborador_id_do_usuario', 'p_empresa_id uuid'),
          ('pode_aprovar_colaborador',  'p_colaborador_id uuid'))
     AND p.prosecdef IS TRUE
     AND p.provolatile = 's'
     AND array_to_string(p.proconfig, ',') LIKE '%search_path=public, pg_temp%'
) THEN 'ok' ELSE 'falha: colaborador_id_do_usuario(uuid)/pode_aprovar_colaborador(uuid) ausentes ou sem secdef/stable/search_path' END;

-- 2. §0 — invariante de autorizacao de pode_aprovar_colaborador: papel gestor +
--    vinculo supervisor_id + recorte por empresa (corpo pode ter sido rescrito)
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%supervisor_id%'
     AND p.prosrc LIKE '%user_roles%'
     AND p.prosrc LIKE '%''gestor''%'
     AND p.prosrc LIKE '%empresa_id%'
     AND obj_description(p.oid, 'pg_proc') LIKE '%autoaprovacao%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pode_aprovar_colaborador'
) THEN 'ok' ELSE 'falha: pode_aprovar_colaborador perdeu papel gestor / supervisor_id / recorte de empresa' END;

-- 3. §1 — feedbacks_360_consolidacoes com as 13 colunas do alvo, RLS ligada e UNIQUE do grupo
SELECT CASE WHEN (
  SELECT count(*) = 13
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'feedbacks_360_consolidacoes'
     AND column_name IN ('id','empresa_id','ciclo_id','colaborador_id','status','enviado_por',
                         'enviado_em','atualizado_em','versao_consolidada',
                         'gestor_responsavel_colaborador_id','gestor_responsavel_user_id',
                         'revisao','atualizado_por')
) AND (
  SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360_consolidacoes'
) IS TRUE AND (
  SELECT count(*) = 1 FROM pg_constraint
   WHERE conrelid = 'public.feedbacks_360_consolidacoes'::regclass AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (empresa_id, ciclo_id, colaborador_id)'
) AND (
  SELECT count(*) = 1 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'feedbacks_360_consolidacoes'
     AND column_name = 'revisao' AND is_nullable = 'NO' AND column_default = '0'
) THEN 'ok' ELSE 'falha: feedbacks_360_consolidacoes sem as colunas do alvo / sem RLS / sem UNIQUE(empresa,ciclo,colaborador) / revisao sem default 0' END;

-- 4. §1 — CHECK de status recriado com os 7 estados, inclusive 'sem_gestor'
SELECT CASE WHEN (
  SELECT pg_get_constraintdef(oid) LIKE '%em_preparacao%'
     AND pg_get_constraintdef(oid) LIKE '%sem_gestor%'
     AND pg_get_constraintdef(oid) LIKE '%aguardando_gestor%'
     AND pg_get_constraintdef(oid) LIKE '%devolvida%'
     AND pg_get_constraintdef(oid) LIKE '%aprovada_gestor%'
     AND pg_get_constraintdef(oid) LIKE '%aguardando_rh%'
     AND pg_get_constraintdef(oid) LIKE '%concluida_validada%'
    FROM pg_constraint
   WHERE conrelid = 'public.feedbacks_360_consolidacoes'::regclass
     AND conname = 'feedbacks_360_consolidacoes_status_check' AND contype = 'c'
) THEN 'ok' ELSE 'falha: feedbacks_360_consolidacoes_status_check ausente ou sem os 7 estados (sem_gestor incluido)' END;

-- 5. §1 — indice da fila do gestor
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'feedbacks_360_consolidacoes'
     AND indexname = 'idx_fb360_consolidacoes_gestor'
     AND indexdef LIKE '%(gestor_responsavel_user_id, status)%'
) THEN 'ok' ELSE 'falha: idx_fb360_consolidacoes_gestor ausente ou com outras colunas' END;

-- 6. §1 — policy fcs_select: SELECT, so authenticated, empresa + (RH ou gestor vinculado)
SELECT CASE WHEN (
  SELECT p.polcmd = 'r'
     AND p.polroles = ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'authenticated')]
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%get_user_empresas%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_gerir_avaliacoes%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_aprovar_colaborador%'
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360_consolidacoes'
     AND p.polname = 'fcs_select'
) THEN 'ok' ELSE 'falha: policy fcs_select ausente / nao e SELECT de authenticated / perdeu empresa+RH+gestor' END;

-- 7. §2 — feedbacks_360_aprovacoes_gestor: 14 colunas, RLS, CHECK de decisao,
--    idempotency_key UNIQUE, FKs ON DELETE RESTRICT e comentario da tabela
SELECT CASE WHEN (
  SELECT count(*) = 14 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'feedbacks_360_aprovacoes_gestor'
     AND column_name IN ('id','consolidacao_id','feedback_id','empresa_id','ciclo_id','colaborador_id',
                         'decisao','justificativa','versao_avaliacao','revisao','decidido_por',
                         'decidido_em','idempotency_key','hash_parametros')
) AND (
  SELECT count(*) = 11 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'feedbacks_360_aprovacoes_gestor'
     AND is_nullable = 'NO'
     AND column_name IN ('id','consolidacao_id','feedback_id','empresa_id','ciclo_id','colaborador_id',
                         'decisao','versao_avaliacao','revisao','decidido_por','decidido_em')
) AND (
  SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360_aprovacoes_gestor'
) IS TRUE AND EXISTS (
  SELECT 1 FROM pg_constraint
   WHERE conrelid = 'public.feedbacks_360_aprovacoes_gestor'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%decisao%'
     AND pg_get_constraintdef(oid) LIKE '%aprovado%'
     AND pg_get_constraintdef(oid) LIKE '%devolvido%'
) AND EXISTS (
  SELECT 1 FROM pg_constraint
   WHERE conrelid = 'public.feedbacks_360_aprovacoes_gestor'::regclass AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (idempotency_key)'
) AND (
  SELECT count(*) = 2 FROM pg_constraint
   WHERE conrelid = 'public.feedbacks_360_aprovacoes_gestor'::regclass AND contype = 'f'
     AND confdeltype = 'r'
     AND confrelid IN ('public.feedbacks_360_consolidacoes'::regclass, 'public.feedbacks_360'::regclass)
) AND obj_description('public.feedbacks_360_aprovacoes_gestor'::regclass, 'pg_class') LIKE '%append-only%'
  THEN 'ok' ELSE 'falha: feedbacks_360_aprovacoes_gestor fora do alvo (colunas/NOT NULL/RLS/CHECK decisao/UNIQUE idempotency_key/FK RESTRICT/comentario)' END;

-- 8. §2 — indice do historico por empresa+ciclo+colaborador, mais recente primeiro
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'feedbacks_360_aprovacoes_gestor'
     AND indexname = 'idx_fb360_aprov_gestor'
     AND indexdef LIKE '%(empresa_id, ciclo_id, colaborador_id, decidido_em DESC)%'
) THEN 'ok' ELSE 'falha: idx_fb360_aprov_gestor ausente ou com outras colunas/ordem' END;

-- 9. §2 — policy fag_select: SELECT, so authenticated, empresa + (RH ou gestor vinculado)
SELECT CASE WHEN (
  SELECT p.polcmd = 'r'
     AND p.polroles = ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'authenticated')]
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%get_user_empresas%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_gerir_avaliacoes%'
     AND pg_get_expr(p.polqual, p.polrelid) LIKE '%pode_aprovar_colaborador%'
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'feedbacks_360_aprovacoes_gestor'
     AND p.polname = 'fag_select'
) THEN 'ok' ELSE 'falha: policy fag_select ausente / nao e SELECT de authenticated / perdeu empresa+RH+gestor' END;

-- 10. §2b — CHECK de operacao AMPLIADO com os dois rotulos novos (continencia:
--     migrations posteriores acrescentam 'editar_feedback') + comentario da coluna
SELECT CASE WHEN (
  SELECT pg_get_constraintdef(oid) LIKE '%decidir_aprovacao_gestor%'
     AND pg_get_constraintdef(oid) LIKE '%enviar_avaliacao_ao_gestor%'
     AND pg_get_constraintdef(oid) LIKE '%validar_potencial%'
     AND pg_get_constraintdef(oid) LIKE '%concluir%'
    FROM pg_constraint
   WHERE conrelid = 'public.feedbacks_360_operacoes'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%operacao%'
) AND col_description('public.feedbacks_360_operacoes'::regclass,
      (SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.feedbacks_360_operacoes'::regclass AND attname = 'operacao'))
      LIKE '%decidir_aprovacao_gestor%'
  THEN 'ok' ELSE 'falha: CHECK de feedbacks_360_operacoes.operacao nao admite decidir_aprovacao_gestor/enviar_avaliacao_ao_gestor (ou comentario da coluna nao foi atualizado)' END;

-- 11. §3/§4/§5 — as tres RPCs do fluxo existem com a assinatura do alvo, SECURITY
--     DEFINER e search_path fixo (situacao_aprovacao STABLE, as outras VOLATILE)
SELECT CASE WHEN (
  SELECT count(*) = 3
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND (p.proname, pg_get_function_identity_arguments(p.oid)) IN
         (('enviar_avaliacao_ao_gestor', 'p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text'),
          ('situacao_aprovacao',         'p_colaborador_id uuid, p_ciclo_id uuid'),
          ('decidir_aprovacao_gestor',   'p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text'))
     AND p.prosecdef IS TRUE
     AND array_to_string(p.proconfig, ',') LIKE '%search_path=public, pg_temp%'
     AND p.provolatile = CASE WHEN p.proname = 'situacao_aprovacao' THEN 's' ELSE 'v' END
) THEN 'ok' ELSE 'falha: enviar_avaliacao_ao_gestor/situacao_aprovacao/decidir_aprovacao_gestor ausentes, com outra assinatura ou sem secdef/search_path/volatilidade do alvo' END;

-- 12. §3 — invariantes de enviar_avaliacao_ao_gestor: so RH envia, sem gestor
--     atribuido recusa, exige avaliacao do gestor concluida e grava o rotulo proprio
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%pode_gerir_avaliacoes%'
     AND p.prosrc LIKE '%gestor_nao_atribuido%'
     AND p.prosrc LIKE '%avaliacao_do_gestor_ausente_ou_pendente%'
     AND p.prosrc LIKE '%aguardando_gestor%'
     AND p.prosrc LIKE '%enviar_avaliacao_ao_gestor%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'enviar_avaliacao_ao_gestor'
) THEN 'ok' ELSE 'falha: enviar_avaliacao_ao_gestor perdeu RH-only / gestor_nao_atribuido / exigencia da avaliacao do gestor / rotulo de operacao' END;

-- 13. §4 — situacao_aprovacao deriva da consolidacao + validacao do RH pela versao
--     canonica do feedback do gestor, e documenta os estados do fluxo
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%feedbacks_360_consolidacoes%'
     AND p.prosrc LIKE '%feedbacks_360_aprovacoes_gestor%'
     AND p.prosrc LIKE '%versao_avaliacao_feedback%'
     AND p.prosrc LIKE '%sem_gestor%'
     AND p.prosrc LIKE '%nao_autorizado%'
     AND obj_description(p.oid, 'pg_proc') LIKE '%concluida_validada%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'situacao_aprovacao'
) THEN 'ok' ELSE 'falha: situacao_aprovacao nao deriva de consolidacao/aprovacao/validacao vigente ou perdeu o recorte de empresa' END;

-- 14. §5 — invariantes de decidir_aprovacao_gestor: autorizacao pelo gestor vinculado,
--     avaliacao concluida, gravacao no historico, uso do estado do fluxo e rotulo
--     proprio de operacao (os nomes de erro 'avaliacao_do_gestor_ausente'/
--     'avaliacao_nao_concluida' NAO sao assertados: 20261021/20261025 reescrevem
--     o corpo e renomeiam esses erros)
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%pode_aprovar_colaborador%'
     AND p.prosrc LIKE '%feedbacks_360_aprovacoes_gestor%'
     AND p.prosrc LIKE '%situacao_aprovacao%'
     AND p.prosrc LIKE '%decidir_aprovacao_gestor%'
     AND p.prosrc LIKE '%''concluido''%'
     AND p.prosrc LIKE '%idempotencia_conflito%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
) THEN 'ok' ELSE 'falha: decidir_aprovacao_gestor perdeu autorizacao por pode_aprovar_colaborador / historico / gate de estado / idempotencia' END;

-- 15. §7 — versao_consolidada_avaliacao: VOLATILE (enxerga o registro recem-inserido),
--     hash do registro inteiro e exclusao de cancelados
SELECT CASE WHEN (
  SELECT p.provolatile = 'v'
     AND p.prosecdef IS TRUE
     AND array_to_string(p.proconfig, ',') LIKE '%search_path=public, pg_temp%'
     AND p.prosrc LIKE '%to_jsonb%'
     AND p.prosrc LIKE '%cancelado%'
     AND obj_description(p.oid, 'pg_proc') LIKE '%deterministica%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'versao_consolidada_avaliacao'
     AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid'
) THEN 'ok' ELSE 'falha: versao_consolidada_avaliacao(uuid,uuid) ausente, nao VOLATILE ou sem hash do conjunto/exclusao de cancelados' END;

-- 16. §7/§8 — sincronizar_consolidacao_avaliacao existe e NAO e chamavel por
--     authenticated/anon/PUBLIC (so os triggers/RPCs security definer a usam)
SELECT CASE WHEN (
  SELECT p.prosecdef IS TRUE
     AND array_to_string(p.proconfig, ',') LIKE '%search_path=public, pg_temp%'
     AND p.prosrc LIKE '%feedbacks_360_consolidacoes%'
     AND p.prosrc LIKE '%sem_gestor%'
     AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
     AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
     AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      WHERE a.grantee = 0)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'sincronizar_consolidacao_avaliacao'
     AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid'
) THEN 'ok' ELSE 'falha: sincronizar_consolidacao_avaliacao ausente ou executavel por authenticated/anon/PUBLIC' END;

-- 17. §7/§8 — funcao do trigger: chama a sincronizacao e nao e executavel por anon/PUBLIC
SELECT CASE WHEN (
  SELECT p.prosecdef IS TRUE
     AND array_to_string(p.proconfig, ',') LIKE '%search_path=public, pg_temp%'
     AND p.prosrc LIKE '%sincronizar_consolidacao_avaliacao%'
     AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
     AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      WHERE a.grantee = 0)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'trg_feedbacks_360_consolidacao'
     AND pg_get_function_identity_arguments(p.oid) = ''
) THEN 'ok' ELSE 'falha: trg_feedbacks_360_consolidacao() ausente, nao chama a sincronizacao ou aberta a anon/PUBLIC' END;

-- 18. §7 — trigger AFTER INSERT/UPDATE/DELETE FOR EACH ROW, habilitado, em feedbacks_360
SELECT CASE WHEN (
  SELECT t.tgtype = 29 AND t.tgenabled = 'O'
    FROM pg_trigger t
   WHERE t.tgrelid = 'public.feedbacks_360'::regclass
     AND t.tgname = 'trg_feedbacks_360_consolidacao'
     AND t.tgfoid = 'public.trg_feedbacks_360_consolidacao()'::regprocedure
     AND NOT t.tgisinternal
) THEN 'ok' ELSE 'falha: trigger trg_feedbacks_360_consolidacao ausente/desabilitado ou nao e AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW' END;

-- 19. §7 — o UPDATE do trigger e restrito as 8 colunas relevantes (UPDATE OF ...)
SELECT CASE WHEN (
  SELECT (SELECT array_agg(a.attname::text ORDER BY a.attname)
            FROM pg_attribute a
           WHERE a.attrelid = t.tgrelid AND a.attnum = ANY (t.tgattr::int2[]::int[]))
         = ARRAY['avaliado_id','avaliador_id','ciclo_id','nota_geral','potencial','status','tipo','updated_at']
    FROM pg_trigger t
   WHERE t.tgrelid = 'public.feedbacks_360'::regclass
     AND t.tgname = 'trg_feedbacks_360_consolidacao'
) THEN 'ok' ELSE 'falha: trigger trg_feedbacks_360_consolidacao nao esta limitado a UPDATE OF status, tipo, nota_geral, potencial, avaliado_id, avaliador_id, ciclo_id, updated_at' END;

-- 20. §9 — gate do Potencial: validar_potencial_avaliacao exige aprovacao vigente
--     do gestor, mantendo RH-only, versao canonica e idempotencia
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%situacao_aprovacao%'
     AND p.prosrc LIKE '%aprovacao_do_gestor_ausente%'
     AND p.prosrc LIKE '%pode_validar_potencial%'
     AND p.prosrc LIKE '%versao_avaliacao_feedback%'
     AND p.prosrc LIKE '%feedbacks_360_validacoes_potencial%'
     AND p.prosrc LIKE '%idempotencia_conflito%'
     AND p.prosecdef IS TRUE
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'validar_potencial_avaliacao'
     AND pg_get_function_identity_arguments(p.oid) = 'p_feedback_id uuid, p_idempotencia text, p_observacao text'
) THEN 'ok' ELSE 'falha: validar_potencial_avaliacao sem o gate aprovacao_do_gestor_ausente (RH poderia validar sem aprovacao do gestor)' END;

-- 21. §5/§6 — privilegios das funcoes de uso final: so authenticated executa
SELECT CASE WHEN (
  SELECT count(*) = 6
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND (p.proname, pg_get_function_identity_arguments(p.oid)) IN
         (('colaborador_id_do_usuario',  'p_empresa_id uuid'),
          ('pode_aprovar_colaborador',   'p_colaborador_id uuid'),
          ('enviar_avaliacao_ao_gestor', 'p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text'),
          ('situacao_aprovacao',         'p_colaborador_id uuid, p_ciclo_id uuid'),
          ('decidir_aprovacao_gestor',   'p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text'),
          ('validar_potencial_avaliacao','p_feedback_id uuid, p_idempotencia text, p_observacao text'))
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
     AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
     AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      WHERE a.grantee = 0)
) THEN 'ok' ELSE 'falha: alguma RPC do fluxo nao esta so com authenticated (anon/PUBLIC ainda executam, ou authenticated perdeu o EXECUTE)' END;

-- 22. §8 — versao_consolidada_avaliacao fechada para anon/PUBLIC (o EXECUTE de
--     authenticated e deliberadamente revogado depois por 20261028130000)
SELECT CASE WHEN (
  SELECT NOT has_function_privilege('anon', p.oid, 'EXECUTE')
     AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      WHERE a.grantee = 0)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'versao_consolidada_avaliacao'
     AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid'
) THEN 'ok' ELSE 'falha: versao_consolidada_avaliacao ainda executavel por anon/PUBLIC' END;

-- 23. §8b — tabelas do fluxo: authenticated SO LE, anon nada, service_role le
SELECT CASE WHEN (
  SELECT bool_and(has_table_privilege('authenticated', c.oid, 'SELECT')
              AND NOT has_table_privilege('authenticated', c.oid, 'INSERT')
              AND NOT has_table_privilege('authenticated', c.oid, 'UPDATE')
              AND NOT has_table_privilege('authenticated', c.oid, 'DELETE')
              AND NOT has_table_privilege('anon', c.oid, 'SELECT')
              AND NOT has_table_privilege('anon', c.oid, 'INSERT')
              AND NOT has_table_privilege('anon', c.oid, 'UPDATE')
              AND NOT has_table_privilege('anon', c.oid, 'DELETE')
              AND has_table_privilege('service_role', c.oid, 'SELECT'))
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname IN ('feedbacks_360_consolidacoes', 'feedbacks_360_aprovacoes_gestor')
) THEN 'ok' ELSE 'falha: privilegios de tabela fora do alvo (authenticated com escrita, anon com acesso ou service_role sem SELECT)' END;

-- 24. §7b — sincronizacao inicial: todo grupo (colaborador x ciclo) com avaliacao
--     nao cancelada tem linha de consolidacao com a versao vigente do conjunto
SELECT CASE WHEN (
  WITH grupos AS (
    SELECT DISTINCT f.avaliado_id, f.ciclo_id
      FROM public.feedbacks_360 f
     WHERE f.avaliado_id IS NOT NULL AND f.ciclo_id IS NOT NULL
       AND lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
  )
  SELECT count(*) = 0
    FROM grupos g
    LEFT JOIN public.feedbacks_360_consolidacoes c
      ON c.colaborador_id = g.avaliado_id AND c.ciclo_id = g.ciclo_id
   WHERE c.id IS NULL
      OR c.versao_consolidada IS DISTINCT FROM
         public.versao_consolidada_avaliacao(g.avaliado_id, g.ciclo_id)
) THEN 'ok' ELSE 'falha: existe grupo colaborador x ciclo sem linha de consolidacao ou com versao_consolidada desatualizada' END;
