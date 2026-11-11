import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assertBlocking, conditionOf, jobOf, onlyStep, permission, shellCode, stepsOf } from './workflow-test-support.mjs';
import { avaliarSla, nivel, relatorio } from './sla-code-scanning.mjs';

const AGORA = Date.parse('2026-10-15T12:00:00Z');
const diasAtras = (d) => new Date(AGORA - d * 86_400_000).toISOString();
const alerta = (number, rule, dias) => ({ number, rule, created_at: diasAtras(dias), most_recent_instance: { location: { path: 'src/x.ts' } } });

test('nível vem de security_severity_level; sem ele, error conta como alto (o defeito de rule.severity)', () => {
  assert.equal(nivel({ rule: { security_severity_level: 'high', severity: 'warning' } }), 'high');
  assert.equal(nivel({ rule: { security_severity_level: 'Critical' } }), 'critical');
  assert.equal(nivel({ rule: { severity: 'error' } }), 'high');
  assert.equal(nivel({ rule: { severity: 'warning' } }), 'low');
  assert.equal(nivel({}), 'low');
});

test('high vence com 15 dias; medium só depois de 30', () => {
  const r = avaliarSla([
    alerta(1, { id: 'js/a', security_severity_level: 'high' }, 15),
    alerta(2, { id: 'js/b', security_severity_level: 'high' }, 14),
    alerta(3, { id: 'js/c', security_severity_level: 'medium' }, 29),
    alerta(4, { id: 'js/d', security_severity_level: 'medium' }, 31),
  ], AGORA);
  assert.equal(r.total, 4);
  assert.deepEqual(r.violacoes, [
    'HIGH (15d > 14d) — #1: js/a em src/x.ts',
    'MEDIUM (31d > 30d) — #4: js/d em src/x.ts',
  ]);
});

test('CodeQL 292/293: location.path hostil não rompe a cerca de código (mesma classe já corrigida em actions-kpi.mjs)', () => {
  const hostil = {
    number: 5,
    rule: { id: 'js/foo', security_severity_level: 'high' },
    created_at: diasAtras(20),
    most_recent_instance: { location: { path: 'a\n```\n<img src=x onerror=alert(1)>\n```\nb' } },
  };
  const r = avaliarSla([hostil], AGORA);
  assert.equal(r.violacoes.length, 1);
  assert.ok(!r.violacoes[0].includes('`'), `backtick sobrevivente romperia a cerca: ${r.violacoes[0]}`);
  assert.ok(!r.violacoes[0].includes('\n'), `quebra de linha sobrevivente romperia a cerca: ${r.violacoes[0]}`);
});

test('corte em 200 chars não corta um par substituto (surrogate pair) pela metade', () => {
  // '🎉' (U+1F389) são 2 code units UTF-16 (D83C DF89): com 199 chars antes dele,
  // o corte em 200 caía bem na metade do par, sobrando D83C sozinho no fim —
  // Buffer/JSON.stringify trocam isso por U+FFFD em silêncio ao serializar.
  const emoji = String.fromCodePoint(0x1f389);
  const path = 'a'.repeat(199) + emoji + 'resto-que-deveria-ser-cortado';
  const r = avaliarSla([{
    number: 9,
    rule: { id: 'js/x', security_severity_level: 'high' },
    created_at: diasAtras(20),
    most_recent_instance: { location: { path } },
  }], AGORA);
  const linha = r.violacoes[0];
  const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(linha);
  assert.ok(!loneSurrogate, `surrogate solto sobrevivendo ao corte: ${JSON.stringify(linha.slice(-10))}`);
  assert.equal(Buffer.from(linha, 'utf8').toString('utf8'), linha, 'ida e volta por UTF-8 tem que preservar o texto (sem U+FFFD)');
});

test('\\v e \\f também são neutralizados (hardening: CommonMark só trata \\r/\\n como quebra de linha de verdade, mas ficam no mesmo grupo)', () => {
  const c = String.fromCharCode;
  const path = 'a' + c(0x0b) + c(0x0c) + 'b';
  const r = avaliarSla([{
    number: 10,
    rule: { id: 'js/y', security_severity_level: 'high' },
    created_at: diasAtras(20),
    most_recent_instance: { location: { path } },
  }], AGORA);
  const linha = r.violacoes[0];
  for (const n of [0x0b, 0x0c]) {
    assert.ok(!linha.includes(c(n)), `caractere 0x${n.toString(16)} deveria ter sido neutralizado`);
  }
});

test('created_at ausente/inválido não é ignorado em silêncio — avisa e segue, nunca mascara a violação como "não vencida"', () => {
  const semData = { number: 1, rule: { id: 'js/a', security_severity_level: 'high' }, most_recent_instance: {} };
  const dataInvalida = { ...semData, number: 2, created_at: 'não-é-data' };
  const original = console.error;
  const avisos = [];
  console.error = (msg) => avisos.push(msg);
  let r;
  try {
    r = avaliarSla([semData, dataInvalida], AGORA);
  } finally {
    console.error = original;
  }
  assert.equal(r.total, 2);
  assert.deepEqual(r.violacoes, [], 'nenhum dos dois pode entrar em violacoes sem data válida para calcular dias vencidos');
  assert.equal(avisos.filter((m) => m.includes('::warning::W83')).length, 2, 'cada alerta sem data válida tem que avisar');
});

test('relatório: sem violação diz isso; com violação lista em bloco', () => {
  assert.match(relatorio({ total: 0, violacoes: [] }), /Alertas abertos: 0[\s\S]*Nenhuma violação/);
  assert.match(relatorio({ total: 1, violacoes: ['HIGH x'] }), /Violações de SLA[\s\S]*HIGH x/);
});

const SCRIPT = new URL('./sla-code-scanning.mjs', import.meta.url).pathname;
const cli = (entrada) => spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', input: entrada });

test('CLI: lê o JSON do stdin, sai 1 com violação e 0 sem', () => {
  const r1 = cli(JSON.stringify([{ number: 9, rule: { id: 'js/z', security_severity_level: 'high' }, created_at: '2020-01-01T00:00:00Z' }]));
  assert.equal(r1.status, 1);
  assert.match(r1.stdout, /#9: js\/z/);
  assert.match(r1.stderr, /::error::W83/);
  const r0 = cli('[]');
  assert.equal(r0.status, 0);
  assert.match(r0.stdout, /Nenhuma violação/);
});

test('CLI: resposta que não é lista (erro de permissão) ou JSON inválido avisa e não bloqueia', () => {
  for (const entrada of [JSON.stringify({ message: 'Resource not accessible by integration' }), 'não é json', '']) {
    const r = cli(entrada);
    assert.equal(r.status, 0, entrada);
    assert.match(r.stderr, /::warning::W83/);
  }
});

test('o workflow passa os alertas pelo stdin e não tem mais Node inline', () => {
  const wf = readFileSync(new URL('../../.github/workflows/branch-hygiene-audit.yml', import.meta.url), 'utf8');
  const job = jobOf(wf, 'audit');
  const step = onlyStep(stepsOf(job), (s) => /^\s*node scripts\/ci\/sla-code-scanning\.mjs\b/m.test(shellCode(s)), 'SLA W83');
  const code = shellCode(step);
  assert.equal(permission(job, 'security-events'), 'read');
  assert.equal(conditionOf(step), 'success()');
  assertBlocking(job, 4);
  assertBlocking(step);
  assert.match(code, /node scripts\/ci\/sla-code-scanning\.mjs < "\$ARQUIVO"/);
  assert.match(code, /gh api --paginate --slurp[^\n]*code-scanning\/alerts[^\n]*\| jq 'add'/);
  assert.doesNotMatch(code, /\|\|\s*true|NODE_EOF|node --input-type=module/);
});
