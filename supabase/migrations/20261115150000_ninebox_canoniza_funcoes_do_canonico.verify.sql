-- Sidecar da 20261115150000: prova que as quatro funcoes do canonico estao no
-- banco com o corpo endurecido, e nao com a versao mais fraca do lote NineBox.
--
-- Como ler: TODA assercao devolve exatamente uma linha, 'ok' ou 'FALHOU'.
-- Nunca "SELECT 'ok' WHERE (...)": essa forma devolve ZERO linha quando
-- reprova e a falha desaparece no meio das que passaram.
--
-- Tres das quatro funcoes sao verificadas por md5 exato. pode_aprovar_colaborador
-- NAO: ela e a unica que a migration grava sem ser copia verbatim (o literal de
-- UUID de conta pessoal foi removido), entao e verificada por comportamento --
-- secao 5. Uma das assercoes da secao 5 reprova de proposito antes do apply.
--
-- md5/length sao medidos com replace(prosrc, chr(13), ''): o prosrc vivo esta
-- em CRLF e o arquivo da migration esta em LF, entao a comparacao tem de ser
-- invariante a fim de linha. Assim a assercao vale antes e depois do apply.
--
-- Transacao read-only: nenhuma RPC e executada.

-- ── 1 · Frame das quatro funcoes: uma unica sobrecarga, SECURITY DEFINER,
--        search_path fixo, linguagem e retorno esperados.
SELECT CASE WHEN (
  (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'pode_aprovar_colaborador'
      AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid'
      AND pg_get_function_result(p.oid) = 'boolean'
      AND l.lanname = 'sql'
      AND p.prosecdef IS TRUE
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%') = 1
) THEN 'ok' ELSE 'FALHOU' END;

SELECT CASE WHEN (
  (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'situacao_aprovacao'
      AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid'
      AND pg_get_function_result(p.oid) = 'text'
      AND l.lanname = 'plpgsql'
      AND p.prosecdef IS TRUE
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%') = 1
) THEN 'ok' ELSE 'FALHOU' END;

SELECT CASE WHEN (
  (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'sincronizar_consolidacao_avaliacao'
      AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid'
      AND pg_get_function_result(p.oid) = 'jsonb'
      AND l.lanname = 'plpgsql'
      AND p.prosecdef IS TRUE
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%') = 1
) THEN 'ok' ELSE 'FALHOU' END;

SELECT CASE WHEN (
  (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'decidir_aprovacao_gestor'
      AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text'
      AND pg_get_function_result(p.oid) = 'jsonb'
      AND l.lanname = 'plpgsql'
      AND p.prosecdef IS TRUE
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%') = 1
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 2 · TODA funcao SECURITY DEFINER deste escopo tem search_path fixo com
--        'public' e 'pg_temp'. Zero excecao: sem isso a funcao e sequestravel.
SELECT CASE WHEN (
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('pode_aprovar_colaborador','situacao_aprovacao',
                        'sincronizar_consolidacao_avaliacao','decidir_aprovacao_gestor',
                        'finalizar_feedback','finalizar_feedback_base')
      AND p.prosecdef IS TRUE
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
      AND array_to_string(p.proconfig, ',') LIKE '%public%'
      AND array_to_string(p.proconfig, ',') LIKE '%pg_temp%') = 6
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 3 · md5 + length do corpo de cada funcao (CR removido). Reprova se o lote
--        NineBox sobrescrever qualquer uma com a versao mais fraca.
SELECT CASE WHEN (
  SELECT md5(replace(p.prosrc, chr(13), '')) = 'b8c52d426eb10e8eefad29c5c724f0e7'
     AND length(replace(p.prosrc, chr(13), '')) = 4502
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'situacao_aprovacao'
) THEN 'ok' ELSE 'FALHOU' END;

SELECT CASE WHEN (
  SELECT md5(replace(p.prosrc, chr(13), '')) = '6fd5b6078f474b0ee379b4535e9d4ffa'
     AND length(replace(p.prosrc, chr(13), '')) = 6601
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'sincronizar_consolidacao_avaliacao'
) THEN 'ok' ELSE 'FALHOU' END;

SELECT CASE WHEN (
  SELECT md5(replace(p.prosrc, chr(13), '')) = 'e174f9e70f05c7f9f7c2e780a5ab0d4f'
     AND length(replace(p.prosrc, chr(13), '')) = 10198
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 4 · decidir_aprovacao_gestor: a checagem que SO existe no canonico.
--        Colaborador e ciclo tem de pertencer a empresa da consolidacao.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%empresa_ciclo_colaborador_inconsistentes%'
     AND p.prosrc LIKE '%ciclos_avaliacao ca%'
     AND p.prosrc LIKE '%versao_desatualizada%'
     AND p.prosrc LIKE '%pode_aprovar_colaborador%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 5 · pode_aprovar_colaborador: assercoes SEMANTICAS, nao md5.
--        Esta e a unica das quatro funcoes que NAO e copia verbatim do
--        canonico: o literal de UUID de conta pessoal foi removido (ver
--        DESVIO DELIBERADO no cabecalho da migration). Fixar md5/length aqui
--        reprovaria depois do apply, por construcao, entao o que se exige e o
--        COMPORTAMENTO: as guardas presentes e o literal ausente.
--
--        ATENCAO -- 5.4 REPROVA DE PROPOSITO HOJE: o canonico ainda tem o
--        literal de UUID no corpo vivo, logo 'sem literal de uuid' devolve
--        FALHOU ate esta migration ser aplicada, e 'ok' depois. Esse FALHOU e
--        o estado-alvo sendo medido, nao um defeito. NAO enfraquecer a
--        assercao para ela ficar verde antes do apply.

-- 5.1 · Gestor vinculado: supervisor_id + mesma empresa + conta do usuario.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%gestor.id = alvo.supervisor_id%'
     AND p.prosrc LIKE '%gestor.empresa_id = alvo.empresa_id%'
     AND p.prosrc LIKE '%gestor.user_id = auth.uid()%'
     AND p.prosrc LIKE '%ur.role::text = ''gestor''%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pode_aprovar_colaborador'
) THEN 'ok' ELSE 'FALHOU' END;

-- 5.2 · Anti-autoaprovacao: o gestor nao e o avaliado, nem pela conta.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%gestor.id <> alvo.id%'
     AND p.prosrc LIKE '%alvo.user_id IS DISTINCT FROM auth.uid()%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pode_aprovar_colaborador'
) THEN 'ok' ELSE 'FALHOU' END;

-- 5.3 · A excecao de homologacao vem da TABELA, habilitada e nao expirada.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%ninebox_permissoes_homologacao%'
     AND p.prosrc LIKE '%h.user_id = auth.uid()%'
     AND p.prosrc LIKE '%h.habilitado = true%'
     AND p.prosrc LIKE '%h.expira_em > now()%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pode_aprovar_colaborador'
) THEN 'ok' ELSE 'FALHOU' END;

-- 5.4 · NENHUM literal de uuid no corpo: a regra nao e uma conta especifica.
--        Reprova hoje, passa depois do apply -- ver ATENCAO acima.
SELECT CASE WHEN (
  SELECT p.prosrc !~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pode_aprovar_colaborador'
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 6 · situacao_aprovacao: troca de gestor invalida aprovacao anterior e
--        'sem_gestor' exige papel gestor na mesma empresa.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%v_decidido_por%'
     AND p.prosrc LIKE '%Troca de gestor invalida aprovacoes anteriores%'
     AND p.prosrc LIKE '%ur.role::text = ''gestor''%'
     AND p.prosrc LIKE '%concluida_validada%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'situacao_aprovacao'
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 7 · sincronizar_consolidacao_avaliacao: proposta do RH gravada, cabecalho
--        preservado quando a versao zera e gestor com conta E papel.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%desempenho_proposto%'
     AND p.prosrc LIKE '%potencial_proposto%'
     AND p.prosrc LIKE '%FK RESTRICT%'
     AND p.prosrc LIKE '%then ''sem_gestor'' else ''aguardando_gestor'' end%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'sincronizar_consolidacao_avaliacao'
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 8 · A trilha de auditoria da conclusao: finalizar_feedback continua sendo
--        o WRAPPER que publica o motivo, e finalizar_feedback_base existe.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%ninebox.feedback_motivo%'
     AND p.prosrc LIKE '%ninebox.feedback_acao%'
     AND p.prosrc LIKE '%finalizar_feedback_base%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'finalizar_feedback'
) THEN 'ok' ELSE 'FALHOU' END;

SELECT CASE WHEN (
  to_regprocedure('public.finalizar_feedback_base(uuid,text,text,text)') IS NOT NULL
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 9 · O trigger que le as variaveis publicadas pelo wrapper continua ligado
--        na audit_log. Sem ele o motivo de cancelar/reabrir nao e gravado.
SELECT CASE WHEN (
  EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'audit_log'
       AND t.tgname = 'trg_audit_log_enriquecer_feedback'
       AND NOT t.tgisinternal
       AND t.tgenabled <> 'D'
  )
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 10 · Exposicao minima. As tres RPCs de fluxo: authenticated executa,
--         anon nao, PUBLIC nao.
SELECT CASE WHEN (
  has_function_privilege('authenticated', 'public.pode_aprovar_colaborador(uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.situacao_aprovacao(uuid,uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.pode_aprovar_colaborador(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.situacao_aprovacao(uuid,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)', 'EXECUTE')
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 11 · sincronizar_consolidacao_avaliacao NAO e chamavel pelo cliente: so
--         pelas RPCs SECURITY DEFINER e pelo trigger de consolidacao.
SELECT CASE WHEN (
  NOT has_function_privilege('authenticated', 'public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.sincronizar_consolidacao_avaliacao(uuid,uuid,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.finalizar_feedback_base(uuid,text,text,text)', 'EXECUTE')
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 12 · Nenhuma das seis funcoes tem EXECUTE para PUBLIC (grantee = 0).
SELECT CASE WHEN (
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace,
      aclexplode(p.proacl) a
     WHERE n.nspname = 'public'
       AND p.proname IN ('pode_aprovar_colaborador','situacao_aprovacao',
                         'sincronizar_consolidacao_avaliacao','decidir_aprovacao_gestor',
                         'finalizar_feedback','finalizar_feedback_base')
       AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  )
) THEN 'ok' ELSE 'FALHOU' END;

-- ── 13 · COMMENT preservado nas tres funcoes que tinham comentario no canonico.
SELECT CASE WHEN (
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('pode_aprovar_colaborador','situacao_aprovacao','sincronizar_consolidacao_avaliacao')
      AND coalesce(obj_description(p.oid, 'pg_proc'), '') <> '') = 3
) THEN 'ok' ELSE 'FALHOU' END;
