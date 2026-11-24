-- Rollback de 20261026090000_ciclos_exclusao_autorizada.sql
-- Restaura as policies anteriores (empresa apenas), sem tocar em dados.
begin;

drop trigger if exists ciclos_bloqueio_exclusao_com_dependencias on public.ciclos_avaliacao;
drop function if exists public.bloquear_exclusao_ciclo_com_dependencias();

drop policy if exists "ciclos_avaliacao_insert" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert to authenticated
  with check (empresa_id in (select public.get_user_empresas(auth.uid())));

drop policy if exists "ciclos_avaliacao_delete" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_delete" on public.ciclos_avaliacao
  for delete to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));

commit;
