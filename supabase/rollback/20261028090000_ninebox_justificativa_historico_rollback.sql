-- ============================================================================
-- ROLLBACK · 20261028090000_ninebox_justificativa_historico
-- ----------------------------------------------------------------------------
-- Remove o histórico/RPC aditivos e restaura `finalizar_feedback` exatamente
-- como estava antes do wrapper. As colunas de enriquecimento da `audit_log`
-- são MANTIDAS de propósito: são append-only e podem conter justificativas já
-- gravadas; apagá-las destruiria prova de auditoria.
-- ============================================================================

begin;

drop function if exists public.listar_historico_feedback(uuid);

drop trigger if exists trg_audit_log_enriquecer_feedback on public.audit_log;
drop function if exists public.tg_audit_log_enriquecer_feedback();

do $$
begin
  if to_regprocedure('public.finalizar_feedback_base(uuid,text,text,text)') is not null then
    drop function if exists public.finalizar_feedback(uuid, text, text, text);
    alter function public.finalizar_feedback_base(uuid, text, text, text)
      rename to finalizar_feedback;
  end if;
end $$;

revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

commit;
