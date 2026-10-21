import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let falhas = 0;
const ok = (cond, msg, extra = '') => {
  console.log(`${cond ? 'OK ' : 'FALHA'} — ${msg}${extra ? ` (${extra})` : ''}`);
  if (!cond) falhas += 1;
};
const deveFalhar = async (fn, esperado, msg) => {
  try {
    await fn();
    ok(false, msg, 'não lançou erro');
  } catch (e) {
    const texto = String(e?.message ?? e);
    ok(texto.includes(esperado), msg, texto.slice(0, 140));
  }
};

await db.exec(`
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
    join user_roles ur on ur.user_id=auth.uid() and ur.role='gestor'
    where alvo.id=p and gestor.user_id=auth.uid()
      and alvo.empresa_id in (select get_user_empresas(auth.uid()))
  ) or exists (
    select 1 from ninebox_permissoes_homologacao e
     where e.user_id=auth.uid() and e.habilitado=true and e.expira_em > now()
       and exists (select 1 from user_roles ur2 where ur2.user_id=auth.uid() and ur2.role='gestor')
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
create trigger trg_feedbacks_360_revisao before update on feedbacks_360
  for each row execute function tg_feedbacks_360_revisao();
create table feedbacks_360_consolidacoes (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid, colaborador_id uuid);
create table feedbacks_360_aprovacoes_gestor (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid, colaborador_id uuid);
create table feedbacks_360_validacoes_potencial (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid);
create table metas_okrs (id uuid primary key default gen_random_uuid(), empresa_id uuid, ciclo_id uuid);
create table ciclos_avaliacao (id uuid primary key, empresa_id uuid not null, nome text, status text);
alter table ciclos_avaliacao enable row level security;
create policy "ciclos_avaliacao_insert" on ciclos_avaliacao for insert to authenticated
  with check (empresa_id in (select get_user_empresas(auth.uid())));
create policy "ciclos_avaliacao_delete" on ciclos_avaliacao for delete to authenticated
  using (empresa_id in (select get_user_empresas(auth.uid())));
`);


await db.exec(`
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
create function versao_avaliacao_feedback(p_id uuid) returns text language sql volatile security definer set search_path=public,pg_temp as $$
  select id::text || '|' || revisao::text || '|' || to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || coalesce(potencial::text,'') || '|' || status
    from feedbacks_360 where id=p_id
$$;
create function decidir_aprovacao_gestor(uuid,uuid,text,text,text) returns jsonb language sql as $$
  select jsonb_build_object('marker','REMOTE_DECIDIR_PRESERVADO')
$$;
create function sincronizar_consolidacao_avaliacao(uuid,uuid,uuid) returns jsonb language sql as $$
  select jsonb_build_object('marker','REMOTE_SINCRONIZAR_PRESERVADO')
$$;
create function finalizar_feedback(uuid,text,text,text) returns jsonb language plpgsql as $$
begin raise exception 'OLD_FINALIZAR'; end $$;
`);

const EMP = '11111111-1111-4111-8111-111111111111';
const EMP2 = '11111111-1111-4111-8111-111111111112';
const CIC = '22222222-2222-4222-8222-222222222222';
const RH = '33333333-3333-4333-8333-333333333333';
const GESTOR = '44444444-4444-4444-8444-444444444444';
const AVALIADOR = '55555555-5555-4555-8555-555555555555';
const COLAB = '66666666-6666-4666-8666-666666666666';
const EQUIPE = '77777777-7777-4777-8777-777777777777';
const OUTRO = '88888888-8888-4888-8888-888888888888';
const COMUM = '99999999-9999-4999-8999-999999999999';
const ALHEIO = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const USER2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const COLAB2 = 'cccccccc-3333-4333-8333-cccccccccccc';
const EXC = 'dddddddd-4444-4444-8444-dddddddddddd';
const CIC_EMP2 = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';

await db.exec(`
insert into user_empresas values
  ('${RH}','${EMP}'),('${GESTOR}','${EMP}'),('${AVALIADOR}','${EMP}'),
  ('${COMUM}','${EMP}'),('${EXC}','${EMP}'),('${USER2}','${EMP2}');
insert into user_roles values ('${RH}','rh'),('${GESTOR}','gestor'),('${EXC}','gestor');
insert into colaboradores values
  ('${GESTOR}','${EMP}','${GESTOR}',null),
  ('${AVALIADOR}','${EMP}','${AVALIADOR}','${GESTOR}'),
  ('${COLAB}','${EMP}',null,'${GESTOR}'),
  ('${EQUIPE}','${EMP}',null,'${GESTOR}'),
  ('${COMUM}','${EMP}','${COMUM}',null),
  ('${ALHEIO}','${EMP}',null,null),
  ('${COLAB2}','${EMP2}',null,null);
insert into ciclos_avaliacao values
  ('${CIC}','${EMP}','Ciclo Reconciliação','ativo'),
  ('${CIC_EMP2}','${EMP2}','Ciclo outra empresa','rascunho');
`);

await db.exec(readFileSync('supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql', 'utf8'));
// Reaplicação: a migration de reconciliação deve ser idempotente.
await db.exec(readFileSync('supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql', 'utf8'));

const fn = await db.query(`
  select p.proname, p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in
     ('pode_finalizar_feedback','finalizar_feedback','editar_feedback_seguro','decidir_aprovacao_gestor','sincronizar_consolidacao_avaliacao')
`);
const porNome = Object.fromEntries(fn.rows.map((r) => [r.proname, r.prosrc]));
ok(!!porNome.pode_finalizar_feedback, 'helper pode_finalizar_feedback criado');
ok((porNome.finalizar_feedback ?? '').includes('pode_finalizar_feedback'), 'finalizar_feedback substituída');
ok(!!porNome.editar_feedback_seguro, 'editar_feedback_seguro criado');
ok((porNome.decidir_aprovacao_gestor ?? '').includes('REMOTE_DECIDIR_PRESERVADO'), 'decidir remoto preservado');
ok((porNome.sincronizar_consolidacao_avaliacao ?? '').includes('REMOTE_SINCRONIZAR_PRESERVADO'), 'sincronizar remoto preservado');

const check = await db.query(`
  select pg_get_constraintdef(oid) as def from pg_constraint
   where conrelid='public.feedbacks_360_operacoes'::regclass and conname='feedbacks_360_operacoes_operacao_check'
`);
ok(String(check.rows[0]?.def ?? '').includes('editar_feedback'), 'CHECK aceita editar_feedback');

const pol = await db.query(`select policyname, qual, with_check from pg_policies where schemaname='public' and tablename='ciclos_avaliacao'`);
ok(JSON.stringify(pol.rows).includes('pode_gerir_avaliacoes'), 'policies de ciclo exigem pode_gerir_avaliacoes');
const trg = await db.query(`select tgname from pg_trigger where tgrelid='public.ciclos_avaliacao'::regclass and not tgisinternal`);
ok(trg.rows.some((r) => r.tgname === 'ciclos_bloqueio_exclusao_com_dependencias'), 'trigger de bloqueio de ciclo criado');

const setUid = (uid) => db.exec(`select set_config('app.uid','${uid}',false)`);
const inserirFeedback = (id, tipo, status, nota, potencial, avaliador, avaliado = COLAB) =>
  db.exec(`insert into feedbacks_360
    (id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,nota_geral,potencial,status)
    values ('${id}','${EMP}','${CIC}','${avaliado}','${avaliador}','${tipo}',${nota},${potencial ?? 'null'},'${status}')`);

const F_RH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const F_EVAL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await inserirFeedback(F_RH, 'gestor', 'pendente', 4, 4, GESTOR);
await inserirFeedback(F_EVAL, 'par', 'pendente', 3, null, AVALIADOR);

await setUid(RH);
const rh = await db.query(`select finalizar_feedback('${F_RH}','concluir',null,'rh-1') as r`);
ok(rh.rows[0].r.ok === true && rh.rows[0].r.status_novo === 'concluido', 'RH conclui preparação pela RPC autorizada');

await setUid(AVALIADOR);
const avaliador = await db.query(`select finalizar_feedback('${F_EVAL}','concluir',null,'av-1') as r`);
ok(avaliador.rows[0].r.ok === true && avaliador.rows[0].r.status_novo === 'concluido', 'avaliador designado conclui sem supervisor_id');

await setUid(OUTRO);
await deveFalhar(
  () => db.query(`select finalizar_feedback('${F_EVAL}','concluir',null,'av-2')`),
  'perfil_nao_autorizado',
  'usuário sem vínculo é bloqueado'
);
await deveFalhar(
  () => db.query(`select finalizar_feedback('${F_EVAL}','reabrir','justificativa longa', 'av-3')`),
  'perfil_nao_autorizado',
  'avaliador não executa ação administrativa de reabrir'
);

await setUid(RH);
const editado = await db.query(`select editar_feedback_seguro(
  '${F_EVAL}','${COLAB}','${GESTOR}','${CIC}','par',4,null,
  'Fortes','Melhoria','Comentário','edit-1') as r`);
ok(editado.rows[0].r.ok === true && editado.rows[0].r.status === 'pendente', 'edição reabre o registro');
const repetido = await db.query(`select editar_feedback_seguro(
  '${F_EVAL}','${COLAB}','${GESTOR}','${CIC}','par',4,null,
  'Fortes','Melhoria','Comentário','edit-1') as r`);
ok(repetido.rows[0].r.idempotente === true, 'edição é idempotente');
const op = await db.query(`select count(*)::int as n from feedbacks_360_operacoes where operacao='editar_feedback'`);
ok(op.rows[0].n === 1, 'operação editar_feedback foi gravada uma vez');

const inserirFeedbackEm = (id, empresa, ciclo, avaliado, avaliador, status, tipo = 'par', nota = 4, potencial = null) =>
  db.exec(`insert into feedbacks_360
    (id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,nota_geral,potencial,status)
    values ('${id}','${empresa}','${ciclo}','${avaliado}','${avaliador}','${tipo}',${nota},${potencial ?? 'null'},'${status}')`);

// ── Autorização de edição por registro ──────────────────────────────────────
const F_MGR = '10000000-0000-4000-8000-000000000001';
await inserirFeedbackEm(F_MGR, EMP, CIC, COLAB, GESTOR, 'pendente', 'gestor', 4, 4);
await setUid(GESTOR);
const mgr = await db.query(`select editar_feedback_seguro(
  '${F_MGR}','${COLAB}','${GESTOR}','${CIC}','gestor',4,4,'F','M','C','mgr-1') as r`);
ok(mgr.rows[0].r.ok === true, 'gestor responsável edita');

const F_ALHEIO = '10000000-0000-4000-8000-000000000002';
await inserirFeedbackEm(F_ALHEIO, EMP, CIC, ALHEIO, GESTOR, 'pendente', 'par', 4, null);
await setUid(GESTOR);
await deveFalhar(
  () => db.query(`select editar_feedback_seguro(
    '${F_ALHEIO}','${ALHEIO}','${GESTOR}','${CIC}','par',4,null,'F','M','C','mgr-2')`),
  'perfil_nao_autorizado',
  'gestor não responsável é bloqueado'
);

const F_COMUM = '10000000-0000-4000-8000-000000000003';
await inserirFeedbackEm(F_COMUM, EMP, CIC, COLAB, GESTOR, 'pendente', 'par', 4, null);
await setUid(COMUM);
await deveFalhar(
  () => db.query(`select editar_feedback_seguro(
    '${F_COMUM}','${COLAB}','${GESTOR}','${CIC}','par',4,null,'F','M','C','common-1')`),
  'perfil_nao_autorizado',
  'usuário comum é bloqueado'
);

const F_OUTRA = '10000000-0000-4000-8000-000000000004';
await inserirFeedbackEm(F_OUTRA, EMP2, CIC_EMP2, COLAB2, COLAB2, 'pendente', 'par', 4, null);
await setUid(USER2);
await deveFalhar(
  () => db.query(`select editar_feedback_seguro(
    '${F_OUTRA}','${COLAB2}','${COLAB2}','${CIC_EMP2}','par',4,null,'F','M','C','other-1')`),
  'perfil_nao_autorizado',
  'usuário de outra empresa é bloqueado'
);

const F_EXC = '10000000-0000-4000-8000-000000000005';
await inserirFeedbackEm(F_EXC, EMP, CIC, ALHEIO, GESTOR, 'pendente', 'par', 4, null);
await db.exec(`insert into ninebox_permissoes_homologacao values ('${EXC}', true, now() + interval '1 day')`);
await setUid(EXC);
const exc = await db.query(`select editar_feedback_seguro(
  '${F_EXC}','${ALHEIO}','${GESTOR}','${CIC}','par',4,null,'F','M','C','exc-1') as r`);
ok(exc.rows[0].r.ok === true, 'gestor com exceção temporária válida edita');

const F_EXP = '10000000-0000-4000-8000-000000000006';
await inserirFeedbackEm(F_EXP, EMP, CIC, ALHEIO, GESTOR, 'pendente', 'par', 4, null);
await db.exec(`delete from ninebox_permissoes_homologacao where user_id='${EXC}'`);
await db.exec(`insert into ninebox_permissoes_homologacao values ('${EXC}', true, now() - interval '1 day')`);
await setUid(EXC);
await deveFalhar(
  () => db.query(`select editar_feedback_seguro(
    '${F_EXP}','${ALHEIO}','${GESTOR}','${CIC}','par',4,null,'F','M','C','exc-exp-1')`),
  'perfil_nao_autorizado',
  'exceção expirada é bloqueada'
);

// ── Máquina de estados ──────────────────────────────────────────────────────
const F_CONC = '10000000-0000-4000-8000-000000000007';
await inserirFeedbackEm(F_CONC, EMP, CIC, COLAB, GESTOR, 'concluido', 'gestor', 4, 4);
await setUid(RH);
const conc = await db.query(`select editar_feedback_seguro(
  '${F_CONC}','${COLAB}','${GESTOR}','${CIC}','gestor',5,4,'F','M','C','conc-1') as r`);
ok(conc.rows[0].r.ok === true && conc.rows[0].r.status === 'pendente' && conc.rows[0].r.reaberta === true,
  'edição de concluído reabre e invalida pela nova versão');

const F_CANC = '10000000-0000-4000-8000-000000000008';
await inserirFeedbackEm(F_CANC, EMP, CIC, COLAB, GESTOR, 'cancelado', 'par', 4, null);
await setUid(RH);
await deveFalhar(
  () => db.query(`select editar_feedback_seguro(
    '${F_CANC}','${COLAB}','${GESTOR}','${CIC}','par',4,null,'F','M','C','canc-1')`),
  'feedback_cancelado_nao_editavel',
  'edição NÃO reativa feedback cancelado'
);
const reabriu = await db.query(`select finalizar_feedback(
  '${F_CANC}','reabrir','Reabertura administrativa autorizada','canc-reopen-1') as r`);
ok(reabriu.rows[0].r.ok === true && reabriu.rows[0].r.status_novo === 'pendente',
  'reabertura administrativa de cancelado é permitida com justificativa');

const F_CANC2 = '10000000-0000-4000-8000-000000000009';
await inserirFeedbackEm(F_CANC2, EMP, CIC, COLAB, GESTOR, 'cancelado', 'par', 4, null);
await setUid(GESTOR);
await deveFalhar(
  () => db.query(`select finalizar_feedback(
    '${F_CANC2}','reabrir','Gestor tentando reabrir cancelado','canc-reopen-2')`),
  'perfil_nao_autorizado',
  'gestor não reabre cancelado por conta própria'
);

const F_UNK = '10000000-0000-4000-8000-000000000010';
await inserirFeedbackEm(F_UNK, EMP, CIC, COLAB, GESTOR, 'estranho', 'par', 4, null);
await setUid(RH);
await deveFalhar(
  () => db.query(`select editar_feedback_seguro(
    '${F_UNK}','${COLAB}','${GESTOR}','${CIC}','par',4,null,'F','M','C','unknown-1')`),
  'status_desconhecido',
  'status desconhecido é bloqueado'
);



const CIC2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
await db.exec(`insert into ciclos_avaliacao values ('${CIC2}','${EMP}','Ciclo vazio','rascunho')`);
await db.exec(`delete from ciclos_avaliacao where id='${CIC2}'`);
ok(true, 'ciclo sem dependências pode ser excluído');

const criarCiclo = (id, nome) => db.exec(`insert into ciclos_avaliacao values ('${id}','${EMP}','${nome}','rascunho')`);
const CIC_FB = '20000000-0000-4000-8000-000000000001';
await criarCiclo(CIC_FB, 'Ciclo com feedback');
await inserirFeedbackEm('30000000-0000-4000-8000-000000000001', EMP, CIC_FB, COLAB, GESTOR, 'pendente');
await deveFalhar(() => db.exec(`delete from ciclos_avaliacao where id='${CIC_FB}'`), 'ciclo_com_dependencias', 'ciclo com feedback é bloqueado');

const CIC_AP = '20000000-0000-4000-8000-000000000002';
await criarCiclo(CIC_AP, 'Ciclo com aprovação');
await db.exec(`insert into feedbacks_360_aprovacoes_gestor (empresa_id,ciclo_id,colaborador_id) values ('${EMP}','${CIC_AP}','${COLAB}')`);
await deveFalhar(() => db.exec(`delete from ciclos_avaliacao where id='${CIC_AP}'`), 'ciclo_com_dependencias', 'ciclo com aprovação é bloqueado');

const CIC_CONS = '20000000-0000-4000-8000-000000000003';
await criarCiclo(CIC_CONS, 'Ciclo com consolidação');
await db.exec(`insert into feedbacks_360_consolidacoes (empresa_id,ciclo_id,colaborador_id) values ('${EMP}','${CIC_CONS}','${COLAB}')`);
await deveFalhar(() => db.exec(`delete from ciclos_avaliacao where id='${CIC_CONS}'`), 'ciclo_com_dependencias', 'ciclo com consolidação é bloqueado');

const CIC_VAL = '20000000-0000-4000-8000-000000000004';
await criarCiclo(CIC_VAL, 'Ciclo com validação');
await db.exec(`insert into feedbacks_360_validacoes_potencial (empresa_id,ciclo_id) values ('${EMP}','${CIC_VAL}')`);
await deveFalhar(() => db.exec(`delete from ciclos_avaliacao where id='${CIC_VAL}'`), 'ciclo_com_dependencias', 'ciclo com validação é bloqueado');

const CIC_META = '20000000-0000-4000-8000-000000000005';
await criarCiclo(CIC_META, 'Ciclo com meta');
await db.exec(`insert into metas_okrs (empresa_id,ciclo_id) values ('${EMP}','${CIC_META}')`);
await deveFalhar(() => db.exec(`delete from ciclos_avaliacao where id='${CIC_META}'`), 'ciclo_com_dependencias', 'ciclo com meta é bloqueado');

const CIC_AUDIT = '20000000-0000-4000-8000-000000000006';
await criarCiclo(CIC_AUDIT, 'Ciclo com auditoria');
await db.exec(`insert into audit_log (empresa_id,tabela,registro_id,acao) values ('${EMP}','ciclos_avaliacao','${CIC_AUDIT}','UPDATE')`);
await deveFalhar(() => db.exec(`delete from ciclos_avaliacao where id='${CIC_AUDIT}'`), 'ciclo_com_dependencias', 'ciclo com histórico de auditoria é bloqueado');

await deveFalhar(
  () => db.exec(`delete from ciclos_avaliacao where id='${CIC}'`),
  'ciclo_com_dependencias',
  'ciclo com dependências é bloqueado'
);

const antesRollback = await db.query(`
  select (select count(*)::int from feedbacks_360) as feedbacks,
         (select count(*)::int from audit_log) as auditoria,
         (select count(*)::int from feedbacks_360_operacoes) as operacoes
`);
await db.exec(readFileSync('supabase/rollback/20261027090000_ninebox_reconciliacao_incremental_rollback.sql', 'utf8'));
const posRollback = await db.query(`
  select
    to_regprocedure('public.pode_finalizar_feedback(uuid)') is not null as helper,
    to_regprocedure('public.pode_editar_feedback(uuid)') is not null as helper_edicao,
    to_regprocedure('public.pode_editar_colaborador(uuid)') is not null as helper_colaborador,
    to_regprocedure('public.editar_feedback_seguro(uuid,uuid,uuid,uuid,text,numeric,numeric,text,text,text,text)') is not null as editar,
    (select count(*)::int from pg_trigger where tgname='ciclos_bloqueio_exclusao_com_dependencias' and not tgisinternal) as trigger_ciclo,
    (select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='finalizar_feedback') as finalizar_src,
    (select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='decidir_aprovacao_gestor') as decidir_src,
    (select string_agg(coalesce(qual,'') || coalesce(with_check,''), ' ') from pg_policies
      where schemaname='public' and tablename='ciclos_avaliacao') as policies,
    (select count(*)::int from feedbacks_360) as feedbacks,
    (select count(*)::int from audit_log) as auditoria,
    (select count(*)::int from feedbacks_360_operacoes) as operacoes
`);
ok(posRollback.rows[0].helper === false, 'rollback remove o helper');
ok(posRollback.rows[0].helper_edicao === false, 'rollback remove o helper de edição');
ok(posRollback.rows[0].helper_colaborador === false, 'rollback remove o helper de edição por colaborador');
ok(posRollback.rows[0].editar === false, 'rollback remove a edição segura');
ok(posRollback.rows[0].trigger_ciclo === 0, 'rollback remove o trigger de ciclo');
ok(!String(posRollback.rows[0].policies ?? '').includes('pode_gerir_avaliacoes'), 'rollback restaura policies sem ampliar privilégios');
ok(
  String(posRollback.rows[0].finalizar_src ?? '').includes('pode_gerir_avaliacoes') &&
    !String(posRollback.rows[0].finalizar_src ?? '').includes('pode_finalizar_feedback'),
  'rollback restaura a definição remota anterior de finalizar_feedback'
);
ok(String(posRollback.rows[0].decidir_src ?? '').includes('REMOTE_DECIDIR_PRESERVADO'), 'rollback preserva decidir remoto');
ok(
  posRollback.rows[0].feedbacks === antesRollback.rows[0].feedbacks &&
    posRollback.rows[0].auditoria === antesRollback.rows[0].auditoria &&
    posRollback.rows[0].operacoes === antesRollback.rows[0].operacoes,
  'rollback preserva feedbacks, auditoria e idempotência'
);

// Sem linhas de idempotência de edição, o rollback restaura o CHECK anterior
// exatamente, sem o rótulo editar_feedback, e pode ser reaplicado.
await db.exec('delete from feedbacks_360_operacoes');
await db.exec(readFileSync('supabase/rollback/20261027090000_ninebox_reconciliacao_incremental_rollback.sql', 'utf8'));
const checkRollback = await db.query(`
  select pg_get_constraintdef(oid) as def from pg_constraint
   where conrelid='public.feedbacks_360_operacoes'::regclass
     and conname='feedbacks_360_operacoes_operacao_check'
`);
ok(!String(checkRollback.rows[0]?.def ?? '').includes('editar_feedback'), 'rollback restaura CHECK anterior exato sem histórico de edição');

if (falhas > 0) {
  console.error(`\n${falhas} verificação(ões) falharam.`);
  process.exitCode = 1;
} else {
  console.log('\nTodas as verificações passaram.');
}
await db.close();

