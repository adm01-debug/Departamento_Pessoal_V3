-- ============================================================================
-- ROLLBACK da REVOGAÇÃO DO INSERT DIRETO (20261016090000).
--
-- Use SOMENTE se a revogação causar indisponibilidade da criação e antes de
-- o formulário em modo real estar operando. Depois de aplicado, o INSERT direto
-- volta a ser autorizado para `authenticated` (papel + empresa), como antes da
-- etapa 2 — ou seja, a auditoria transacional deixa de ser obrigatória.
-- ============================================================================

begin;

grant insert on table public.feedbacks_360 to authenticated;

drop policy if exists "feedbacks_360_insert" on public.feedbacks_360;
create policy "feedbacks_360_insert" on public.feedbacks_360
  for insert
  to authenticated
  with check (
    public.pode_gerir_avaliacoes()
    and empresa_id is not null
    and empresa_id in (select public.get_user_empresas(auth.uid()))
  );

-- Remove o comentário gravado pela etapa 2 (nenhum comentário anterior é
-- recriado: a etapa 2 foi quem o definiu).
comment on table public.feedbacks_360 is null;

-- Este rollback trata SOMENTE de INSERT: ele não concede nem restaura TRUNCATE
-- (essa revogação vive na etapa 1, §3b, e é intencionalmente irreversível aqui
-- — ver `20261015090000_…rollback-seguranca.sql`). Reabrir o INSERT direto NÃO
-- deve reabrir a destruição total da tabela.

commit;
