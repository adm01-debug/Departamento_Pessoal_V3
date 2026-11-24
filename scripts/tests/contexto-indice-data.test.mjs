// indice.py: fonte sem data de coleta verificável não pode aparecer como "ok".
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../regras_negocio/indice.py', import.meta.url));
const head = '1234567890123456789012345678901234567890';
const minutes = (delta) => new Date(Date.now() + delta * 60_000).toISOString();

// Fora de um repositório git e sem CHANGELOG: a única data possível é a do manifest.
function index(t, name, manifest) {
  const root = mkdtempSync(path.join(tmpdir(), 'contexto-indice-data-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'fonte'));
  writeFileSync(path.join(root, 'fonte', 'README.md'), '# Fonte de teste\n');
  writeFileSync(path.join(root, 'fonte', 'manifest.json'), JSON.stringify(manifest));
  execFileSync('python3', [script, '--repo', root, '--out', 'INDEX.md', '--head', head, '--remote', 'owner/repo',
    '--fonte', `${name}=fonte`], { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(root) } });
  return readFileSync(path.join(root, 'INDEX.md'), 'utf8');
}

for (const [label, manifest] of [
  ['ausente', { erros: [] }],
  ['ilegível', { gerado_em: 'ontem' }],
  ['numérica', { gerado_em: 1762732800 }],
  ['no futuro', { gerado_em: minutes(180) }],
]) {
  test(`banco com data de coleta ${label} fica não verificável`, (t) => {
    const output = index(t, 'banco real', manifest);
    assert.match(output, /\| não verificável · ⚠️ data da coleta ausente, inválida ou no futuro \|/);
    assert.doesNotMatch(output, /\| ok/);
    assert.doesNotMatch(output, /-\d+ min atrás/);
  });
}

test('diferença de relógio de poucos minutos entre runners continua ok', (t) => {
  assert.match(index(t, 'banco real', { gerado_em: minutes(2) }), /\| ok · 0 min atrás \|/);
});

test('código do mesmo commit dispensa a data; de commit desconhecido não', (t) => {
  assert.match(index(t, 'código', { commit: head }), /\| ok \|/);
  assert.match(index(t, 'código', {}), /\| não verificável ·/);
});

test('falha de coleta continua visível quando a data também é inválida', (t) => {
  assert.match(index(t, 'banco real', { gerado_em: 'ontem', erros: ['falha simulada'] }),
    /\| parcial · ⚠️ 1 erro\(s\) de coleta no manifest \(erros\); data da coleta ausente, inválida ou no futuro \|/);
});
