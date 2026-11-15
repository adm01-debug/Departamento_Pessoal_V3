-- Verifica que enviar_avaliacao_ao_gestor tem as TRES protecoes que estavam
-- apenas no canonico e que o repositorio nao descrevia:
--   1. isolamento por empresa na busca do supervisor (and u.empresa_id = v_empresa)
--   2. guarda gestor_sem_conta_ou_papel (supervisor com conta E papel gestor)
--   3. guarda aprovacao_ja_registrada (reenvio nao reabre fluxo aprovado)
-- Reprova se a funcao voltar a versao da 20261017090000, que nao tem nenhuma das
-- tres. Nao executa a RPC: a transacao e read-only.

-- Frame da funcao: assinatura, plpgsql, jsonb, SECURITY DEFINER, search_path fixo.
SELECT CASE WHEN (
  (SELECT COUNT(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'enviar_avaliacao_ao_gestor'
      AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text'
      AND pg_get_function_result(p.oid) = 'jsonb'
      AND l.lanname = 'plpgsql'
      AND p.prosecdef IS TRUE
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%') = 1
) THEN 'ok' ELSE 'FALHOU' END;

-- As tres protecoes, pelo corpo da funcao viva.
SELECT CASE WHEN (
  SELECT p.prosrc LIKE '%u.empresa_id = v_empresa%'
     AND p.prosrc LIKE '%gestor_sem_conta_ou_papel%'
     AND p.prosrc LIKE '%aprovacao_ja_registrada%'
     AND p.prosrc LIKE '%gestor_nao_atribuido%'
     AND p.prosrc LIKE '%avaliacao_do_gestor_ausente_ou_pendente%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'enviar_avaliacao_ao_gestor'
) THEN 'ok' ELSE 'FALHOU' END;

-- Exposicao minima: authenticated executa, anon e PUBLIC nao.
SELECT CASE WHEN (
  has_function_privilege('authenticated', 'public.enviar_avaliacao_ao_gestor(uuid,uuid,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.enviar_avaliacao_ao_gestor(uuid,uuid,text)', 'EXECUTE')
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
         aclexplode(p.proacl) a
    WHERE n.nspname = 'public' AND p.proname = 'enviar_avaliacao_ao_gestor'
      AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  )
) THEN 'ok' ELSE 'FALHOU' END;
