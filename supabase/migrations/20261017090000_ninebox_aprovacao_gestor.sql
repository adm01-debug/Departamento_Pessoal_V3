-- ============================================================================
-- NINE-BOX · APROVAÇÃO OBRIGATÓRIA DO GESTOR (migration ADITIVA)
-- ----------------------------------------------------------------------------
-- ⚠️  NÃO EXECUTADA. Depende de autorização. A migration
--     `20261015090000_ninebox_finalizacao_e_potencial.sql` (já aplicada em
--     produção) NÃO é alterada aqui — tudo abaixo é ADITIVO.
--
-- FLUXO: RH prepara → envia ao gestor → gestor aprova/devolve → RH conclui →
--        RH valida Potencial → Nine-Box classifica.
--
-- PRINCÍPIOS
--   • A aprovação é do COLABORADOR + CICLO (avaliação consolidada) e é
--     ANCORADA na versão canônica da avaliação do GESTOR
--     (`versao_avaliacao_feedback`, que embute `revisao`): reabrir/alterar
--     invalida a aprovação SEM mecanismo novo.
--   • O gestor é identificado por `colaboradores.user_id = auth.uid()` e o
--     vínculo com o avaliado por `colaboradores.supervisor_id` (mesma empresa).
--     Só o gestor vinculado grava decisão — o RH NÃO substitui essa aprovação.
--   • Sem aprovação do gestor vigente, `validar_potencial_avaliacao` recusa —
--     logo o Nine-Box não classifica (o motor exige a validação do RH).
--   • Histórico append-only, auditado em `audit_log` com `empresa_id`.
-- ============================================================================

begin;

-- ── §0 · VÍNCULO VERIFICÁVEL GESTOR ↔ COLABORADOR ───────────────────────────
create or replace function public.colaborador_id_do_usuario(p_empresa_id uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select c.id
    from public.colaboradores c
   where c.user_id = auth.uid()
     and c.empresa_id = p_empresa_id
   limit 1
$$;

comment on function public.colaborador_id_do_usuario(uuid) is
  'Colaborador vinculado ao usuario autenticado na empresa. Base do vinculo gestor<->colaborador.';

create or replace function public.pode_aprovar_colaborador(p_colaborador_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.colaboradores alvo
      join public.colaboradores gestor
        on gestor.user_id = auth.uid()
       and gestor.empresa_id = alvo.empresa_id
     where alvo.id = p_colaborador_id
       and (alvo.supervisor_id = gestor.id or alvo.id = gestor.id)
  )
  and exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.role::text = 'gestor'
  )
$$;

comment on function public.pode_aprovar_colaborador(uuid) is
  'TRUE somente para o GESTOR vinculado (supervisor_id ou o proprio) com papel gestor. RH/admin NAO aprovam por este caminho.';

-- ── §1 · CABEÇALHO DO FLUXO (1 linha por colaborador+ciclo) ────────────────
create table if not exists public.feedbacks_360_consolidacoes (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null,
  ciclo_id       uuid not null,
  colaborador_id uuid not null,
  status         text not null default 'em_preparacao'
                 check (status in ('em_preparacao','aguardando_gestor','devolvida',
                                   'aprovada_gestor','aguardando_rh','concluida_validada')),
  enviado_por    uuid,
  enviado_em     timestamptz,
  atualizado_em  timestamptz not null default now(),
  unique (empresa_id, ciclo_id, colaborador_id)
);

alter table public.feedbacks_360_consolidacoes enable row level security;

drop policy if exists fcs_select on public.feedbacks_360_consolidacoes;
create policy fcs_select on public.feedbacks_360_consolidacoes
  for select to authenticated
  using (
    empresa_id in (select public.get_user_empresas(auth.uid()))
    and (
      public.pode_gerir_avaliacoes()
      or public.pode_aprovar_colaborador(colaborador_id)
    )
  );

-- ── §2 · DECISÕES DO GESTOR (histórico append-only, auditável) ──────────────
create table if not exists public.feedbacks_360_aprovacoes_gestor (
  id              uuid primary key default gen_random_uuid(),
  consolidacao_id uuid not null references public.feedbacks_360_consolidacoes(id) on delete restrict,
  feedback_id     uuid not null references public.feedbacks_360(id) on delete restrict,
  empresa_id      uuid not null,
  ciclo_id        uuid not null,
  colaborador_id  uuid not null,
  decisao         text not null check (decisao in ('aprovado','devolvido')),
  justificativa   text,
  versao_avaliacao text not null,
  revisao         integer not null,
  decidido_por    uuid not null,
  decidido_em     timestamptz not null default now(),
  idempotency_key text unique,
  hash_parametros text
);

create index if not exists idx_fb360_aprov_gestor
  on public.feedbacks_360_aprovacoes_gestor (empresa_id, ciclo_id, colaborador_id, decidido_em desc);

alter table public.feedbacks_360_aprovacoes_gestor enable row level security;

drop policy if exists fag_select on public.feedbacks_360_aprovacoes_gestor;
create policy fag_select on public.feedbacks_360_aprovacoes_gestor
  for select to authenticated
  using (
    empresa_id in (select public.get_user_empresas(auth.uid()))
    and (
      public.pode_gerir_avaliacoes()
      or public.pode_aprovar_colaborador(colaborador_id)
    )
  );

comment on table public.feedbacks_360_aprovacoes_gestor is
  'Historico append-only das decisoes do GESTOR, ancoradas na versao canonica da avaliacao do gestor.';

-- ── §3 · RPC: RH envia a consolidação ao gestor ────────────────────────────
create or replace function public.enviar_avaliacao_ao_gestor(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_idempotencia   text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_email    text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_empresa  uuid;
  v_gestor   uuid;
  v_chave    text;
  v_result   jsonb;
begin
  if v_uid is null then raise exception 'nao_autenticado' using errcode = '28000'; end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then raise exception 'idempotencia_ausente'; end if;
  if not public.pode_gerir_avaliacoes() then raise exception 'perfil_nao_autorizado'; end if;

  select c.empresa_id into v_empresa from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null then raise exception 'colaborador_inexistente'; end if;
  if v_empresa not in (select public.get_user_empresas(v_uid)) then raise exception 'nao_autorizado'; end if;

  -- A avaliação do GESTOR é obrigatória e precisa estar concluída.
  select f.id into v_gestor
    from public.feedbacks_360 f
   where f.empresa_id = v_empresa and f.ciclo_id = p_ciclo_id
     and f.avaliado_id = p_colaborador_id
     and lower(btrim(coalesce(f.tipo,''))) = 'gestor'
     and lower(btrim(coalesce(f.status,''))) = 'concluido'
   order by f.updated_at desc nulls last
   limit 1;
  if v_gestor is null then raise exception 'avaliacao_do_gestor_ausente_ou_pendente'; end if;

  v_chave := 'enviar_gestor:' || p_colaborador_id::text || ':' || p_ciclo_id::text || ':' || p_idempotencia;

  insert into public.feedbacks_360_consolidacoes
    (empresa_id, ciclo_id, colaborador_id, status, enviado_por, enviado_em, atualizado_em)
  values (v_empresa, p_ciclo_id, p_colaborador_id, 'aguardando_gestor', v_uid, now(), now())
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set status = 'aguardando_gestor', enviado_por = v_uid, enviado_em = now(), atualizado_em = now();

  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', 'aguardando_gestor'),
          v_uid, v_email);

  v_result := jsonb_build_object('ok', true, 'status', 'aguardando_gestor');
  return v_result;
end;
$$;

-- ── §4 · ESTADO (fonte única, calculada no servidor) ───────────────────────
create or replace function public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)
returns text
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_versao_gestor text;
  v_decisao       text;
  v_decisao_versao text;
  v_validacao     boolean;
begin
  select public.versao_avaliacao_feedback(f.id) into v_versao_gestor
    from public.feedbacks_360 f
   where f.ciclo_id = p_ciclo_id and f.avaliado_id = p_colaborador_id
     and lower(btrim(coalesce(f.tipo,''))) = 'gestor'
   order by f.updated_at desc nulls last limit 1;

  select a.decisao, a.versao_avaliacao into v_decisao, v_decisao_versao
    from public.feedbacks_360_aprovacoes_gestor a
   where a.ciclo_id = p_ciclo_id and a.colaborador_id = p_colaborador_id
   order by a.decidido_em desc limit 1;

  select exists (
    select 1 from public.feedbacks_360_validacoes_potencial v
     where v.ciclo_id = p_ciclo_id and v.colaborador_id = p_colaborador_id
       and (v_versao_gestor is not null and v.versao_avaliacao = v_versao_gestor)
  ) into v_validacao;

  if v_versao_gestor is null then return 'em_preparacao'; end if;
  if v_decisao is null then return 'aguardando_gestor'; end if;
  if v_decisao_versao is distinct from v_versao_gestor then return 'devolvida'; end if;
  if v_decisao = 'devolvido' then return 'devolvida'; end if;
  if v_validacao then return 'concluida_validada'; end if;
  return 'aprovada_gestor';
end;
$$;

comment on function public.situacao_aprovacao(uuid, uuid) is
  'Estado do fluxo (em_preparacao|aguardando_gestor|devolvida|aprovada_gestor|concluida_validada) derivado de aprovacao vigente + validacao RH vigente.';

-- ── §5 · RPC: DECISÃO DO GESTOR (aprovar / devolver) ───────────────────────
-- Autorização: SOMENTE o gestor vinculado (supervisor_id) com papel `gestor`.
-- `admin`/`rh` recebem `perfil_nao_autorizado` — é impossível o RH substituir
-- a aprovação do gestor (requisito §4 do pedido).
create or replace function public.decidir_aprovacao_gestor(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_decisao        text,
  p_justificativa  text default null,
  p_idempotencia   text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_decisao   text := lower(btrim(coalesce(p_decisao, '')));
  v_just      text := nullif(btrim(coalesce(p_justificativa, '')), '');
  v_chave     text;
  v_hash      text;
  v_confere   text;
  v_anterior  jsonb;
  v_linha     public.feedbacks_360%rowtype;
  v_versao    text;
  v_consol    uuid;
  v_status    text;
  v_id        uuid;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;
  if v_decisao not in ('aprovado','devolvido') then
    raise exception 'decisao_invalida';
  end if;
  if v_decisao = 'devolvido' and (v_just is null or length(v_just) < 10) then
    raise exception 'justificativa_obrigatoria';
  end if;

  -- PERMISSÃO PRIMEIRO (mesma ordem da §3/§4 da migration 1).
  if not public.pode_aprovar_colaborador(p_colaborador_id) then
    raise exception 'perfil_nao_autorizado';
  end if;

  -- Avaliação do GESTOR (obrigatória) concluída, na empresa do avaliado.
  select * into v_linha
    from public.feedbacks_360 f
   where f.ciclo_id = p_ciclo_id
     and f.avaliado_id = p_colaborador_id
     and lower(btrim(coalesce(f.tipo,''))) = 'gestor'
   order by f.updated_at desc nulls last
   limit 1
   for update;
  if not found then
    raise exception 'avaliacao_do_gestor_ausente';
  end if;
  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;
  if coalesce(lower(btrim(v_linha.status)), '') <> 'concluido' then
    raise exception 'avaliacao_nao_concluida';
  end if;

  v_chave := 'decidir_aprovacao:' || p_colaborador_id::text || ':' || p_ciclo_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_colaborador_id::text || '|' || p_ciclo_id::text || '|' || v_decisao || '|' || coalesce(v_just, ''));

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave and empresa_id = v_linha.empresa_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  v_versao := public.versao_avaliacao_feedback(v_linha.id);
  if v_versao is null or v_versao = '' then
    raise exception 'versao_indisponivel';
  end if;

  insert into public.feedbacks_360_consolidacoes
    (empresa_id, ciclo_id, colaborador_id, status, atualizado_em)
  values (v_linha.empresa_id, p_ciclo_id, p_colaborador_id, 'em_preparacao', now())
  on conflict (empresa_id, ciclo_id, colaborador_id) do nothing;

  select id into v_consol
    from public.feedbacks_360_consolidacoes
   where empresa_id = v_linha.empresa_id and ciclo_id = p_ciclo_id and colaborador_id = p_colaborador_id;

  v_status := case when v_decisao = 'aprovado' then 'aprovada_gestor' else 'devolvida' end;

  insert into public.feedbacks_360_aprovacoes_gestor (
    consolidacao_id, feedback_id, empresa_id, ciclo_id, colaborador_id,
    decisao, justificativa, versao_avaliacao, revisao,
    decidido_por, idempotency_key, hash_parametros
  ) values (
    v_consol, v_linha.id, v_linha.empresa_id, p_ciclo_id, p_colaborador_id,
    v_decisao, v_just, v_versao, v_linha.revisao,
    v_uid, 'aprov:' || v_chave, v_hash
  ) returning id into v_id;

  update public.feedbacks_360_consolidacoes
     set status = v_status, atualizado_em = now()
   where id = v_consol;

  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_linha.empresa_id,
    'feedbacks_360_aprovacoes_gestor', v_id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_linha.empresa_id,
      'ciclo_id', p_ciclo_id,
      'colaborador_id', p_colaborador_id,
      'decisao', v_decisao,
      'versao_avaliacao', v_versao,
      'revisao_avaliada', v_linha.revisao
    ),
    array['decisao', 'versao_avaliacao'], v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'aprovacao_id', v_id,
    'decisao', v_decisao,
    'status', v_status,
    'versao_avaliacao', v_versao,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_linha.id, v_linha.empresa_id, 'validar_potencial', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) to authenticated;

