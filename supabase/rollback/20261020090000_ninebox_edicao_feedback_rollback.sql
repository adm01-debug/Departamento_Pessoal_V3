-- ============================================================================
-- ROLLBACK OPERACIONAL — `20261020090000_ninebox_edicao_feedback.sql`
-- ----------------------------------------------------------------------------
-- ⚠️  NÃO EXECUTADO. Desfaz EXATAMENTE o que a migration aditiva criou.
--
-- O QUE FAZ
--   1. DROPA a RPC `editar_feedback_seguro` (o formulário de edição deixa de
--      gravar no modo real — o front mostra o erro REAL, sem sucesso falso);
--   2. RESTAURA o CHECK de `feedbacks_360_operacoes.operacao` ao conjunto das
--      migrations anteriores (sem o rótulo `editar_feedback`). Linhas já
--      gravadas com esse rótulo fariam o rollback falhar — comportamento
--      DESEJADO (não apagar trilha de idempotência em silêncio).
--
-- PERDA DE DADOS: nenhuma. As edições já aplicadas permanecem no registro (com
-- auditoria em `audit_log`); o rollback apenas remove a OPERAÇÃO.
-- ============================================================================

begin;

drop function if exists public.editar_feedback_seguro(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text, text, text);

do $$
declare
  v_nome text;
begin
  for v_nome in
    select conname
      from pg_constraint
     where conrelid = 'public.feedbacks_360_operacoes'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%operacao%'
  loop
    execute format('alter table public.feedbacks_360_operacoes drop constraint %I', v_nome);
  end loop;
end $$;

alter table public.feedbacks_360_operacoes
  add constraint feedbacks_360_operacoes_operacao_check
  check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar',
                      'decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor'));

commit;

-- PROVA PÓS-ROLLBACK
--   select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'editar_feedback_seguro';  -- esperado: 0
