#!/usr/bin/env node

/**
 * Ratchet de `any` em ARQUIVOS DE TESTE (E51-029) — irmão de ratchet-any.mjs,
 * que cobre só src/** não-teste (o eslint.config.js ignora testes globalmente).
 *
 * Conta ocorrências de @typescript-eslint/no-explicit-any por diretório de
 * topo sob `src/` usando a config mínima scripts/eslint-tests-any.config.mjs
 * e compara com o baseline versionado. Nenhum diretório pode subir; qualquer
 * um pode descer, e `--write` grava a redução.
 *
 * Uso:
 *   node scripts/ratchet-any-tests.mjs            # falha se algum diretório subiu
 *   node scripts/ratchet-any-tests.mjs --write    # atualiza o baseline (só após revisar a redução)
 */
import { ESLint } from 'eslint';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const baselinePath = resolve(root, 'scripts/.any-tests-baseline.json');
const write = process.argv.includes('--write');

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: resolve(root, 'scripts/eslint-tests-any.config.mjs'),
  errorOnUnmatchedPattern: false,
});

const results = await eslint.lintFiles([
  'src/**/*.test.{ts,tsx}',
  'src/**/*.spec.{ts,tsx}',
  'src/**/__tests__/**/*.{ts,tsx}',
  'src/**/__mocks__/**/*.{ts,tsx}',
  // Helpers/fixtures fora dos padrões *.test/__tests__ — antes uma zona
  // cega onde `any` crescia invisível (src/test/, src/tests/).
  'src/test/**/*.{ts,tsx}',
  'src/tests/**/*.{ts,tsx}',
]);

const RULE = '@typescript-eslint/no-explicit-any';
/** @type {Record<string, number>} */
const current = {};
const seen = new Set();

for (const result of results) {
  if (seen.has(result.filePath)) continue;
  seen.add(result.filePath);
  const anyMessages = result.messages.filter((m) => m.ruleId === RULE);
  if (anyMessages.length === 0) continue;
  const parts = relative(root, result.filePath).split('/');
  const key = parts[0] === 'src' ? parts[1] : parts[0];
  current[key] = (current[key] ?? 0) + anyMessages.length;
}

const totalCurrent = Object.values(current).reduce((a, b) => a + b, 0);

if (write) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`✅ Baseline de testes gravado: ${Object.keys(sorted).length} diretório(s), ${totalCurrent} ocorrência(s) totais.`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
} catch (err) {
  console.error(`❌ Baseline ausente ou inválido em ${relative(root, baselinePath)}: ${err.message}`);
  console.error('   Rode com --write para criar um baseline inicial após revisão.');
  process.exit(1);
}

const failures = [];
const allDirs = new Set([...Object.keys(baseline), ...Object.keys(current)]);
for (const dir of [...allDirs].sort()) {
  const before = baseline[dir] ?? 0;
  const after = current[dir] ?? 0;
  if (after > before) {
    failures.push(`  ❌ src/${dir}: ${before} → ${after} (+${after - before}) — regressão de \`any\` em testes`);
  }
}

const totalBaseline = Object.values(baseline).reduce((a, b) => a + b, 0);

if (failures.length > 0) {
  console.error(`Orçamento de \`any\` em testes regrediu em ${failures.length} diretório(s):\n`);
  console.error(failures.join('\n'));
  console.error(`\nTotal: baseline=${totalBaseline} atual=${totalCurrent}.`);
  process.exit(1);
}

console.log(
  `✅ Orçamento de \`any\` em testes sem regressão (baseline=${totalBaseline}, atual=${totalCurrent}` +
    (totalCurrent < totalBaseline ? `, -${totalBaseline - totalCurrent} — rode --write para gravar` : '') +
    ').'
);
