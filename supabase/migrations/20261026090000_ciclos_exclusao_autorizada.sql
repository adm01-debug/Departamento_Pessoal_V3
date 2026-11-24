-- ============================================================================
-- CICLOS DE AVALIAÇÃO — CRIAÇÃO/EXCLUSÃO SOMENTE POR RH/ADMIN
--
-- A policy original (20260315220807) liberava INSERT/DELETE para QUALQUER
-- usuário autenticado da empresa. A interface já esconde a ação de exclusão
-- de quem não tem `podeGerirAvaliacoes`, mas a autorização não pode depender
-- da tela: um cliente direto do PostgREST também precisa ser barrado.
--
-- Esta migration é ADITIVA e não altera dados. Deve ser aplicada com
-- autorização explícita; até lá, a policy antiga continua valendo no remoto.
-- ============================================================================
begin;

drop policy if exists "ciclos_avaliacao_insert" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert to authenticated
  with check (
    empresa_id in (select public.get_user_empresas(auth.uid()))
    and public.pode_gerir_avaliacoes()
  );

drop policy if exists "ciclos_avaliacao_delete" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_delete" on public.ciclos_avaliacao
  for delete to authenticated
  using (
    empresa_id in (select public.get_user_empresas(auth.uid()))
    and public.pode_gerir_avaliacoes()
  );

-- ── BLOQUEIO DE EXCLUSÃO FÍSICA COM DEPENDÊNCIAS ───────────────────────────
-- A FK de feedbacks/metas é ON DELETE SET NULL; sem esta trava, um DELETE
-- direto apagaria o ciclo e deixaria os registros órfãos. O trigger recusa a
-- operação ANTES de qualquer alteração e nunca apaga em cascata.
create or replace function public.bloquear_exclusao_ciclo_com_dependencias()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_feedbacks integer;
  v_consolidacoes integer;
  v_aprovacoes integer;
  v_validacoes integer;
  v_metas integer;
begin
  select count(*) into v_feedbacks from public.feedbacks_360 where ciclo_id = old.id;
  select count(*) into v_consolidacoes from public.feedbacks_360_consolidacoes where ciclo_id = old.id;
  select count(*) into v_aprovacoes from public.feedbacks_360_aprovacoes_gestor where ciclo_id = old.id;
  select count(*) into v_validacoes from public.feedbacks_360_validacoes_potencial where ciclo_id = old.id;
  select count(*) into v_metas from public.metas_okrs where ciclo_id = old.id;

  if (v_feedbacks + v_consolidacoes + v_aprovacoes + v_validacoes + v_metas) > 0 then
    raise exception 'ciclo_com_dependencias'
      using detail = format(
        'feedbacks=%s consolidacoes=%s aprovacoes=%s validacoes=%s metas=%s',
        v_feedbacks, v_consolidacoes, v_aprovacoes, v_validacoes, v_metas
      ),
      hint = 'Arquive o ciclo ou remova os vínculos com autorização; nada foi apagado.';
  end if;

  return old;
end;
$$;

revoke all on function public.bloquear_exclusao_ciclo_com_dependencias() from public, anon;

drop trigger if exists ciclos_bloqueio_exclusao_com_dependencias on public.ciclos_avaliacao;
create trigger ciclos_bloqueio_exclusao_com_dependencias
  before delete on public.ciclos_avaliacao
  for each row execute function public.bloquear_exclusao_ciclo_com_dependencias();

commit;

