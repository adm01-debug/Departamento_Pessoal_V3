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
--     ANCORADA na versão do CONJUNTO (`versao_consolidada_avaliacao`, que agora
--     embute o hash do registro inteiro — notas, Potencial, textos e `revisao`):
--     reabrir/alterar invalida a aprovação SEM mecanismo novo.
--   • O gestor é identificado por `colaboradores.user_id = auth.uid()` e o
--     vínculo com o avaliado por `colaboradores.supervisor_id` (mesma empresa).
--     Só o gestor vinculado grava decisão — RH/admin NÃO substituem essa
--     aprovação e o próprio colaborador NÃO se autoaprova.
--   • A aprovação final exige a avaliação do GESTOR existente e CONCLUÍDA;
--     sem ela a RPC recusa, e o Nine-Box não classifica.
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
  select
    -- APROVAÇÃO EXCLUSIVA DO GESTOR RESPONSÁVEL: a conta autenticada precisa
    -- ter o papel `gestor` E ser o `supervisor_id` do colaborador na MESMA
    -- empresa. RH/admin NÃO aprovam por este caminho e o próprio colaborador
    -- NÃO se autoaprova (`alvo.id = gestor.id` removido de propósito).
    exists (
      select 1
        from public.colaboradores alvo
        join public.colaboradores gestor
          on gestor.user_id = auth.uid()
         and gestor.empresa_id = alvo.empresa_id
       where alvo.id = p_colaborador_id
         and alvo.supervisor_id = gestor.id
    )
    and exists (
      select 1 from public.user_roles ur
       where ur.user_id = auth.uid() and ur.role::text = 'gestor'
    )
$$;

comment on function public.pode_aprovar_colaborador(uuid) is
  'TRUE somente para o GESTOR autenticado e efetivamente responsavel (papel gestor + supervisor_id do colaborador, mesma empresa). RH/admin nao aprovam; autoaprovacao nao e permitida.';

-- ── §1 · CABEÇALHO DO FLUXO (1 linha por colaborador+ciclo) ────────────────
create table if not exists public.feedbacks_360_consolidacoes (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null,
  ciclo_id       uuid not null,
  colaborador_id uuid not null,
  status         text not null default 'em_preparacao'
                 check (status in ('em_preparacao','sem_gestor','aguardando_gestor','devolvida',
                                   'aprovada_gestor','aguardando_rh','concluida_validada')),
  enviado_por    uuid,
  enviado_em     timestamptz,
  atualizado_em  timestamptz not null default now(),
  unique (empresa_id, ciclo_id, colaborador_id)
);

-- ENCAMINHAMENTO AUTOMÁTICO (§7): a consolidação passa a ser mantida por
-- TRIGGER a cada avaliação salva — com versão própria do CONJUNTO e o vínculo
-- do gestor responsável materializado na própria linha.
alter table public.feedbacks_360_consolidacoes
  add column if not exists versao_consolidada text,
  add column if not exists gestor_responsavel_colaborador_id uuid,
  add column if not exists gestor_responsavel_user_id uuid,
  add column if not exists revisao integer not null default 0,
  add column if not exists atualizado_por uuid;

-- O CHECK da coluna foi criado com nome automático: recriado para admitir
-- `sem_gestor` (pendência de ATRIBUIÇÃO, sem gestor definido).
alter table public.feedbacks_360_consolidacoes
  drop constraint if exists feedbacks_360_consolidacoes_status_check;
alter table public.feedbacks_360_consolidacoes
  add constraint feedbacks_360_consolidacoes_status_check
  check (status in ('em_preparacao','sem_gestor','aguardando_gestor','devolvida',
                    'aprovada_gestor','aguardando_rh','concluida_validada'));

create index if not exists idx_fb360_consolidacoes_gestor
  on public.feedbacks_360_consolidacoes (gestor_responsavel_user_id, status);

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

-- ── §2b · AMPLIAÇÃO ADITIVA DO CHECK DE OPERAÇÕES ──────────────────────────
-- `feedbacks_360_operacoes.operacao` (criada na migration 20261015090000, já
-- aplicada) só aceita ('concluir','cancelar','reabrir','validar_potencial',
-- 'criar'). As duas operações NOVAS desta migration precisam de rótulo próprio
-- para a trilha de idempotência ficar legível — sem isso, a decisão do gestor
-- seria registrada como 'validar_potencial' (rótulo enganoso).
--
-- ADITIVO E REVERSÍVEL: o CHECK é apenas AMPLIADO (nenhuma linha é alterada,
-- nenhum dado é convertido). O bloco descobre o nome real da constraint em
-- `pg_constraint` e a recria — idempotente em reaplicação.
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

comment on column public.feedbacks_360_operacoes.operacao is
  'Rotulo da operacao idempotente: concluir|cancelar|reabrir|validar_potencial|criar|decidir_aprovacao_gestor|enviar_avaliacao_ao_gestor.';


-- ── §3 · RPC: RH envia a consolidação ao gestor ────────────────────────────
create or replace function public.enviar_avaliacao_ao_gestor(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_idempotencia   text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_email      text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_empresa    uuid;
  v_gestor     uuid;
  v_supervisor uuid;
  v_supervisor_uid uuid;
  v_chave      text;
  v_result     jsonb;
begin
  if v_uid is null then raise exception 'nao_autenticado' using errcode = '28000'; end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then raise exception 'idempotencia_ausente'; end if;
  if not public.pode_gerir_avaliacoes() then raise exception 'perfil_nao_autorizado'; end if;

  select c.empresa_id, c.supervisor_id
    into v_empresa, v_supervisor
    from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null then raise exception 'colaborador_inexistente'; end if;
  if v_empresa not in (select public.get_user_empresas(v_uid)) then raise exception 'nao_autorizado'; end if;

  -- SEM GESTOR NÃO SE "ENVIA": a pendência é de ATRIBUIÇÃO (o trigger já grava
  -- `sem_gestor`). Inventar destinatário aqui faria o RH acreditar no envio.
  if v_supervisor is null then raise exception 'gestor_nao_atribuido'; end if;
  select u.user_id into v_supervisor_uid from public.colaboradores u where u.id = v_supervisor;

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
    (empresa_id, ciclo_id, colaborador_id, status, enviado_por, enviado_em,
     gestor_responsavel_colaborador_id, gestor_responsavel_user_id, atualizado_em, atualizado_por)
  values (v_empresa, p_ciclo_id, p_colaborador_id, 'aguardando_gestor', v_uid, now(),
          v_supervisor, v_supervisor_uid, now(), v_uid)
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set status = 'aguardando_gestor',
        enviado_por = v_uid,
        enviado_em = now(),
        gestor_responsavel_colaborador_id = excluded.gestor_responsavel_colaborador_id,
        gestor_responsavel_user_id = excluded.gestor_responsavel_user_id,
        atualizado_em = now(),
        atualizado_por = v_uid;

  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', 'aguardando_gestor'),
          v_uid, v_email);

  v_result := jsonb_build_object('ok', true, 'status', 'aguardando_gestor');

  -- Idempotência por OPERAÇÃO (mesma trilha do restante do fluxo): reenviar o
  -- MESMO envio não republica nada; a linha fica auditável com rótulo próprio.
  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_gestor, v_empresa, 'enviar_avaliacao_ao_gestor',
          md5(p_colaborador_id::text || '|' || p_ciclo_id::text), v_result)
  on conflict (idempotency_key) do nothing;

  return v_result;
end;
$$;

-- ── §4 · ESTADO (fonte única, calculada no servidor) ───────────────────────
create or replace function public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)
returns text
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_uid           uuid := auth.uid();
  v_empresa       uuid;
  v_versao_gestor text;
  v_status_consolidacao text;
  v_decisao       text;
  v_decisao_versao text;
  v_gestor_feedback uuid;
  v_validacao     boolean := false;
begin
  /* ISOLAMENTO DE EMPRESA: o status é derivado, mas ainda é dado do tenant.
     Fora das empresas do usuário autenticado a função não responde. */
  select c.empresa_id into v_empresa from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null
     or v_empresa not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  /* FONTE DA VERDADE: a linha de CONSOLIDAÇÃO (mantida pelo trigger da §7).
     `sem_gestor` = existe avaliação, mas o colaborador não tem gestor definido:
     é AVISO de atribuição (visível ao RH), NÃO um bloqueio da decisão — por
     isso a decisão vigente é lida antes e prevalece sobre esse status. */
  select c.versao_consolidada, c.status
    into v_versao_gestor, v_status_consolidacao
    from public.feedbacks_360_consolidacoes c
   where c.colaborador_id = p_colaborador_id and c.ciclo_id = p_ciclo_id;

  /* Sem linha (migration recém-aplicada / dados legados): calcula na hora. */
  if v_versao_gestor is null then
    v_versao_gestor := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);
  end if;

  select a.decisao, a.versao_avaliacao into v_decisao, v_decisao_versao
    from public.feedbacks_360_aprovacoes_gestor a
   where a.ciclo_id = p_ciclo_id and a.colaborador_id = p_colaborador_id
   order by a.decidido_em desc limit 1;

  /* INVALIDAÇÃO: decisão de OUTRA versão não é aplicada — a consolidação volta a
     aguardar o gestor (é o reencaminhamento automático quando o conjunto muda). */
  if v_decisao is not null
     and (v_versao_gestor is null or v_decisao_versao is distinct from v_versao_gestor) then
    v_decisao := null;
    v_decisao_versao := null;
  end if;

  /* VALIDAÇÃO DO RH: a âncora de `feedbacks_360_validacoes_potencial` é a versão
     CANÔNICA DO FEEDBACK DO GESTOR (`versao_avaliacao_feedback`) — a MESMA usada
     por `validar_potencial_avaliacao` e pelo motor do Nine-Box. Comparar com a
     versão do CONJUNTO (usada pela decisão) nunca casaria e o fluxo ficaria
     eternamente em `aprovada_gestor`. */
  select f.id into v_gestor_feedback
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.tipo, ''))) = 'gestor'
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
   order by f.updated_at desc nulls last
   limit 1;

  if v_gestor_feedback is not null then
    select exists (
      select 1 from public.feedbacks_360_validacoes_potencial v
       where v.ciclo_id = p_ciclo_id
         and v.colaborador_id = p_colaborador_id
         and v.feedback_id = v_gestor_feedback
         and v.versao_avaliacao = public.versao_avaliacao_feedback(v_gestor_feedback)
    ) into v_validacao;
  end if;

  /* A DECISÃO VIGENTE TEM PRIORIDADE sobre a ausência de vínculo: `sem_gestor` é
     pendência de ATRIBUIÇÃO, não um estado terminal. Com a regra estrita atual,
     a decisão só é criada pelo gestor vinculado; a leitura mantém compatibilidade
     com decisões históricas já gravadas. */
  if v_decisao is not null then
    if v_decisao = 'devolvido' then return 'devolvida'; end if;
    if v_validacao then return 'concluida_validada'; end if;
    return 'aprovada_gestor';
  end if;

  if v_status_consolidacao = 'sem_gestor' then return 'sem_gestor'; end if;
  if v_versao_gestor is null then return 'em_preparacao'; end if;
  return 'aguardando_gestor';
end;
$$;

comment on function public.situacao_aprovacao(uuid, uuid) is
  'Estado do fluxo (em_preparacao|sem_gestor|aguardando_gestor|devolvida|aprovada_gestor|concluida_validada) derivado da CONSOLIDACAO (versao do conjunto) + aprovacao vigente + validacao RH vigente.';

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
  v_revisao_consolidacao integer;
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

  /**
   * AVALIAÇÃO OBRIGATÓRIA DO GESTOR — a aprovação final NÃO existe sem ela.
   * O registro de referência é SEMPRE `tipo='gestor'` do colaborador no ciclo.
   * Sem registro ⇒ `avaliacao_do_gestor_ausente`; com registro não concluído ⇒
   * `avaliacao_nao_concluida`. PAR/AUTO/SUBORDINADO não substituem essa etapa.
   */
  select * into v_linha
    from public.feedbacks_360 f
   where f.ciclo_id = p_ciclo_id
     and f.avaliado_id = p_colaborador_id
     and lower(btrim(coalesce(f.tipo, ''))) = 'gestor'
     and lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
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

  -- VERSÃO CONSOLIDADA (a MESMA que `situacao_aprovacao` compara): a decisão vale
  -- para o CONJUNTO colaborador × ciclo, não para um registro isolado.
  insert into public.feedbacks_360_consolidacoes
    (empresa_id, ciclo_id, colaborador_id, status, versao_consolidada, atualizado_em)
  values (v_linha.empresa_id, p_ciclo_id, p_colaborador_id, 'aguardando_gestor',
          public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id), now())
  on conflict (empresa_id, ciclo_id, colaborador_id) do nothing;

  select c.id,
         coalesce(c.versao_consolidada,
                  public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id)),
         c.revisao
    into v_consol, v_versao, v_revisao_consolidacao
    from public.feedbacks_360_consolidacoes c
   where c.empresa_id = v_linha.empresa_id and c.ciclo_id = p_ciclo_id
     and c.colaborador_id = p_colaborador_id;

  if v_versao is null or v_versao = '' then
    raise exception 'versao_indisponivel';
  end if;

  -- Só se decide o que está PENDENTE (`aguardando_gestor` ou `sem_gestor` —
  -- este último é aviso de atribuição, não bloqueio). Aprovada, devolvida ou já
  -- validada NÃO aceitam nova decisão (idempotência pela versão).
  if public.situacao_aprovacao(p_colaborador_id, p_ciclo_id) not in ('aguardando_gestor', 'sem_gestor') then
    raise exception 'pendencia_nao_aguarda_decisao';
  end if;

  v_status := case when v_decisao = 'aprovado' then 'aprovada_gestor' else 'devolvida' end;

  insert into public.feedbacks_360_aprovacoes_gestor (
    consolidacao_id, feedback_id, empresa_id, ciclo_id, colaborador_id,
    decisao, justificativa, versao_avaliacao, revisao,
    decidido_por, idempotency_key, hash_parametros
  ) values (
    v_consol, v_linha.id, v_linha.empresa_id, p_ciclo_id, p_colaborador_id,
    v_decisao, v_just, v_versao, coalesce(v_revisao_consolidacao, v_linha.revisao),
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
  values (v_chave, v_linha.id, v_linha.empresa_id, 'decidir_aprovacao_gestor', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) to authenticated;

-- ── §6 · PRIVILÉGIOS MÍNIMOS DAS FUNÇÕES NOVAS ─────────────────────────────
-- Mesmo padrão da migration 20261015090000: nada fica executável por `public`
-- (inclui `anon`); só `authenticated` executa, e cada função revalida papel +
-- empresa no corpo. `pode_aprovar_colaborador`/`situacao_aprovacao` são leitura
-- derivada do usuário autenticado — não devolvem dados de outra empresa.
revoke all on function public.colaborador_id_do_usuario(uuid) from public, anon;
grant execute on function public.colaborador_id_do_usuario(uuid) to authenticated;

revoke all on function public.pode_aprovar_colaborador(uuid) from public, anon;
grant execute on function public.pode_aprovar_colaborador(uuid) to authenticated;

revoke all on function public.enviar_avaliacao_ao_gestor(uuid, uuid, text) from public, anon;
grant execute on function public.enviar_avaliacao_ao_gestor(uuid, uuid, text) to authenticated;

revoke all on function public.situacao_aprovacao(uuid, uuid) from public, anon;
grant execute on function public.situacao_aprovacao(uuid, uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- §7 · ENCAMINHAMENTO AUTOMÁTICO AO GESTOR (qualquer categoria × qualquer ciclo)
--
-- PROBLEMA QUE ESTA SEÇÃO RESOLVE: antes, a fila de aprovação dependia de já
-- existir uma avaliação `tipo = 'gestor'` CONCLUÍDA — uma Autoavaliação, uma
-- avaliação de Pares ou de Subordinado ficava salva e NUNCA aparecia para o
-- gestor. Agora, salvar QUALQUER avaliação válida:
--   1. calcula a VERSÃO CONSOLIDADA do conjunto (colaborador × ciclo);
--   2. cria/atualiza a MESMA linha de consolidação (idempotente por
--      empresa + ciclo + colaborador — nunca quatro aprovações);
--   3. resolve o GESTOR RESPONSÁVEL pelo VÍNCULO (`supervisor_id` → `user_id`),
--      nunca pelo avaliador do registro;
--   4. sem gestor definido grava `sem_gestor` (pendência de ATRIBUIÇÃO, visível
--      ao RH) em vez de fingir um envio;
--   5. quando o conjunto MUDA depois de uma decisão, a versão muda e a decisão
--      anterior deixa de valer (invalidada) — a linha volta a aguardar o gestor.
--
-- A avaliação do GESTOR continua OBRIGATÓRIA, mas como REQUISITO DA APROVAÇÃO
-- FINAL (`decidir_aprovacao_gestor` já exige `status = 'concluido'`).
-- ═══════════════════════════════════════════════════════════════════════════

-- Versão determinística do CONJUNTO: muda com QUALQUER alteração relevante de
-- qualquer avaliação do colaborador no ciclo. Cada linha entra pelo hash do
-- registro INTEIRO (`to_jsonb`), o que cobre id, updated_at, status, tipo,
-- avaliador, notas, Potencial, textos e `revisao` — inclusive quando a alteração
-- acontece na MESMA transação (a `revisao` é incrementada pelo trigger BEFORE
-- UPDATE, então o hash muda sem depender do relógio).
--
-- VOLATILIDADE (correção): um trigger AFTER INSERT executa dentro da MESMA
-- instrução que inseriu a linha; funções STABLE usam o snapshot do início da
-- instrução e NÃO enxergam o registro recém-inserido. Por isso esta função é
-- VOLATILE (default), garantindo um snapshot novo a cada chamada e permitindo
-- que `sincronizar_consolidacao_avaliacao` calcule a versão já com o feedback
-- novo, na mesma operação.
create or replace function public.versao_consolidada_avaliacao(
  p_colaborador_id uuid,
  p_ciclo_id       uuid
) returns text
language sql volatile security definer set search_path = public, pg_temp
as $$
  with avaliacoes as (
    select md5(to_jsonb(f)::text) as parte
      from public.feedbacks_360 f
     where f.avaliado_id = p_colaborador_id
       and f.ciclo_id = p_ciclo_id
       and lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
  )
  select case when count(*) = 0 then null
              else md5(string_agg(parte, ';' order by parte)) || ':' || count(*)::text
         end
    from avaliacoes;
$$;

comment on function public.versao_consolidada_avaliacao(uuid, uuid) is
  'Impressao digital deterministica do conjunto de avaliacoes (colaborador x ciclo). Muda quando qualquer avaliacao e criada, alterada ou cancelada.';

-- Sincroniza a consolidação (chamada pelo TRIGGER de feedbacks_360).
create or replace function public.sincronizar_consolidacao_avaliacao(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_por            uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_empresa    uuid;
  v_gestor     uuid;
  v_gestor_uid uuid;
  v_versao     text;
  v_status     text;
  v_linha      public.feedbacks_360_consolidacoes%rowtype;
begin
  if p_colaborador_id is null or p_ciclo_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'chave_incompleta');
  end if;

  select c.empresa_id, c.supervisor_id into v_empresa, v_gestor
    from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null then
    return jsonb_build_object('ok', false, 'motivo', 'colaborador_inexistente');
  end if;

  if v_gestor is not null then
    select u.user_id into v_gestor_uid from public.colaboradores u where u.id = v_gestor;
  end if;

  v_versao := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);

  -- Nenhuma avaliação válida (ex.: tudo cancelado): não há o que aprovar.
  if v_versao is null then
    delete from public.feedbacks_360_consolidacoes c
     where c.empresa_id = v_empresa and c.ciclo_id = p_ciclo_id and c.colaborador_id = p_colaborador_id;
    return jsonb_build_object('ok', true, 'status', 'em_preparacao');
  end if;

  v_status := case when v_gestor is null then 'sem_gestor' else 'aguardando_gestor' end;

  insert into public.feedbacks_360_consolidacoes as c
    (empresa_id, ciclo_id, colaborador_id, status, versao_consolidada,
     gestor_responsavel_colaborador_id, gestor_responsavel_user_id,
     enviado_por, enviado_em, revisao, atualizado_em, atualizado_por)
  values (v_empresa, p_ciclo_id, p_colaborador_id, v_status, v_versao,
          v_gestor, v_gestor_uid, p_por, now(), 1, now(), p_por)
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set versao_consolidada = excluded.versao_consolidada,
        /* CONJUNTO MUDOU ⇒ a decisão anterior deixa de valer e a linha volta a
           aguardar o gestor (reencaminhamento automático). Sem mudança, o
           andamento é preservado (aprovada/devolvida/validada). */
        status = case
                   when c.versao_consolidada is distinct from excluded.versao_consolidada then excluded.status
                   when c.status = 'sem_gestor' and excluded.status = 'aguardando_gestor' then excluded.status
                   else c.status
                 end,
        gestor_responsavel_colaborador_id = excluded.gestor_responsavel_colaborador_id,
        gestor_responsavel_user_id = excluded.gestor_responsavel_user_id,
        revisao = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                       then c.revisao + 1 else c.revisao end,
        enviado_em = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                          then now() else c.enviado_em end,
        enviado_por = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                           then coalesce(excluded.enviado_por, c.enviado_por) else c.enviado_por end,
        atualizado_em = now(),
        atualizado_por = coalesce(excluded.atualizado_por, c.atualizado_por)
  returning * into v_linha;

  -- Auditoria (mesmo padrão do restante do fluxo: nada é apagado).
  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', v_linha.status,
                             'versao_consolidada', v_linha.versao_consolidada,
                             'gestor_responsavel_user_id', v_linha.gestor_responsavel_user_id,
                             'revisao', v_linha.revisao),
          p_por, null);

  return jsonb_build_object('ok', true, 'status', v_linha.status, 'versao', v_linha.versao_consolidada,
                            'revisao', v_linha.revisao);
end;
$$;

comment on function public.sincronizar_consolidacao_avaliacao(uuid, uuid, uuid) is
  'Cria/atualiza a consolidacao (empresa+ciclo+colaborador) a cada avaliacao salva: versao do conjunto, gestor responsavel pelo vinculo e status inicial (sem_gestor quando nao ha gestor). Idempotente.';

-- Trigger: TODA escrita em feedbacks_360 sincroniza a consolidação.
create or replace function public.trg_feedbacks_360_consolidacao()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sincronizar_consolidacao_avaliacao(new.avaliado_id, new.ciclo_id, auth.uid());
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE'
       or old.avaliado_id is distinct from new.avaliado_id
       or old.ciclo_id is distinct from new.ciclo_id then
      perform public.sincronizar_consolidacao_avaliacao(old.avaliado_id, old.ciclo_id, auth.uid());
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_feedbacks_360_consolidacao on public.feedbacks_360;
create trigger trg_feedbacks_360_consolidacao
  after insert or update of status, tipo, nota_geral, potencial, avaliado_id, avaliador_id, ciclo_id, updated_at
  or delete on public.feedbacks_360
  for each row execute function public.trg_feedbacks_360_consolidacao();

-- ── §7b · SINCRONIZAÇÃO INICIAL (IDEMPOTENTE, NÃO ALTERA FEEDBACKS) ────────
-- Cria/atualiza a consolidação APENAS para grupos (colaborador × ciclo) que
-- ainda não têm linha ou cuja versão do conjunto está desatualizada. A função
-- `sincronizar_consolidacao_avaliacao` só LÊ `feedbacks_360` e escreve em
-- `feedbacks_360_consolidacoes`/`audit_log` — nenhuma nota, texto ou status de
-- feedback é modificado.
--
-- IDEMPOTENTE: na segunda execução as versões já coincidem e o laço não chama
-- nada; não há duplicação (UNIQUE empresa+ciclo+colaborador na consolidação).
-- Executa como o dono da migration (a função é SECURITY DEFINER); `p_por` é
-- nulo porque não há usuário autenticado durante a migration.
do $$
declare
  r record;
begin
  for r in
    select g.avaliado_id, g.ciclo_id
      from (
        select distinct f.avaliado_id, f.ciclo_id
          from public.feedbacks_360 f
         where f.avaliado_id is not null
           and f.ciclo_id is not null
           and lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
      ) g
      left join public.feedbacks_360_consolidacoes c
        on c.colaborador_id = g.avaliado_id
       and c.ciclo_id = g.ciclo_id
     where c.id is null
        or c.versao_consolidada is distinct from
           public.versao_consolidada_avaliacao(g.avaliado_id, g.ciclo_id)
  loop
    perform public.sincronizar_consolidacao_avaliacao(r.avaliado_id, r.ciclo_id, null);
  end loop;
end $$;

-- ── §8 · PRIVILÉGIOS DA AUTOMAÇÃO ──────────────────────────────────────────
revoke all on function public.versao_consolidada_avaliacao(uuid, uuid) from public, anon;
grant execute on function public.versao_consolidada_avaliacao(uuid, uuid) to authenticated;

revoke all on function public.sincronizar_consolidacao_avaliacao(uuid, uuid, uuid) from public, anon, authenticated;
-- A consolidação é mantida EXCLUSIVAMENTE pelos triggers/RPCs `security definer`
-- (executados como o dono). Nenhum usuário autenticado pode chamar a função
-- diretamente para forjar/alterar versão, gestor responsável ou status.
-- O proprietário do schema continua podendo executá-la (necessário ao trigger).

revoke all on function public.trg_feedbacks_360_consolidacao() from public, anon;

-- ── §8b · ACESSO ÀS TABELAS DO FLUXO (LEITURA EXPLÍCITA, SEM ESCRITA DIRETA) ─
-- As duas tabelas têm RLS habilitada e policy apenas de SELECT (criadas na §1/§2).
-- Aqui o privilégio de tabela é explícito: `authenticated` LÊ conforme a policy;
-- NÃO recebe INSERT/UPDATE/DELETE. Quem escreve é a RPC/trigger SECURITY DEFINER.
revoke all on table public.feedbacks_360_consolidacoes from public, anon, authenticated;
revoke all on table public.feedbacks_360_aprovacoes_gestor from public, anon, authenticated;

grant select on table public.feedbacks_360_consolidacoes to authenticated;
grant select on table public.feedbacks_360_aprovacoes_gestor to authenticated;

-- `service_role` é papel de serviço (bypassa RLS), não usuário final: leitura
-- para rotinas administrativas, sem escrita direta.
grant select on table public.feedbacks_360_consolidacoes to service_role;
grant select on table public.feedbacks_360_aprovacoes_gestor to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- §9 · GATE DO POTENCIAL — a validação do RH exige o aval VIGENTE do gestor
--
-- A RPC `validar_potencial_avaliacao` foi criada na migration já aplicada
-- `20261015090000` e NÃO conhece a aprovação formal (ela é anterior a este
-- fluxo). Sem este `create or replace`, o RH poderia validar o Potencial de uma
-- avaliação que o gestor nunca aprovou — o que quebraria a regra do fluxo e a
-- elegibilidade ao Nine-Box.
--
-- ADITIVO: mesma assinatura, mesmas validações, mesma idempotência e mesma
-- auditoria da versão anterior; a ÚNICA diferença é o gate novo, aplicado
-- DEPOIS da idempotência (reenvio legítimo continua devolvendo o resultado
-- gravado) e ANTES do INSERT.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.validar_potencial_avaliacao(
  p_feedback_id  uuid,
  p_idempotencia text default null,
  p_observacao   text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_chave     text;
  v_hash      text;
  v_confere   text;
  v_anterior  jsonb;
  v_linha     public.feedbacks_360%rowtype;
  v_versao    text;
  v_id        uuid;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- Exclusivo do RH (`rh`). Admin NÃO valida (mesma regra da versão anterior).
  if not public.pode_validar_potencial() then
    raise exception 'perfil_nao_autorizado';
  end if;

  v_chave := 'validar_potencial:' || p_feedback_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_feedback_id::text || '|validar_potencial|' || coalesce(p_observacao, ''));

  select * into v_linha from public.feedbacks_360 where id = p_feedback_id for update;
  if not found then
    raise exception 'registro_inexistente';
  end if;

  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave
     and empresa_id = v_linha.empresa_id
     and feedback_id = p_feedback_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  if coalesce(lower(btrim(v_linha.tipo)), '') <> 'gestor' then
    raise exception 'nao_e_avaliacao_do_gestor';
  end if;
  if v_linha.avaliado_id is null then
    raise exception 'avaliacao_sem_colaborador';
  end if;
  if coalesce(lower(btrim(v_linha.status)), '') <> 'concluido' then
    raise exception 'avaliacao_nao_concluida';
  end if;
  if v_linha.potencial is null or v_linha.potencial < 1 or v_linha.potencial > 5 then
    raise exception 'potencial_ausente_ou_invalido';
  end if;

  /* GATE DO FLUXO: somente com a aprovação do GESTOR vigente. Se o conjunto
     mudou depois da aprovação, `situacao_aprovacao` já devolve
     `aguardando_gestor` e a validação é recusada até nova decisão. */
  if public.situacao_aprovacao(v_linha.avaliado_id, v_linha.ciclo_id) <> 'aprovada_gestor' then
    raise exception 'aprovacao_do_gestor_ausente';
  end if;

  v_versao := public.versao_avaliacao_feedback(v_linha.id);
  if v_versao is null or v_versao = '' then
    raise exception 'versao_indisponivel';
  end if;

  insert into public.feedbacks_360_validacoes_potencial (
    empresa_id, ciclo_id, colaborador_id, feedback_id, versao_avaliacao,
    potencial_validado, validado_por, observacao
  ) values (
    v_linha.empresa_id, v_linha.ciclo_id, v_linha.avaliado_id, v_linha.id, v_versao,
    v_linha.potencial, v_uid, nullif(btrim(coalesce(p_observacao, '')), '')
  ) returning id into v_id;

  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_linha.empresa_id,
    'feedbacks_360_validacoes_potencial', v_id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_linha.empresa_id,
      'feedback_id', v_linha.id,
      'colaborador_id', v_linha.avaliado_id,
      'ciclo_id', v_linha.ciclo_id,
      'versao_avaliacao', v_versao,
      'revisao_avaliada', v_linha.revisao,
      'potencial_validado', v_linha.potencial
    ),
    array['validado_por', 'versao_avaliacao'], v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'validacao_id', v_id,
    'versao_avaliacao', v_versao,
    'potencial_validado', v_linha.potencial,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, p_feedback_id, v_linha.empresa_id, 'validar_potencial', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.validar_potencial_avaliacao(uuid, text, text) from public, anon;
grant execute on function public.validar_potencial_avaliacao(uuid, text, text) to authenticated;

commit;


