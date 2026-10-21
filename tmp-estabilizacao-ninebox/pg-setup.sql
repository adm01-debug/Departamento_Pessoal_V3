\set ON_ERROR_STOP on
create role authenticated;
create role anon;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.uid', true), '')::uuid
$$;
create table user_empresas (user_id uuid, empresa_id uuid);
create table user_roles (user_id uuid, role text);
create table ninebox_permissoes_homologacao (user_id uuid, habilitado boolean, expira_em timestamptz);
create function get_user_empresas(p_uid uuid) returns setof uuid language sql stable security definer set search_path=public,pg_temp as $$
  select empresa_id from user_empresas where user_id=p_uid
$$;
create function pode_gerir_avaliacoes() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from user_roles where user_id=auth.uid() and role in ('admin','rh'))
$$;
create table colaboradores (id uuid primary key, empresa_id uuid not null, user_id uuid, supervisor_id uuid);
create function pode_aprovar_colaborador(p uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from colaboradores alvo
    join colaboradores gestor on gestor.id=alvo.supervisor_id
    join user_roles ur on ur.user_id=auth.uid() and ur.role::text='gestor'
    where alvo.id=p and gestor.user_id=auth.uid()
      and gestor.empresa_id=alvo.empresa_id and gestor.id<>alvo.id
      and alvo.empresa_id in (select get_user_empresas(auth.uid()))
  )
$$;
create table feedbacks_360 (
  id uuid primary key, empresa_id uuid not null, ciclo_id uuid not null,
  avaliado_id uuid not null, avaliador_id uuid, tipo text, nota_geral numeric,
  performance integer, potencial numeric, pontos_fortes text, pontos_melhoria text,
  comentarios text, status text, revisao integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function tg_feedbacks_360_revisao() returns trigger language plpgsql as $$
begin new.revisao := coalesce(old.revisao,0)+1; return new; end $$;
create trigger trg_feedbacks_360_revisao before update on feedbacks_360 for each row execute function tg_feedbacks_360_revisao();

create table feedbacks_360_consolidacoes (
  id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid,
  colaborador_id uuid, status text default 'em_preparacao', versao_consolidada text,
  desempenho_proposto numeric, potencial_proposto numeric,
  desempenho_aprovado numeric, potencial_aprovado numeric,
  aprovado_por uuid, aprovado_em timestamptz, aprovacao_id uuid, snapshot_aprovado jsonb,
  revisao integer default 0, atualizado_em timestamptz default now(),
  unique(empresa_id,ciclo_id,colaborador_id)
);
create table feedbacks_360_aprovacoes_gestor (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid, colaborador_id uuid);
create table feedbacks_360_validacoes_potencial (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid);
create table metas_okrs (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid);
create table ciclos_avaliacao (id uuid primary key, empresa_id uuid not null, nome text, status text);
alter table ciclos_avaliacao enable row level security;
create policy "ciclos_avaliacao_insert" on ciclos_avaliacao for insert to authenticated
  with check (empresa_id in (select get_user_empresas(auth.uid())));
create policy "ciclos_avaliacao_delete" on ciclos_avaliacao for delete to authenticated
  using (empresa_id in (select get_user_empresas(auth.uid())));
create table feedbacks_360_operacoes (
  idempotency_key text primary key, feedback_id uuid, empresa_id uuid,
  operacao text not null check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar','decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor')),
  hash_parametros text, resultado jsonb
);
create table audit_log (
  id uuid primary key default gen_random_uuid(), empresa_id uuid, tabela text,
  registro_id uuid, acao text, dados_anteriores jsonb, dados_novos jsonb,
  campos_alterados text[], user_id uuid, user_email text, created_at timestamptz default now()
);
create table sync_calls (grupo_colaborador uuid, grupo_ciclo uuid, quando timestamptz default now());

create function versao_avaliacao_feedback(p_id uuid) returns text language sql volatile security definer set search_path=public,pg_temp as $$
  select id::text || '|' || revisao::text || '|' || to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || coalesce(potencial::text,'') || '|' || status
    from feedbacks_360 where id=p_id
$$;
create function versao_consolidacao_avaliacao(p_col uuid,p_cic uuid) returns text language sql volatile as $$
  select case when count(*)=0 then null else md5(string_agg(md5(to_jsonb(f)::text), ';' order by md5(to_jsonb(f)::text)))||':'||count(*)::text end
    from feedbacks_360 f where f.avaliado_id=p_col and f.ciclo_id=p_cic and lower(coalesce(f.status,''))<>'cancelado'
$$;
create function sincronizar_consolidacao_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_versao text; v_emp uuid;
begin
  if p_colaborador_id is null or p_ciclo_id is null then return jsonb_build_object('ok',false); end if;
  insert into sync_calls values (p_colaborador_id,p_ciclo_id,now());
  select empresa_id into v_emp from colaboradores where id=p_colaborador_id;
  select versao_consolidacao_avaliacao(p_colaborador_id,p_ciclo_id) into v_versao;
  update feedbacks_360_consolidacoes set
    versao_consolidada=v_versao, status='aguardando_gestor', revisao=revisao+1,
    desempenho_aprovado=null, potencial_aprovado=null, aprovado_por=null,
    aprovado_em=null, aprovacao_id=null, snapshot_aprovado=null, atualizado_em=now()
   where empresa_id=v_emp and ciclo_id=p_ciclo_id and colaborador_id=p_colaborador_id;
  return jsonb_build_object('ok',true,'versao',v_versao);
end $$;
create function trg_feedbacks_360_consolidacao() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op in ('INSERT','UPDATE') then perform sincronizar_consolidacao_avaliacao(new.avaliado_id,new.ciclo_id,auth.uid()); end if;
  if tg_op in ('UPDATE','DELETE') and (tg_op='DELETE' or old.avaliado_id is distinct from new.avaliado_id or old.ciclo_id is distinct from new.ciclo_id) then
    perform sincronizar_consolidacao_avaliacao(old.avaliado_id,old.ciclo_id,auth.uid());
  end if;
  return null;
end $$;
create trigger trg_feedbacks_360_consolidacao after insert or update of status,tipo,nota_geral,potencial,avaliado_id,avaliador_id,ciclo_id,updated_at or delete on feedbacks_360
  for each row execute function trg_feedbacks_360_consolidacao();
create function decidir_aprovacao_gestor(uuid,uuid,text,text,text) returns jsonb language sql as $$
  select jsonb_build_object('marker','REMOTE_DECIDIR_PRESERVADO')
$$;


insert into user_empresas values
  ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111'),
  ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111');
insert into user_roles values
  ('33333333-3333-4333-8333-333333333333','rh'),
  ('44444444-4444-4444-8444-444444444444','gestor');
insert into colaboradores values
  ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',null),
  ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444'),
  ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111',null,'44444444-4444-4444-8444-444444444444'),
  ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111',null,'44444444-4444-4444-8444-444444444444');
insert into ciclos_avaliacao values
  ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Ciclo A','ativo'),
  ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Ciclo B','ativo');
insert into feedbacks_360 (id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,nota_geral,potencial,status)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','gestor',4,4,'pendente');
insert into feedbacks_360_consolidacoes (empresa_id,ciclo_id,colaborador_id,status,versao_consolidada,desempenho_aprovado,potencial_aprovado,snapshot_aprovado,revisao)
values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','66666666-6666-4666-8666-666666666666','aprovada_gestor','v-antiga',4,4,'{"desempenho":4,"potencial":4}',1);
