-- Sidecar de 20261020090000_ninebox_edicao_feedback.sql
-- Prova o estado-alvo desta migration ADITIVA:
--   1. o CHECK de rotulos de public.feedbacks_360_operacoes foi reescrito como UNICO
--      check de `operacao` e aceita exatamente os 8 rotulos, incluindo 'editar_feedback';
--   2. existe UMA sobrecarga de public.editar_feedback_seguro(11 args) retornando jsonb,
--      plpgsql, SECURITY DEFINER, volatile, search_path = public, pg_temp;
--   3. o corpo isola tenant (get_user_empresas), exige autorizacao, e grava idempotencia
--      com a chave/rotulo 'editar_feedback' em feedbacks_360_operacoes;
--   4. o corpo valida tipo/nota/potencial, trava a linha, reabre para 'pendente',
--      audita em audit_log e devolve versao_avaliacao_feedback;
--   5. EXECUTE so para authenticated (sem PUBLIC, sem anon) e a funcao esta comentada.
-- INVARIANTES (nao literais) em 3, 4 e 5: 20261027090000_ninebox_reconciliacao_incremental
-- substitui o corpo e o comentario desta RPC (autorizacao por registro via
-- pode_editar_feedback + maquina de estados) mantendo assinatura, rotulo e grants.

SELECT 'ok' WHERE (
  (select count(*) from pg_constraint c
     where c.conrelid = 'public.feedbacks_360_operacoes'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%operacao%') = 1
  and exists (select 1 from pg_constraint c
                where c.conrelid = 'public.feedbacks_360_operacoes'::regclass
                  and c.contype = 'c'
                  and c.conname = 'feedbacks_360_operacoes_operacao_check')
  and (select array(select distinct m[1]
                      from pg_constraint c,
                           regexp_matches(pg_get_constraintdef(c.oid), '''([a-z_]+)''::text', 'g') m
                     where c.conrelid = 'public.feedbacks_360_operacoes'::regclass
                       and c.conname = 'feedbacks_360_operacoes_operacao_check'
                     order by 1))
      = array['cancelar','concluir','criar','decidir_aprovacao_gestor','editar_feedback',
              'enviar_avaliacao_ao_gestor','reabrir','validar_potencial']
);

SELECT 'ok' WHERE (
  (select count(*) from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = 'editar_feedback_seguro') = 1
  and (select count(*) from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and p.proname = 'editar_feedback_seguro'
           and pg_get_function_identity_arguments(p.oid) =
               'p_feedback_id uuid, p_avaliado_id uuid, p_avaliador_id uuid, p_ciclo_id uuid, p_tipo text, p_nota numeric, p_potencial numeric, p_pontos_fortes text, p_pontos_melhoria text, p_comentarios text, p_idempotencia text'
           and pg_get_function_result(p.oid) = 'jsonb'
           and p.prolang = (select l.oid from pg_language l where l.lanname = 'plpgsql')
           and p.prosecdef
           and p.provolatile = 'v'
           and p.proconfig @> array['search_path=public, pg_temp']) = 1
);

SELECT 'ok' WHERE (
  (select count(*) from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = 'editar_feedback_seguro'
       and p.prosrc like '%get_user_empresas%'
       and (p.prosrc like '%pode_gerir_avaliacoes%' or p.prosrc like '%pode_editar_feedback%')
       and p.prosrc like '%editar_feedback:%'
       and p.prosrc like '%feedbacks_360_operacoes%'
       and p.prosrc like '%''editar_feedback''%'
       and p.prosrc like '%hash_parametros%'
       and p.prosrc like '%idempotencia_ausente%'
       and p.prosrc like '%idempotencia_conflito%') = 1
);

SELECT 'ok' WHERE (
  (select count(*) from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = 'editar_feedback_seguro'
       and p.prosrc like '%tipo_invalido%'
       and p.prosrc like '%subordinado%'
       and p.prosrc like '%nota_invalida%'
       and p.prosrc like '%potencial_invalido%'
       and p.prosrc like '%avaliado_invalido%'
       and p.prosrc like '%avaliador_invalido%'
       and p.prosrc like '%ciclo_invalido%'
       and p.prosrc like '%for update%'
       and p.prosrc like '%''pendente''%'
       and p.prosrc like '%audit_log%'
       and p.prosrc like '%versao_avaliacao_feedback%') = 1
);

SELECT 'ok' WHERE (
  (select count(*) from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = 'editar_feedback_seguro'
       and has_function_privilege('authenticated', p.oid, 'EXECUTE')
       and not has_function_privilege('anon', p.oid, 'EXECUTE')
       and not exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0)) = 1
);

SELECT 'ok' WHERE (
  (select count(*) from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = 'editar_feedback_seguro'
       and obj_description(p.oid, 'pg_proc') like 'Edicao%'
       and obj_description(p.oid, 'pg_proc') like '%Idempotente.%') = 1
);
