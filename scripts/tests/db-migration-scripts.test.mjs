// Regressões de scripts/db/classify-migration-drift.mjs e derive-pending-migrations.mjs.
// Rodar: node --test scripts/tests/db-migration-scripts.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';

const dbDir = resolve(import.meta.dirname, '../db');
const classify = join(dbDir, 'classify-migration-drift.mjs');
const derive = join(dbDir, 'derive-pending-migrations.mjs');

const work = mkdtempSync(join(tmpdir(), 'db-migration-scripts-'));
after(() => rmSync(work, { recursive: true, force: true }));

const migrations = join(work, 'migrations');
mkdirSync(migrations);
for (const file of [
  '20260101000000_a.sql',
  '20260102000000_b.sql',
  '20260102000000_b.verify.sql',
  '20260103000000_c.sql',
]) {
  writeFileSync(join(migrations, file), 'select 1;\n');
}
writeFileSync(join(work, 'ledger.json'), JSON.stringify([{ remote: '20260101000000' }]));

const run = (script, args, input = '') =>
  spawnSync(process.execPath, [script, ...args], { cwd: work, input, encoding: 'utf8' });

test('classify: sidecar .verify.sql não é migration nem duplica a versão', () => {
  const result = run(classify, ['--migrations', migrations, '--ledger-json', 'ledger.json']);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(readFileSync(join(work, 'migration-classification.summary.json'), 'utf8'));
  assert.equal(summary.local_files, 3);
  assert.deepEqual(summary.duplicate_versions, []);
  assert.doesNotMatch(readFileSync(join(work, 'migration-classification.csv'), 'utf8'), /verify\.sql/);
});

test('classify: --failed-file aceita caminho, não só o nome do arquivo', () => {
  const result = run(classify, [
    '--migrations', migrations,
    '--ledger-json', 'ledger.json',
    '--failed-file', join(migrations, '20260103000000_c.sql'),
  ]);
  assert.equal(result.status, 0, result.stderr);
  const row = readFileSync(join(work, 'migration-classification.csv'), 'utf8')
    .split('\n')
    .find((line) => line.includes('20260103000000_c.sql'));
  assert.match(row, /"falhou","obsoleta"/);
});

test('classify: --last-successful-ordinal não numérico reprova', () => {
  const result = run(classify, [
    '--migrations', migrations,
    '--ledger-json', 'ledger.json',
    '--last-successful-ordinal', 'abc',
  ]);
  assert.notEqual(result.status, 0);
});

test('derive: --max-pending não numérico reprova em vez de desligar o gate', () => {
  const result = run(derive, ['--migrations-dir', migrations, '--max-pending', 'vinte']);
  assert.notEqual(result.status, 0);
});

test('derive: roda com espaço no caminho e por symlink (antes saía 0 sem saída)', () => {
  const spaced = join(work, 'dir com espaço');
  mkdirSync(spaced);
  cpSync(derive, join(spaced, 'derive.mjs'));
  const link = join(work, 'derive-link.mjs');
  symlinkSync(derive, link);
  for (const script of [join(spaced, 'derive.mjs'), link]) {
    const result = run(script, ['--migrations-dir', migrations], '20260101000000\n');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).pending_count, 2);
  }
});
