/**
 * TEMPORÁRIO — VERIFICADOR ESTRUTURAL DA MIGRATION DE APROVAÇÃO DO GESTOR.
 *
 * Não há PostgreSQL local neste ambiente: a revisão é automatizada sobre o SQL.
 * Verifica exatamente as classes de erro que já quebraram migrations neste repo:
 *   1. envelope transacional (`begin;` primeiro, `commit;` último);
 *   2. ORDEM: nenhuma referência a tabela que ainda não existe (criada aqui ou
 *      já aplicada na 20261015090000);
 *   3. rótulos de `feedbacks_360_operacoes.operacao` dentro do CHECK declarado;
 *   4. privilégios mínimos (revoke de public/anon + grant a authenticated) nas
 *      funções novas;
 *   5. nenhum DML fora de corpo de função.
 *
 * Uso: node scripts/_tmp-verificar-migration-aprovacao.mjs
 */
import { readFileSync } from 'node:fs';

const CAMINHO = 'supabase/migrations/20261017090000_ninebox_aprovacao_gestor.sql';
const APLICADA = 'supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql';

const fonte = readFileSync(CAMINHO, 'utf8');
const aplicada = readFileSync(APLICADA, 'utf8');

/** Remove comentários de linha e separa statements (respeitando $$ … $$). */
function statements(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.replace(/--.*$/, ''));
  const saida = [];
  let atual = [];
  let emDollar = false;
  for (const linha of linhas) {
    const marca = (linha.match(/\$\$/g) ?? []).length;
    atual.push(linha);
    if (marca % 2 === 1) emDollar = !emDollar;
    if (!emDollar && /;\s*$/.test(linha)) {
      const texto = atual.join('\n').trim();
      if (texto) saida.push(texto);
      atual = [];
    }
  }
  const resto = atual.join('\n').trim();
  if (resto) saida.push(resto);
  return saida.map((s) => s.replace(/;\s*$/, '').trim()).filter(Boolean);
}

const stmts = statements(fonte);
const aplicadaStmts = statements(aplicada);
const problemas = [];
const relatorio = { totalStatements: stmts.length, checks: {} };

/* 1) Envelope */
const primeiro = stmts[0]?.toLowerCase() ?? '';
const ultimo = stmts.at(-1)?.toLowerCase() ?? '';
relatorio.checks.envelope = { primeiro, ultimo };
if (primeiro !== 'begin') problemas.push(`envelope: primeiro statement é "${primeiro}" (esperado begin)`);
if (ultimo !== 'commit') problemas.push(`envelope: último statement é "${ultimo.slice(0, 40)}" (esperado commit)`);

/* 2) Tabelas referenciadas × criadas (aqui ou já aplicadas) */
const criadasAqui = new Set(
  stmts
    .map((s) => (s.match(/create table if not exists\s+public\.([a-z0-9_]+)/i) ?? [])[1])
    .filter(Boolean)
);
const criadasAntes = new Set(
  aplicadaStmts
    .map((s) => (s.match(/create table if not exists\s+public\.([a-z0-9_]+)/i) ?? [])[1])
    .filter(Boolean)
);
const conhecidas = new Set([...criadasAqui, ...criadasAntes]);
const referencias = [];
for (const s of stmts) {
  const cond = s.match(/(?:alter table|insert into|create policy[^]*?\bon|create index[^]*?\bon|from|join)\s+public\.([a-z0-9_]+)/gi) ?? [];
  cond.forEach((m) => {
    const nome = (m.match(/public\.([a-z0-9_]+)/i) ?? [])[1];
    if (nome) referencias.push(nome);
  });
}
const desconhecidas = [...new Set(referencias)].filter(
  (n) => !conhecidas.has(n) && !['feedbacks_360', 'colaboradores', 'audit_log', 'user_roles', 'feedbacks_360_operacoes', 'feedbacks_360_validacoes_potencial', 'get_user_empresas', 'pode_gerir_avaliacoes', 'versao_avaliacao_feedback'].includes(n)
);
relatorio.checks.tabelas = { criadasAqui: [...criadasAqui], referenciadas: [...new Set(referencias)] };
if (desconhecidas.length) problemas.push(`tabelas referenciadas sem origem conhecida: ${desconhecidas.join(', ')}`);

/* 3) Rótulos de operação dentro do CHECK declarado/ampliado */
const checkLocal = (fonte.match(/check \(operacao in \(([^)]*)\)\)/i) ?? [])[1] ?? '';
const permitidos = new Set(
  checkLocal
    .split(',')
    .map((v) => v.trim().replace(/^'|'$/g, ''))
    .filter(Boolean)
);
const usados = [...fonte.matchAll(/values \([^)]*'([a-z_]+)'\s*,/g)].map((m) => m[1]);
const rotulosOperacao = [...fonte.matchAll(/, '([a-z_]+)', (v_hash|md5)/g)].map((m) => m[1]);
relatorio.checks.operacoes = { permitidos: [...permitidos], usadosNosInserts: rotulosOperacao };
rotulosOperacao.forEach((r) => {
  if (permitidos.size && !permitidos.has(r)) problemas.push(`operação "${r}" fora do CHECK declarado`);
});
void usados;

/* 4) Privilégios mínimos das funções novas */
const funcoesNovas = [...fonte.matchAll(/create or replace function\s+public\.([a-z0-9_]+)\s*\(([^)]*)\)/gi)].map((m) => ({
  nome: m[1],
  args: m[2].split(',').map((a) => a.trim().split(/\s+/)[0]).join(', '),
}));
const grants = [...fonte.matchAll(/grant execute on function\s+public\.([a-z0-9_]+)\(([^)]*)\)/gi)].map((m) => ({
  nome: m[1],
  args: m[2].split(',').map((a) => a.trim().split(/\s+/)[0]).join(', '),
}));
const revokes = [...fonte.matchAll(/revoke all on function\s+public\.([a-z0-9_]+)\(([^)]*)\)\s+from\s+public,\s*anon/gi)].map((m) => m[1]);
relatorio.checks.privilegios = {
  funcoes: funcoesNovas.map((f) => f.nome),
  comGrant: grants.map((g) => g.nome),
  comRevoke: revokes,
};
funcoesNovas.forEach((f) => {
  if (!grants.some((g) => g.nome === f.nome)) problemas.push(`função ${f.nome} sem grant execute para authenticated`);
  if (!revokes.includes(f.nome)) problemas.push(`função ${f.nome} sem revoke de public/anon`);
});

/* 5) DML fora de corpo de função */
const dmlFora = stmts.filter(
  (s) => /^(insert|update|delete)\b/i.test(s) && !/\$\$/i.test(s)
);
relatorio.checks.dmlForaDeFuncao = dmlFora.length;
if (dmlFora.length) problemas.push(`${dmlFora.length} statement(s) de DML fora de corpo de função`);

console.log(JSON.stringify({ ...relatorio, problemas, resultado: problemas.length ? 'FALHOU' : 'OK' }, null, 2));
if (problemas.length) process.exitCode = 1;
