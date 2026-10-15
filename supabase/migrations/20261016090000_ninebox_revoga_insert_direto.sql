-- ============================================================================
-- NINE-BOX · ETAPA 2 DA CRIAÇÃO SEGURA — REVOGAÇÃO DO INSERT DIRETO.
--
-- ⚠️ ESTA MIGRATION NÃO DEVE SER APLICADA JUNTO DA ETAPA 1.
--
-- ── ORDEM OBRIGATÓRIA ───────────────────────────────────────────────────────
--   PASSO 1 (FEITO no código, atrás da flag) — o formulário passou a gravar
--     pela RPC `criar_feedback_seguro` quando `NINEBOX_MODO_REAL_ATIVO = true`
--     (`AvaliacaoPage` → `avaliacaoService.criarFeedbackSeguro`), com chave de
--     idempotência por operação. Com a flag DESLIGADA (padrão) o formulário
--     ainda usa o INSERT direto — por isso a revogação só entra depois de o
--     modo real estar ligado E homologado.
--   PASSO 2 (esta migration) — remove o privilégio e a policy de INSERT, para
--     que NENHUMA escrita contorne a auditoria transacional.
--
-- ── NÃO EXECUTAR SEM ────────────────────────────────────────────────────────
--   (a) `20261015090000_ninebox_finalizacao_e_potencial.sql` aplicada;
--   (b) `NINEBOX_MODO_REAL_ATIVO = true` em uso (o modo real é o caminho vivo);
--   (c) criação homologada nas telas (feedback + auditoria + idempotência);
--   (d) rollback operacional à mão (`supabase/rollback/`).
--
-- ── O QUE PERMANECE FUNCIONANDO ─────────────────────────────────────────────
--   • LEITURA (`select`) na aba Nine-Box e nas telas de feedback;
--   • CRIAÇÃO pela RPC (`security definer`: executa com os privilégios do
--     proprietário, não do chamador);
--   • CANCELAMENTO/REABERTURA auditados da etapa 1;
--   • exclusão física continua bloqueada (§0e da etapa 1).
-- ============================================================================

begin;

-- 1) Pré-condição: sem a RPC de criação não existe caminho de gravação.
do $$
begin
  if to_regprocedure(
       'public.criar_feedback_seguro(uuid, uuid, uuid, text, numeric, numeric, uuid, text, text, text, text)'
     ) is null then
    raise exception
      'criar_feedback_seguro ausente: aplique 20261015090000_ninebox_finalizacao_e_potencial.sql antes desta migration';
  end if;
end $$;

-- 2) INSERT direto revogado para os papéis de aplicação.
revoke insert on table public.feedbacks_360 from authenticated;
revoke insert on table public.feedbacks_360 from anon;
revoke insert on table public.feedbacks_360 from public;
drop policy if exists "feedbacks_360_insert" on public.feedbacks_360;

-- 3) Confirmação: nenhum privilégio nem policy de INSERT restou. Se algo
--    escapou, a migration falha e a transação inteira é desfeita.
do $$
declare
  v_grants integer;
  v_policies integer;
begin
  select count(*) into v_grants
    from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'feedbacks_360'
     and privilege_type = 'INSERT'
     and grantee in ('authenticated', 'anon', 'public');

  select count(*) into v_policies
    from pg_policies
   where schemaname = 'public'
     and tablename = 'feedbacks_360'
     and cmd = 'INSERT';

  if v_grants <> 0 or v_policies <> 0 then
    raise exception 'revogacao incompleta: % grant(s) e % policy(ies) de INSERT ainda ativos', v_grants, v_policies;
  end if;
end $$;

-- 4) Registro na própria tabela de que a criação só acontece pela RPC.
comment on table public.feedbacks_360 is
  'Criacao EXCLUSIVAMENTE pela RPC public.criar_feedback_seguro (feedback + auditoria na mesma transacao). INSERT direto revogado; correcao por CANCELAMENTO auditado, nunca DELETE.';

commit;
