-- ============================================================================
-- HOMOLOGAÇÃO · VÍNCULO DA CONTA GESTORA (Abner) — ⚠️ NÃO EXECUTADO
-- ----------------------------------------------------------------------------
-- Objetivo: dar à conta 2a1f0c4f-7587-49a7-81aa-e7e35cf0848d um colaborador
-- vinculado (`colaboradores.user_id`) para que `pode_aprovar_colaborador`
-- reconheça o GESTOR RESPONSÁVEL e o modal mostre Aprovar/Devolver.
--
-- POR QUE É NECESSÁRIO (verificado por leitura no banco):
--   • `user_roles` da conta = admin + gestor  ✅
--   • `colaboradores.user_id = 2a1f0c4f-…`  = 0 linhas  ❌  ← é o bloqueio
--   • `pode_aprovar_colaborador` exige `colaboradores.user_id = auth.uid()`
--     (migration 20261017090000) e compara `alvo.supervisor_id = gestor.id`
--     ou `alvo.id = gestor.id`.
--
-- O QUE ESTE SCRIPT FAZ (mínimo, sem criar nada):
--   PASSO 1 — vincula a conta ao DESCARTÁVEL de homologação já existente
--             (`HOMOLOG-NB Colaborador Descartavel`, CPF sentinela 00000000000).
--             Não cria colaborador, não cria avaliação e NÃO toca nenhuma outra
--             conta: altera UMA linha descartável que hoje tem `user_id` nulo.
--   PASSO 2 (opcional, só se for preciso aprovar a avaliação de OUTRA pessoa) —
--             aponta o `supervisor_id` do colaborador AVALIADO para o
--             descartável vinculado, tornando Abner o gestor responsável.
--             Escolha o avaliado pelo id retornado na consulta abaixo.
--
-- ROLLBACK: no fim do arquivo (desfaz exatamente os dois passos).
--
-- PRÉ-REQUISITOS: aplicar antes as migrations
--   20261015090000 (aplicada ✅) → 20261017090000 (PENDENTE) → 20261018090000.
--   Sem a 20261017090000 não existem as tabelas da aprovação nem as funções
--   `pode_aprovar_colaborador` / `decidir_aprovacao_gestor` / `enviar_avaliacao_ao_gestor`.
-- ============================================================================

-- begin;

-- ── 0 · CONFERÊNCIA (só leitura) ────────────────────────────────────────────
-- Quem é o descartável de homologação e quem são os candidatos a avaliado.
select c.id, c.nome_completo, c.empresa_id, c.user_id, c.supervisor_id, c.cpf
  from public.colaboradores c
 where c.cpf = '00000000000';                      -- descartável (CPF sentinela)

-- Candidatos a AVALIADO (avaliação do gestor já concluída, sem vínculo):
-- select f.id as feedback_id, f.empresa_id, f.ciclo_id, f.avaliado_id,
--        a.nome_completo as avaliado, a.supervisor_id
--   from public.feedbacks_360 f
--   join public.colaboradores a on a.id = f.avaliado_id
--  where lower(f.tipo) = 'gestor' and lower(f.status) = 'concluido'
--  order by f.updated_at desc;

-- ── 1 · VÍNCULO DA CONTA (uma linha, o descartável) ────────────────────────
-- update public.colaboradores
--    set user_id = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d'
--  where cpf = '00000000000'                                  -- o descartável
--    and empresa_id = '66104399-aba8-4105-bbd3-9bf67820c1d0'  -- empresa da conta
--    and user_id is null;                                     -- guarda: não sobrescreve vínculo existente

-- ── 1b · PROVA DO VÍNCULO (deve voltar 1 linha com o user_id acima) ────────
-- select id, nome_completo, user_id, supervisor_id
--   from public.colaboradores
--  where user_id = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';

-- ── 1c · PROVA DA AUTORIZAÇÃO (na sessão autenticada de Abner) ─────────────
--   select public.pode_aprovar_colaborador('<id do colaborador AVALIADO>');   -- esperado: true
--   select public.pode_aprovar_colaborador('<id de um colaborador ALHEIO>');  -- esperado: false

-- ── 2 · (OPCIONAL) RESPONSABILIDADE SOBRE OUTRO AVALIADO ───────────────────
-- Use o id do AVALIADO escolhido na consulta 0. Sem este passo, Abner é
-- responsável apenas pela avaliação do PRÓPRIO descartável (alvo.id = gestor.id).
-- update public.colaboradores
--    set supervisor_id = (select id from public.colaboradores where cpf = '00000000000')
--  where id = '<UUID_DO_AVALIADO_ESCOLHIDO>';

-- commit;

-- ============================================================================
-- ROLLBACK (desfaz exatamente o que foi feito)
-- ============================================================================
-- begin;
--   -- PASSO 2
--   update public.colaboradores set supervisor_id = '<VALOR_ANTERIOR>'
--    where id = '<UUID_DO_AVALIADO_ESCOLHIDO>';
--   -- PASSO 1
--   update public.colaboradores set user_id = null
--    where cpf = '00000000000' and user_id = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';
-- commit;
