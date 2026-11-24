-- ============================================================================
-- NINE-BOX · JUSTIFICATIVA DE CANCELAMENTO + HISTÓRICO DA AVALIAÇÃO
-- ----------------------------------------------------------------------------
-- ADITIVA e idempotente.
--
--  1. Enriquece a `audit_log` canônica com:
--       justificativa     — texto INTEGRAL da operação;
--       status_anterior   — estado antes da transição;
--       status_posterior  — estado depois da transição.
--     Nenhuma tabela de histórico paralela é criada.
--
--  2. Preserva byte a byte a lógica vigente de `finalizar_feedback`:
--     a função atual é renomeada para `finalizar_feedback_base`, tem o EXECUTE
--     revogado e passa a ser chamada por um wrapper de mesma assinatura. O
--     wrapper apenas publica o motivo/operação em configuração local da
--     transação; um trigger BEFORE INSERT na audit_log grava os campos.
--
--  3. Expõe `listar_historico_feedback(uuid)` com autorização explícita
--     (RH/admin, gestor responsável/exceção ou avaliador designado) e recorte
--     por empresa. A função é SECURITY DEFINER, mas confere o tenant e o papel
--     antes de qualquer leitura.
--
--     A associação usa FKs/colunas reais:
--       • feedbacks_360                 → registro_id = id do feedback;
--       • feedbacks_360_consolidacoes   → empresa_id + ciclo_id + colaborador_id;
--       • feedbacks_360_aprovacoes_gestor → empresa_id + ciclo_id + colaborador_id.
--     JSON é usado apenas como CONTEÚDO do evento (status/justificativa), nunca
--     para descobrir a qual grupo o evento pertence.
--
--  4. Eventos retornados: criado, editado, concluído, encaminhado ao gestor,
--     devolvido, aprovado, cancelado e reaberto. Só devolve linhas reais.
--
-- NÃO altera: regra de aprovação do gestor, motor Nine-Box, quadrantes,
-- RLS existente, mocks ou dados. Não deve ser aplicada no principal sem
-- autorização explícita.
-- Rollback: supabase/rollback/20261028090000_ninebox_justificativa_historico_rollback.sql
-- ============================================================================

begin;

-- ── §1 · CAMPOS EXPLÍCITOS NA AUDITORIA EXISTENTE ───────────────────────────
alter table public.audit_log
  add column if not exists justificativa text,
  add column if not exists status_anterior text,
  add column if not exists status_posterior text;

comment on column public.audit_log.justificativa is
  'Justificativa/motivo integral da operação auditada (cancelamento, reabertura, devolução etc.).';
comment on column public.audit_log.status_anterior is
  'Status do registro antes da operação; nulo quando a operação não é uma transição de status.';
comment on column public.audit_log.status_posterior is
  'Status do registro depois da operação; nulo quando a operação não é uma transição de status.';

-- ── §2 · WRAPPER DE COMPATIBILIDADE PARA finalizar_feedback ──────────────────
-- A função original é PRESERVADA. O wrapper existe apenas para transportar
-- `p_motivo` até o trigger de auditoria sem reescrever a lógica já homologada.
do $$
begin
  if to_regprocedure('public.finalizar_feedback_base(uuid,text,text,text)') is null then
    if to_regprocedure('public.finalizar_feedback(uuid,text,text,text)') is null then
      raise exception 'finalizar_feedback ausente: aplique 20261027090000 antes desta migration';
    end if;
    alter function public.finalizar_feedback(uuid, text, text, text)
      rename to finalizar_feedback_base;
  end if;
end $$;

-- A base só pode ser chamada pelo wrapper SECURITY DEFINER; chamadas diretas
-- de authenticated/anon não podem contornar a gravação da justificativa.
revoke all on function public.finalizar_feedback_base(uuid, text, text, text)
  from public, anon, authenticated;

create or replace function public.finalizar_feedback(
  p_feedback_id  uuid,
  p_acao         text,
  p_motivo       text default null,
  p_idempotencia text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_resultado jsonb;
begin
  -- Configuração LOCAL DA TRANSAÇÃO: o trigger BEFORE INSERT da audit_log lê
  -- este valor e grava `justificativa`, `status_anterior` e `status_posterior`.
  perform set_config('ninebox.feedback_motivo', coalesce(p_motivo, ''), true);
  perform set_config('ninebox.feedback_acao', coalesce(p_acao, ''), true);

  v_resultado := public.finalizar_feedback_base(p_feedback_id, p_acao, p_motivo, p_idempotencia);

  perform set_config('ninebox.feedback_motivo', '', true);
  perform set_config('ninebox.feedback_acao', '', true);
  return v_resultado;
end;
$$;

comment on function public.finalizar_feedback(uuid, text, text, text) is
  'Wrapper de compatibilidade: preserva a logica homologada e transporta o motivo ate a auditoria.';

revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

-- ── §3 · ENRIQUECIMENTO DA AUDITORIA (SEM ALTERAR O HISTÓRICO EXISTENTE) ────
create or replace function public.tg_audit_log_enriquecer_feedback()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_motivo text := nullif(btrim(coalesce(current_setting('ninebox.feedback_motivo', true), '')), '');
  v_acao   text := nullif(btrim(coalesce(current_setting('ninebox.feedback_acao', true), '')), '');
  v_ap     record;
begin
  -- Status vem do payload quando as colunas explícitas não foram informadas.
  if new.status_anterior is null then
    new.status_anterior := nullif(new.dados_anteriores ->> 'status', '');
  end if;
  if new.status_posterior is null then
    new.status_posterior := nullif(new.dados_novos ->> 'status', '');
  end if;

  -- finalizar_feedback: o motivo NÃO estava no INSERT da audit_log. O wrapper
  -- o disponibiliza na configuração local e o trigger grava o texto integral.
  if new.tabela = 'feedbacks_360'
     and coalesce(new.acao, '') = 'UPDATE'
     and v_motivo is not null then
    new.justificativa := coalesce(new.justificativa, v_motivo);
    new.dados_novos := coalesce(new.dados_novos, '{}'::jsonb)
      || jsonb_build_object(
           'justificativa', new.justificativa,
           'motivo', new.justificativa,
           'acao', v_acao,
           'status_anterior', new.status_anterior,
           'status_posterior', new.status_posterior
         );
  end if;

  -- Aprovação/devolução: a justificativa vive em
  -- feedbacks_360_aprovacoes_gestor. Copiamos para a trilha sem mudar a regra
  -- de aprovação e sem duplicar a decisão.
  if new.tabela = 'feedbacks_360_aprovacoes_gestor' then
    select a.justificativa, a.decisao
      into v_ap
      from public.feedbacks_360_aprovacoes_gestor a
     where a.id = new.registro_id;

    if found then
      if new.justificativa is null then
        new.justificativa := v_ap.justificativa;
      end if;
      if new.status_posterior is null then
        new.status_posterior := case lower(coalesce(v_ap.decisao, ''))
          when 'aprovado' then 'aprovada_gestor'
          when 'devolvido' then 'devolvida'
          else null
        end;
      end if;
      new.dados_novos := coalesce(new.dados_novos, '{}'::jsonb)
        || jsonb_build_object(
             'justificativa', new.justificativa,
             'status_posterior', new.status_posterior
           );
    end if;
  end if;

  if new.justificativa is null then
    new.justificativa := nullif(new.dados_novos ->> 'justificativa', '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_log_enriquecer_feedback on public.audit_log;
create trigger trg_audit_log_enriquecer_feedback
  before insert on public.audit_log
  for each row execute function public.tg_audit_log_enriquecer_feedback();

-- ── §4 · LEITURA AUTORIZADA DO HISTÓRICO ────────────────────────────────────
create or replace function public.listar_historico_feedback(p_feedback_id uuid)
returns table (
  id uuid,
  tipo text,
  ocorrido_em timestamptz,
  responsavel_id uuid,
  responsavel_email text,
  responsavel_nome text,
  justificativa text,
  status_anterior text,
  status_posterior text,
  detalhes jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_fb  public.feedbacks_360%rowtype;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  select * into v_fb
    from public.feedbacks_360 f
   where f.id = p_feedback_id;

  if not found then
    raise exception 'registro_inexistente';
  end if;
  if v_fb.empresa_id is null
     or v_fb.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  -- RH/admin; gestor responsável/exceção (mesma prova da aprovação); ou o
  -- avaliador designado do próprio registro. Nenhum outro usuário lê a trilha.
  if not (
    public.pode_gerir_avaliacoes()
    or public.pode_aprovar_colaborador(v_fb.avaliado_id)
    or exists (
      select 1
        from public.colaboradores c
       where c.id = v_fb.avaliador_id
         and c.empresa_id = v_fb.empresa_id
         and c.user_id = v_uid
    )
  ) then
    raise exception 'perfil_nao_autorizado';
  end if;

  return query
  with feedback_eventos as (
    select
      a.id,
      a.created_at as ocorrido_em,
      a.user_id as responsavel_id,
      a.user_email as responsavel_email,
      coalesce(a.justificativa, nullif(a.dados_novos ->> 'justificativa', '')) as justificativa,
      coalesce(a.status_anterior, a.dados_anteriores ->> 'status') as status_anterior,
      coalesce(a.status_posterior, a.dados_novos ->> 'status') as status_posterior,
      a.dados_novos as detalhes,
      case
        when a.acao = 'INSERT' then 'criado'
        when lower(coalesce(a.dados_novos ->> 'motivo', '')) = 'edicao_feedback' then 'editado'
        when lower(coalesce(a.status_posterior, a.dados_novos ->> 'status', '')) = 'cancelado'
          then 'cancelado'
        when lower(coalesce(a.status_posterior, a.dados_novos ->> 'status', '')) = 'concluido'
          then 'concluido'
        when lower(coalesce(a.status_posterior, a.dados_novos ->> 'status', '')) = 'pendente'
         and lower(coalesce(a.status_anterior, a.dados_anteriores ->> 'status', ''))
             in ('concluido', 'cancelado')
          then 'reaberto'
        else 'editado'
      end as tipo
    from public.audit_log a
    where a.empresa_id = v_fb.empresa_id
      and a.tabela = 'feedbacks_360'
      and a.registro_id = p_feedback_id
      and a.acao in ('INSERT', 'UPDATE')
  ),
  eventos as (
    select * from feedback_eventos

    union all

    -- Consolidação: a fonte é a PRÓPRIA linha, identificada por
    -- (empresa_id, ciclo_id, colaborador_id). Nada é inferido de JSON.
    select
      c.id,
      c.enviado_em,
      c.enviado_por,
      null::text,
      null::text,
      null::text,
      'aguardando_gestor',
      jsonb_build_object('status', 'aguardando_gestor'),
      'encaminhado'
    from public.feedbacks_360_consolidacoes c
    where c.empresa_id = v_fb.empresa_id
      and c.ciclo_id = v_fb.ciclo_id
      and c.colaborador_id = v_fb.avaliado_id
      and c.enviado_em is not null

    union all

    -- Aprovação/devolução: a fonte é a linha append-only da aprovação,
    -- ligada pela chave real do conjunto (empresa + ciclo + colaborador).
    select
      ap.id,
      ap.decidido_em,
      ap.decidido_por,
      null::text,
      ap.justificativa,
      null::text,
      case lower(coalesce(ap.decisao, ''))
        when 'aprovado' then 'aprovada_gestor'
        when 'devolvido' then 'devolvida'
        else null
      end,
      jsonb_build_object('decisao', ap.decisao),
      case lower(coalesce(ap.decisao, ''))
        when 'aprovado' then 'aprovado'
        when 'devolvido' then 'devolvido'
        else null
      end
    from public.feedbacks_360_aprovacoes_gestor ap
    where ap.empresa_id = v_fb.empresa_id
      and ap.ciclo_id = v_fb.ciclo_id
      and ap.colaborador_id = v_fb.avaliado_id
  )
  select
    e.id,
    e.tipo,
    e.ocorrido_em,
    e.responsavel_id,
    e.responsavel_email,
    resp.nome_completo as responsavel_nome,
    e.justificativa,
    e.status_anterior,
    e.status_posterior,
    e.detalhes
  from eventos e
  left join lateral (
    select col.nome_completo
      from public.colaboradores col
     where col.user_id = e.responsavel_id
       and col.empresa_id = v_fb.empresa_id
     limit 1
  ) resp on true
  where e.tipo is not null
  order by e.ocorrido_em asc, e.id asc;
end;
$$;

comment on function public.listar_historico_feedback(uuid) is
  'Historico cronologico e autorizado de um feedback: criacao, edicao, conclusao, encaminhamento, devolucao, aprovacao, cancelamento e reabertura.';

revoke all on function public.listar_historico_feedback(uuid) from public, anon;
grant execute on function public.listar_historico_feedback(uuid) to authenticated;

commit;
