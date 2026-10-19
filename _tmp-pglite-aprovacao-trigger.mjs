/**
 * TESTE POSTGRESQL TRANSACIONAL (PGlite/WASM — local, sem Supabase):
 *   1) INSERT em feedbacks_360 dispara o trigger e CRIA a consolidação na MESMA
 *      instrução/transação (a versão VOLATILE enxerga a linha recém-inserida);
 *   2) a sincronização inicial é idempotente e não altera o feedback;
 *   3) UPDATE de nota/texto (mesma transação) muda a versão e a consolidação.
 * Uso: node _tmp-pglite-aprovacao-trigger.mjs
 */
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ok = (cond, msg, extra = '') => {
  console.log(`${cond ? 'OK ' : 'FALHA'} — ${msg}${extra ? ` (${extra})` : ''}`);
  if (!cond) process.exitCode = 1;
};

await db.exec(`
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $au$
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
$au$;

create table public.colaboradores (
  id uuid primary key,
  empresa_id uuid not null,
  user_id uuid,
  supervisor_id uuid
);

create table public.feedbacks_360 (
  id uuid primary key,
  empresa_id uuid not null,
  ciclo_id uuid not null,
  avaliado_id uuid not null,
  avaliador_id uuid,
  tipo text,
  nota_geral numeric,
  potencial numeric,
  pontos_fortes text,
  pontos_melhoria text,
  comentarios text,
  status text,
  revisao integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedbacks_360_consolidacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ciclo_id uuid not null,
  colaborador_id uuid not null,
  status text not null default 'em_preparacao',
  enviado_por uuid,
  enviado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  versao_consolidada text,
  gestor_responsavel_colaborador_id uuid,
  gestor_responsavel_user_id uuid,
  revisao integer not null default 0,
  atualizado_por uuid,
  unique (empresa_id, ciclo_id, colaborador_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid,
  tabela text,
  registro_id uuid,
  acao text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  campos_alterados text[],
  user_id uuid,
  user_email text,
  created_at timestamptz not null default now()
);

create or replace function public.tg_feedbacks_360_revisao()
returns trigger language plpgsql as $rev$
begin
  new.revisao := coalesce(old.revisao, 0) + 1;
  return new;
end;
$rev$;

drop trigger if exists trg_feedbacks_360_revisao on public.feedbacks_360;
create trigger trg_feedbacks_360_revisao
  before update on public.feedbacks_360
  for each row execute function public.tg_feedbacks_360_revisao();

create or replace function public.versao_consolidada_avaliacao(
  p_colaborador_id uuid,
  p_ciclo_id uuid
) returns text
language sql volatile security definer set search_path = public, pg_temp
as $ver$
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
$ver$;
`);

await db.exec(`
create or replace function public.sincronizar_consolidacao_avaliacao(
  p_colaborador_id uuid,
  p_ciclo_id uuid,
  p_por uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $sync$
declare
  v_empresa uuid;
  v_gestor uuid;
  v_gestor_uid uuid;
  v_versao text;
  v_status text;
  v_linha public.feedbacks_360_consolidacoes%rowtype;
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
  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', v_linha.status,
                             'versao_consolidada', v_linha.versao_consolidada,
                             'revisao', v_linha.revisao),
          p_por, null);
  return jsonb_build_object('ok', true, 'status', v_linha.status, 'versao', v_linha.versao_consolidada,
                            'revisao', v_linha.revisao);
end;
$sync$;

create or replace function public.trg_feedbacks_360_consolidacao()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $trg$
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
$trg$;

drop trigger if exists trg_feedbacks_360_consolidacao on public.feedbacks_360;
create trigger trg_feedbacks_360_consolidacao
  after insert or update of status, tipo, nota_geral, potencial, avaliado_id, avaliador_id, ciclo_id, updated_at
  or delete on public.feedbacks_360
  for each row execute function public.trg_feedbacks_360_consolidacao();

insert into public.colaboradores (id, empresa_id, user_id, supervisor_id) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', null, null);
`);


const EMP = '22222222-2222-2222-2222-222222222222';
const COL = '11111111-1111-1111-1111-111111111111';
const CIC = '33333333-3333-3333-3333-333333333333';

// 1) INSERT + trigger + consolidação na MESMA transação/instrução.
await db.exec('begin');
await db.exec(`
  insert into public.feedbacks_360
    (id, empresa_id, ciclo_id, avaliado_id, avaliador_id, tipo, nota_geral, potencial,
     pontos_fortes, pontos_melhoria, comentarios, status)
  values ('44444444-4444-4444-4444-444444444444', '${EMP}', '${CIC}', '${COL}',
          '55555555-5555-5555-5555-555555555555', 'gestor', 4, 4,
          'fortes', 'melhoria', 'comentario', 'concluido')
`);
const dentro = await db.query(
  `select count(*)::int as n, max(versao_consolidada) as versao
     from public.feedbacks_360_consolidacoes where colaborador_id = '${COL}'`
);
ok(dentro.rows[0].n === 1, 'AFTER INSERT criou a consolidação na mesma operação', `linhas=${dentro.rows[0].n}`);
ok(!!dentro.rows[0].versao, 'versão calculada com o feedback recém-inserido (VOLATILE)', dentro.rows[0].versao);
await db.exec('rollback');
const fora = await db.query(
  `select count(*)::int as n from public.feedbacks_360_consolidacoes where colaborador_id = '${COL}'`
);
ok(fora.rows[0].n === 0, 'ROLLBACK desfez o INSERT e a consolidação juntos');

// 2) Sincronização inicial: feedback pré-existente (sem trigger) → cria 1; repetir não duplica.
await db.exec('drop trigger trg_feedbacks_360_consolidacao on public.feedbacks_360');
await db.exec(`
  insert into public.feedbacks_360
    (id, empresa_id, ciclo_id, avaliado_id, avaliador_id, tipo, nota_geral, potencial,
     pontos_fortes, pontos_melhoria, comentarios, status)
  values ('66666666-6666-6666-6666-666666666666', '${EMP}', '${CIC}', '${COL}',
          '55555555-5555-5555-5555-555555555555', 'gestor', 4, 4,
          'fortes', 'melhoria', 'comentario', 'concluido')
`);
const antes = await db.query(
  `select nota_geral::text as nota, updated_at::text as atualizado
     from public.feedbacks_360 where id = '66666666-6666-6666-6666-666666666666'`
);


const sincronizarExistentes = `
do $do$
declare r record;
begin
  for r in
    select g.avaliado_id, g.ciclo_id
      from (
        select distinct f.avaliado_id, f.ciclo_id
          from public.feedbacks_360 f
         where f.avaliado_id is not null and f.ciclo_id is not null
           and lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
      ) g
      left join public.feedbacks_360_consolidacoes c
        on c.colaborador_id = g.avaliado_id and c.ciclo_id = g.ciclo_id
     where c.id is null
        or c.versao_consolidada is distinct from
           public.versao_consolidada_avaliacao(g.avaliado_id, g.ciclo_id)
  loop
    perform public.sincronizar_consolidacao_avaliacao(r.avaliado_id, r.ciclo_id, null);
  end loop;
end $do$;
`;

await db.exec(sincronizarExistentes);
const inicial = await db.query(
  `select count(*)::int as n from public.feedbacks_360_consolidacoes where colaborador_id = '${COL}'`
);
ok(inicial.rows[0].n === 1, 'sincronização inicial criou a pendência do feedback pré-existente');

await db.exec(sincronizarExistentes);
const repetida = await db.query(
  `select count(*)::int as n from public.feedbacks_360_consolidacoes where colaborador_id = '${COL}'`
);
const depois = await db.query(
  `select nota_geral::text as nota, updated_at::text as atualizado
     from public.feedbacks_360 where id = '66666666-6666-6666-6666-666666666666'`
);
ok(repetida.rows[0].n === 1, 'segunda sincronização é idempotente (não duplica)');
ok(
  antes.rows[0].nota === depois.rows[0].nota && antes.rows[0].atualizado === depois.rows[0].atualizado,
  'sincronização inicial NÃO alterou o feedback'
);

// 3) Alteração de nota na MESMA transação muda a versão e a consolidação.
await db.exec(`
create trigger trg_feedbacks_360_consolidacao
  after insert or update of status, tipo, nota_geral, potencial, avaliado_id, avaliador_id, ciclo_id, updated_at
  or delete on public.feedbacks_360
  for each row execute function public.trg_feedbacks_360_consolidacao();
`);
const v1 = await db.query(
  `select versao_consolidada as v from public.feedbacks_360_consolidacoes where colaborador_id = '${COL}'`
);
await db.exec('begin');
await db.exec(`update public.feedbacks_360 set nota_geral = 3 where id = '66666666-6666-6666-6666-666666666666'`);
const v2 = await db.query(
  `select versao_consolidada as v from public.feedbacks_360_consolidacoes where colaborador_id = '${COL}'`
);
ok(
  v1.rows[0].v !== v2.rows[0].v,
  'UPDATE de nota (mesma transação) invalidou a versão',
  `${v1.rows[0].v} -> ${v2.rows[0].v}`
);
await db.exec('rollback');

await db.close();

