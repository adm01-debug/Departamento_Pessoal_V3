/**
 * TEMPORÁRIO — VERIFICADOR ESTRUTURAL DA MIGRATION DO NINE-BOX.
 *
 * Não há PostgreSQL local neste ambiente (sem psql, sem daemon do Docker, sem
 * pglite), então a revisão da ORDEM REAL de criação dos objetos — que é o que a
 * migration errava — é feita aqui, de forma automatizada e repetível:
 *
 *   2. envelope transacional (`begin;` primeiro, `commit;` último);
 *   3. ordem real: falha se `create policy`/`create index`/`alter table` citar
 *      tabela AINDA NÃO criada (a classe do bug de §0f) e se um nome de policy
 *      for definido duas vezes na mesma tabela;
 *   4. policies das tabelas auxiliares exigem PAPEL + EMPRESA;
 *   5. invariantes de segurança nas RPCs (ordem autorização × idempotência,
 *      faixa 1–5 da nota, hash completo, contexto empresarial dos IDs);
 *   6. ausência de DML fora de corpo de função;
 *   7. relatório em `tmp-ninebox-check.txt`.
 *
 * Uso: node scripts/_tmp-migration-ninebox-check.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CAMINHO = 'supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql';
const fonte = readFileSync(CAMINHO, 'utf8');

/* ─── 1) Tokenização: remove comentário e separa statements ───────────────── */
let dentroDollar = false;
const codigo = fonte.split(/\r?\n/).map((linha) => {
  const semComentario = linha.replace(/--.*$/, '');
  if (semComentario.split('$$').length - 1 === 1) dentroDollar = !dentroDollar;
  return semComentario;
});
void dentroDollar;

function statements(textoLinhas) {
  const out = [];
  let atual = [];
  let emString = false;
  let emDollar = false;
  for (const linha of textoLinhas) {
    let i = 0;
    let buffer = '';
    while (i < linha.length) {
      const c = linha[i];
      if (emDollar) {
        if (c === '$' && linha[i + 1] === '$') {
          emDollar = false;
          buffer += '$$';
          i += 2;
          continue;
        }
        buffer += c;
        i += 1;
        continue;
      }
      if (emString) {
        if (c === "'" && linha[i + 1] === "'") {
          buffer += "''";
          i += 2;
          continue;
        }
        if (c === "'") emString = false;
        buffer += c;
        i += 1;
        continue;
      }
      if (c === "'") {
        emString = true;
        buffer += c;
        i += 1;
        continue;
      }
      if (c === '$' && linha[i + 1] === '$') {
        emDollar = true;
        buffer += '$$';
        i += 2;
        continue;
      }
      if (c === ';') {
        const st = (atual.join(' ') + ' ' + buffer).trim();
        if (st) out.push(st);
        atual = [];
        buffer = '';
        i += 1;
        continue;
      }
      buffer += c;
      i += 1;
    }
    atual.push(buffer);
  }
  const resto = atual.join(' ').trim();
  if (resto) out.push(resto);
  return out;
}

const sts = statements(codigo);
const ok = [];
const falhas = [];
const checar = (condicao, mensagem) => (condicao ? ok : falhas).push(mensagem);

/* ─── 2) Envelope transacional ─────────────────────────────────────────────── */
checar(sts.length > 1 && /^begin$/i.test(sts[0]), `primeiro statement é "begin" (obtido: "${String(sts[0]).slice(0, 30)}")`);
checar(/^commit$/i.test(sts[sts.length - 1]), `último statement é "commit" (obtido: "${String(sts[sts.length - 1]).slice(0, 30)}")`);
checar(!sts.slice(1, -1).some((s) => /^(begin|commit|rollback)$/i.test(s)), 'nenhum begin/commit/rollback DENTRO do envelope');

/* ─── 3) Ordem real de criação dos objetos ─────────────────────────────────── */
const norm = (t) => t.toLowerCase().replace(/"/g, '').replace(/^public\./, '');
/** Tabelas que já existiam ANTES desta migration. */
const PRE = new Set(['feedbacks_360', 'colaboradores', 'ciclos_avaliacao', 'user_roles', 'audit_log']);
const criadas = new Set(PRE);
const eventos = [];
const policies = new Map();

for (const s of sts) {
  const mTab = s.match(/^create\s+table(?:\s+if\s+not\s+exists)?\s+([a-z0-9_.]+)/i);
  if (mTab) {
    const t = norm(mTab[1]);
    criadas.add(t);
    eventos.push(`TABLE   ${t}`);
    continue;
  }
  const mPol = s.match(/^create\s+(\w+\s+)?policy\s+("?[a-z0-9_]+"?)\s+on\s+([a-z0-9_.]+)/i);
  if (mPol) {
    const nome = mPol[2].replace(/"/g, '');
    const t = norm(mPol[3]);
    if (!criadas.has(t)) falhas.push(`policy ${nome}: tabela "${t}" usada ANTES de ser criada`);
    else ok.push(`policy ${nome} em ${t}: criada DEPOIS da tabela`);
    const chave = `${t}.${nome}`;
    if (policies.has(chave)) falhas.push(`policy ${chave}: definida DUAS vezes`);
    else policies.set(chave, s);
    eventos.push(`POLICY  ${nome} ON ${t}`);
    continue;
  }
  const mIdx = s.match(/^create\s+(\w+\s+)?index\s+(?:if\s+not\s+exists\s+)?\S+\s+on\s+([a-z0-9_.]+)/i);
  if (mIdx) {
    const t = norm(mIdx[2]);
    if (!criadas.has(t)) falhas.push(`index: tabela "${t}" usada ANTES de ser criada`);
    else ok.push(`index em ${t}: criado DEPOIS da tabela`);
    eventos.push(`INDEX   ON ${t}`);
    continue;
  }
  const mAlt = s.match(/^alter\s+table\s+([a-z0-9_.]+)/i);
  if (mAlt) {
    const t = norm(mAlt[1]);
    if (!criadas.has(t)) falhas.push(`alter table "${t}" ANTES de ser criada`);
    else ok.push(`alter table ${t}: aplicado DEPOIS da tabela`);
    eventos.push(`ALTER   ${t}`);
  }
}

/* ─── 4) Policies das tabelas auxiliares: PAPEL + EMPRESA ──────────────────── */
for (const [tabela, policy] of [
  ['feedbacks_360_operacoes', 'fbo_select'],
  ['feedbacks_360_validacoes_potencial', 'fvp_select'],
]) {
  const p = policies.get(`${tabela}.${policy}`);
  checar(!!p, `policy de SELECT existe em ${tabela}`);
  if (p) {
    checar(/pode_gerir_avaliacoes\s*\(\)/i.test(p), `policy de ${tabela}: exige PAPEL (pode_gerir_avaliacoes())`);
    checar(/get_user_empresas\s*\(/i.test(p), `policy de ${tabela}: exige EMPRESA (get_user_empresas)`);
  }
}

/* ─── 5) Invariantes de segurança dentro das RPCs ──────────────────────────── */
const corpo = (nome) => {
  const s = sts.find((x) => new RegExp(`^create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\s*\\(`, 'i').test(x));
  if (!s) falhas.push(`função public.${nome} não encontrada`);
  return s ?? '';
};
const pos = (t, re) => t.search(re);

/* 5.1 autorização → empresa → idempotência (reenvio não pode vir primeiro) */
for (const [nome, rePapel] of [
  ['finalizar_feedback', /pode_gerir_avaliacoes\s*\(\)/i],
  ['validar_potencial_avaliacao', /pode_validar_potencial\s*\(\)/i],
]) {
  const t = corpo(nome);
  const papel = pos(t, rePapel);
  const emp = pos(t, /get_user_empresas\s*\(/i);
  const idem = pos(t, /idempotency_key\s*=\s*v_chave/i);
  checar(papel > -1 && emp > -1 && idem > -1, `${nome}: papel, empresa e leitura de idempotência presentes`);
  checar(papel < idem, `${nome}: PAPEL conferido ANTES da idempotência (${papel} < ${idem})`);
  checar(emp < idem, `${nome}: EMPRESA conferida ANTES da idempotência (${emp} < ${idem})`);
  const lookup = t.slice(idem, t.indexOf(';', idem));
  checar(/empresa_id\s*=/i.test(lookup), `${nome}: reenvio restrito pela própria empresa`);
  checar(/feedback_id\s*=/i.test(lookup), `${nome}: reenvio restrito pelo próprio feedback`);
}

/* 5.2 criação: contexto empresarial dos IDs + hash completo */
{
  const t = corpo('criar_feedback_seguro');
  checar(/from\s+public\.colaboradores/i.test(t), 'criar_feedback_seguro: confere IDs em public.colaboradores');
  checar(/from\s+public\.ciclos_avaliacao/i.test(t), 'criar_feedback_seguro: confere ciclo em public.ciclos_avaliacao');
  checar(/avaliado_fora_da_empresa/.test(t), 'criar_feedback_seguro: erro avaliado_fora_da_empresa presente');
  checar(/avaliador_fora_da_empresa/.test(t), 'criar_feedback_seguro: erro avaliador_fora_da_empresa presente');
  checar(/ciclo_fora_da_empresa/.test(t), 'criar_feedback_seguro: erro ciclo_fora_da_empresa presente');
  const iHash = pos(t, /v_hash\s*:=/i);
  const hash = t.slice(iHash, iHash + 700);
  for (const campo of ['v_fortes', 'v_melhoria', 'v_comentario', 'p_avaliado_id', 'p_ciclo_id', 'p_avaliador_id', 'p_nota_geral', 'p_potencial']) {
    checar(hash.includes(campo), `criar_feedback_seguro: hash cobre ${campo}`);
  }
  const iIdem = pos(t, /idempotency_key\s*=\s*v_chave/i);
  const lookup = t.slice(iIdem, t.indexOf(';', iIdem));
  checar(/empresa_id\s*=\s*p_empresa_id/i.test(lookup), 'criar_feedback_seguro: reenvio restrito à mesma empresa');
}

/* 5.3 faixa 1–5 da nota na conclusão */
{
  const t = corpo('finalizar_feedback');
  checar(/v_nota\s*<\s*1\s+or\s+v_nota\s*>\s*5/i.test(t), 'finalizar_feedback: valida a nota na escala 1–5');
  checar(/nota_desempenho_fora_da_escala/.test(t), 'finalizar_feedback: erro nota_desempenho_fora_da_escala presente');
}

/* 5.4 versão canônica com precisão subsecundo */
{
  const t = corpo('versao_avaliacao_feedback');
  checar(/HH24:MI:SS\.US/.test(t), 'versao_avaliacao_feedback: versão com precisão de MICROSSEGUNDO');
}

/* ─── 6) Nenhum DML executado fora de corpo de função ──────────────────────── */
for (const s of sts) {
  if (/^create\s+or\s+replace\s+function/i.test(s) || /^do\s+\$\$/i.test(s)) continue;
  if (/^(insert|update|delete|truncate)\b/i.test(s)) falhas.push(`DML fora de função: "${s.slice(0, 60)}"`);
}

/* ─── 7) Scripts de docs: gate de pré-aplicação e roteiro de segurança ─────── */
{
  const semComentarios = (p) =>
    readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.replace(/--.*$/, ''))
      .join('\n');

  /* 7.1 pré-aplicação: SOMENTE LEITURA, gate completo, diagnóstico D1–D4 */
  const gate = semComentarios('docs/ninebox-pre-aplicacao.sql');
  checar(/^begin;/m.test(gate), 'pre-aplicacao: abre transacao explicita');
  checar(/^set transaction read only;/m.test(gate), 'pre-aplicacao: SET TRANSACTION READ ONLY presente');
  checar(/^rollback;/m.test(gate), 'pre-aplicacao: encerra em ROLLBACK (nada persiste)');
  const proibidos = gate.match(/^\s*(insert|update|delete|drop|alter|create|grant|revoke|truncate|comment)\b/gim) ?? [];
  checar(proibidos.length === 0, `pre-aplicacao: nenhuma escrita/DDL (encontrados: ${proibidos.length})`);
  for (const codigo of ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'A1', 'A2', 'A3']) {
    checar(new RegExp(`\\('${codigo}',`).test(gate), `pre-aplicacao: checagem ${codigo} presente no gate`);
  }
  for (const bloco of ['D1', 'D2', 'D3', 'D4']) {
    checar(new RegExp(`select '${bloco}' as bloco`).test(gate), `pre-aplicacao: bloco de diagnostico ${bloco} presente`);
  }
  const pii = gate.match(/\b(nome_completo|cpf|email|foto_url|celular|matricula)\b/gi) ?? [];
  checar(pii.length === 0, `pre-aplicacao: diagnostico nao projeta dado pessoal (encontrados: ${pii.length})`);

  /* 7.2 roteiro de segurança: casos 1..24 e rollback final */
  const roteiro = readFileSync('docs/ninebox-testes-seguranca.sql', 'utf8');
  checar(/^rollback;/m.test(roteiro), 'testes-seguranca: encerra em ROLLBACK (nenhum registro de teste permanece)');
  const faltando = [];
  for (let n = 1; n <= 24; n++) {
    if (!new RegExp(`'${n} ·`).test(roteiro)) faltando.push(n);
  }
  checar(faltando.length === 0, `testes-seguranca: casos 1..24 presentes${faltando.length ? ` (faltam ${faltando.join(',')})` : ''}`);
  checar(
    /'24 · apos reabrir, EXIGE nova validacao de Potencial pelo RH'/.test(roteiro),
    'testes-seguranca: caso 24 prova a exigencia de NOVA validacao do RH'
  );
  checar(
    /v_vigentes\s*=\s*0\s+and\s+v_vigentes_novo\s*=\s*1/.test(roteiro),
    'testes-seguranca: caso 24 exige 0 vigentes antes e 1 depois'
  );
}


/* ─── 7) Relatório ─────────────────────────────────────────────────────────── */
const relatorio = [
  `arquivo: ${CAMINHO}`,
  `statements: ${sts.length}`,
  '',
  '--- ordem real de criação (eventos) ---',
  ...eventos.map((e) => '  ' + e),
  '',
  ...ok.map((m) => '  OK    ' + m),
  ...falhas.map((m) => '  FALHA ' + m),
  '',
  JSON.stringify({ verificacoes: ok.length + falhas.length, ok: ok.length, falhas: falhas.length }, null, 2),
].join('\n');
writeFileSync('tmp-ninebox-check.txt', relatorio, 'utf8');
console.log(relatorio);
process.exitCode = falhas.length === 0 ? 0 : 1;

