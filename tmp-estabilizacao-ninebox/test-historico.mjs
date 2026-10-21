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

let setup = readFileSync('tmp-estabilizacao-ninebox/pg-setup.sql', 'utf8').replace(/^\\set.*$/gm, '');
await db.exec(setup);
await db.exec(`
  alter table colaboradores add column nome_completo text;
  alter table feedbacks_360_consolidacoes
    add column enviado_em timestamptz,
    add column enviado_por uuid;
  alter table feedbacks_360_aprovacoes_gestor
    add column justificativa text,
    add column decisao text,
    add column feedback_id uuid,
    add column decidido_por uuid,
    add column decidido_em timestamptz default now();
`);

const MIG = readFileSync('supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql', 'utf8');
const MIG_HIST = readFileSync('supabase/migrations/20261028090000_ninebox_justificativa_historico.sql', 'utf8');
const ROLLBACK = readFileSync('supabase/rollback/20261028090000_ninebox_justificativa_historico_rollback.sql', 'utf8');

await db.exec(MIG);
await db.exec(MIG_HIST);
await db.exec(MIG_HIST); // idempotência

const EMP = '11111111-1111-4111-8111-111111111111';
const EMP2 = '11111111-1111-4111-8111-111111111112';
const CIC = '22222222-2222-4222-8222-222222222222';
const RH = '33333333-3333-4333-8333-333333333333';
const GESTOR = '44444444-4444-4444-8444-444444444444';
const COLAB = '66666666-6666-4666-8666-666666666666';
const OUTRO = '99999999-9999-4999-8999-999999999999';
const USER2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const CIC2 = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
await db.exec(`
  insert into user_empresas values ('${USER2}','${EMP2}'), ('${OUTRO}','${EMP}');
  insert into colaboradores values ('${OUTRO}','${EMP}',null,null);
  insert into ciclos_avaliacao values ('${CIC2}','${EMP2}','Ciclo outra empresa','rascunho');
`);

const setUid = (uid) => db.exec(`select set_config('app.uid','${uid}',false)`);
const inserir = (id, status = 'pendente', empresa = EMP, ciclo = CIC, avaliado = COLAB) =>
  db.exec(`insert into feedbacks_360
    (id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,nota_geral,potencial,status)
    values ('${id}','${empresa}','${ciclo}','${avaliado}','${GESTOR}','gestor',4,4,'${status}')`);

const F1 = '10000000-0000-4000-8000-000000000101';
await inserir(F1);
const MOTIVO = 'Cancelamento solicitado pelo RH após revisão do ciclo.';
await setUid(RH);
const retornoCancel = await db.query(
  `select finalizar_feedback('${F1}','cancelar','${MOTIVO}','hist-cancel-1') as resultado`
);
const resultadoCancel = retornoCancel.rows[0]?.resultado ?? {};
ok(resultadoCancel.ok === true, 'RPC finalizar_feedback retorna ok:true');
ok(resultadoCancel.status_novo === 'cancelado', 'RPC finalizar_feedback retorna status_novo=cancelado');
ok(Boolean(resultadoCancel.auditoria_id), 'RPC finalizar_feedback retorna auditoria_id');

const audit = await db.query(`
  select empresa_id, user_id, justificativa, status_anterior, status_posterior, dados_novos
    from audit_log where tabela='feedbacks_360' and registro_id='${F1}'
   order by created_at desc limit 1
`);
const linha = audit.rows[0] ?? {};
ok(linha.justificativa === MOTIVO, 'justificativa integral gravada na audit_log');
ok(linha.status_anterior === 'pendente' && linha.status_posterior === 'cancelado', 'status anterior/posterior gravados');
ok(linha.empresa_id === EMP && linha.user_id === RH, 'empresa e UUID do responsável gravados');
ok(linha.dados_novos?.justificativa === MOTIVO, 'justificativa também disponível no payload auditável');

await db.exec(`update feedbacks_360_consolidacoes
  set status='aguardando_gestor', enviado_em=now(), enviado_por='${RH}'
  where empresa_id='${EMP}' and ciclo_id='${CIC}' and colaborador_id='${COLAB}'`);

const histRh = await db.query(`select tipo, justificativa, responsavel_id, status_anterior, status_posterior from listar_historico_feedback('${F1}')`);
const encaminhado = histRh.rows.find((r) => r.tipo === 'encaminhado');
ok(encaminhado?.responsavel_id === RH && encaminhado?.status_posterior === 'aguardando_gestor', 'consolidação associada por empresa/ciclo/colaborador, sem JSON');
const cancelEvt = histRh.rows.find((r) => r.tipo === 'cancelado');
ok(cancelEvt?.justificativa === MOTIVO, 'RH lê justificativa no histórico');
ok(cancelEvt?.responsavel_id === RH, 'histórico preserva autoria');
ok(cancelEvt?.status_anterior === 'pendente' && cancelEvt?.status_posterior === 'cancelado', 'histórico preserva transição');

await setUid(GESTOR);
const histGestor = await db.query(`select tipo from listar_historico_feedback('${F1}')`);
ok(histGestor.rows.some((r) => r.tipo === 'cancelado'), 'gestor responsável consulta o histórico');

await setUid(OUTRO);
await deveFalhar(
  () => db.query(`select * from listar_historico_feedback('${F1}')`),
  'perfil_nao_autorizado',
  'usuário sem autorização não consulta o histórico'
);

await setUid(USER2);
await deveFalhar(
  () => db.query(`select * from listar_historico_feedback('${F1}')`),
  'nao_autorizado',
  'isolamento multiempresa bloqueia outro tenant'
);

await setUid(RH);
await db.query(`select finalizar_feedback('${F1}','reabrir','Reabertura administrativa autorizada para correção','hist-reopen-1')`);
const histReaberto = await db.query(`select tipo, justificativa, status_anterior, status_posterior from listar_historico_feedback('${F1}')`);
const reaberto = histReaberto.rows.find((r) => r.tipo === 'reaberto');
ok(reaberto?.justificativa?.includes('Reabertura administrativa'), 'histórico registra justificativa de reabertura');
ok(reaberto?.status_anterior === 'cancelado' && reaberto?.status_posterior === 'pendente', 'histórico registra reabertura');

const F2 = '10000000-0000-4000-8000-000000000102';
await inserir(F2);
await db.query(`select editar_feedback_seguro(
  '${F2}','${COLAB}','${GESTOR}','${CIC}','gestor',5,4,'F','M','C','hist-edit-1')`);
const histEdit = await db.query(`select tipo from listar_historico_feedback('${F2}')`);
ok(histEdit.rows.some((r) => r.tipo === 'editado'), 'histórico registra edição');

// Registro antigo sem justificativa: a leitura não inventa motivo.
const F3 = '10000000-0000-4000-8000-000000000103';
await inserir(F3, 'cancelado');
await db.exec(`insert into audit_log
  (empresa_id,tabela,registro_id,acao,dados_anteriores,dados_novos,user_id,user_email)
  values ('${EMP}','feedbacks_360','${F3}','UPDATE',
    '{"status":"pendente"}'::jsonb,'{"status":"cancelado"}'::jsonb,'${RH}','rh@exemplo.invalid')`);
const histAntigo = await db.query(`select tipo, justificativa from listar_historico_feedback('${F3}')`);
const antigo = histAntigo.rows.find((r) => r.tipo === 'cancelado');
ok(antigo && antigo.justificativa === null, 'registro antigo sem justificativa não inventa motivo');

// Aprovação/devolução: o trigger copia a justificativa da tabela de aprovações.
const AP = '10000000-0000-4000-8000-000000000104';
await db.exec(`insert into feedbacks_360_aprovacoes_gestor
  (id,empresa_id,ciclo_id,colaborador_id,feedback_id,justificativa,decisao)
  values ('${AP}','${EMP}','${CIC}','${COLAB}','${F1}','Devolver para corrigir a nota.','devolvido')`);
await db.exec(`insert into audit_log
  (empresa_id,tabela,registro_id,acao,dados_novos,user_id,user_email)
  values ('${EMP}','feedbacks_360_aprovacoes_gestor','${AP}','INSERT',
    '{"empresa_id":"${EMP}","ciclo_id":"${CIC}","colaborador_id":"${COLAB}","decisao":"devolvido"}'::jsonb,
    '${GESTOR}','gestor@exemplo.invalid')`);
const histAprov = await db.query(`select tipo, justificativa, status_anterior, status_posterior from listar_historico_feedback('${F1}')`);
const devolvido = histAprov.rows.find((r) => r.tipo === 'devolvido');
ok(devolvido?.justificativa === 'Devolver para corrigir a nota.', 'histórico lê justificativa da aprovação/devolução');
ok(devolvido?.status_posterior === 'devolvida', 'histórico registra status da devolução');

const funcoes = await db.query(`
  select p.proname, p.prosecdef, pg_get_userbyid(p.proowner) as owner
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname in ('finalizar_feedback','finalizar_feedback_base')
   order by p.proname
`);
const wrapper = funcoes.rows.find((r) => r.proname === 'finalizar_feedback');
const base = funcoes.rows.find((r) => r.proname === 'finalizar_feedback_base');
ok(wrapper?.prosecdef === true && base?.prosecdef === true, 'wrapper e base são SECURITY DEFINER');
ok(Boolean(wrapper?.owner) && wrapper?.owner === base?.owner, 'wrapper e base têm o mesmo proprietário');

const aclWrapper = await db.query(`select has_function_privilege('authenticated','public.finalizar_feedback(uuid,text,text,text)','EXECUTE') as pode`);
const aclBase = await db.query(`select has_function_privilege('authenticated','public.finalizar_feedback_base(uuid,text,text,text)','EXECUTE') as pode`);
const aclAnon = await db.query(`select has_function_privilege('anon','public.finalizar_feedback(uuid,text,text,text)','EXECUTE') as pode`);
ok(aclWrapper.rows[0]?.pode === true, 'authenticated executa o wrapper');
ok(aclBase.rows[0]?.pode === false, 'authenticated não chama a base do wrapper diretamente');
ok(aclAnon.rows[0]?.pode === false, 'anon não executa o wrapper');

await setUid(RH);
await db.query(`select finalizar_feedback('${F1}','cancelar','Idempotência do cancelamento','hist-idem-1')`);
const idem = await db.query(`select finalizar_feedback('${F1}','cancelar','Idempotência do cancelamento','hist-idem-1') as r`);
ok(idem.rows[0]?.r?.idempotente === true, 'wrapper preserva idempotência da operação');
const auditCancel = await db.query(`select count(*)::int as n from audit_log where tabela='feedbacks_360' and registro_id='${F1}' and justificativa='Idempotência do cancelamento'`);
ok(auditCancel.rows[0]?.n === 1, 'reenvio idempotente não duplica auditoria');

await db.exec(ROLLBACK);
const aposRollback = await db.query(`
  select to_regprocedure('public.listar_historico_feedback(uuid)') as hist,
         to_regprocedure('public.finalizar_feedback_base(uuid,text,text,text)') as base,
         to_regprocedure('public.finalizar_feedback(uuid,text,text,text)') as wrapper
`);
ok(aposRollback.rows[0]?.hist === null, 'rollback remove a RPC de histórico');
ok(aposRollback.rows[0]?.base === null && aposRollback.rows[0]?.wrapper !== null, 'rollback restaura finalizar_feedback');
const colunas = await db.query(`
  select column_name from information_schema.columns
   where table_schema='public' and table_name='audit_log'
     and column_name in ('justificativa','status_anterior','status_posterior')
`);
ok(colunas.rows.length === 3, 'rollback preserva as colunas de auditoria (append-only)');

console.log(falhas === 0 ? '\nTodas as verificações passaram.' : `\n${falhas} verificação(ões) falharam.`);
if (falhas > 0) process.exitCode = 1;

