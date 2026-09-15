#!/usr/bin/env node

/**
 * `any` explícito é dívida medida, não proibida — mas só pode diminuir.
 *
 * Conta ocorrências de @typescript-eslint/no-explicit-any por diretório de
 * topo sob `src/` usando a própria API do ESLint (não grep: cobre `any` em
 * genéricos, arrays, JSX e retornos, não só `: any`/`as any` literal) e
 * compara com o baseline versionado. Nenhum diretório pode subir; qualquer
 * um pode descer, e `--write` grava a redução.
 *
 * Uso:
 *   node scripts/ratchet-any.mjs            # falha se algum diretório subiu
 *   node scripts/ratchet-any.mjs --write    # atualiza o baseline (só após revisar a redução)
 */
import { ESLint } from 'eslint';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const baselinePath = resolve(root, 'scripts/.any-baseline.json');
const write = process.argv.includes('--write');

const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);

const RULE = '@typescript-eslint/no-explicit-any';
/** @type {Record<string, number>} */
const current = {};
/** @type {Array<{file: string, line: number}>} */
const violations = [];

for (const result of results) {
  const anyMessages = result.messages.filter((m) => m.ruleId === RULE);
  if (anyMessages.length === 0) continue;

  const relPath = relative(root, result.filePath);
  // Chave = primeiro segmento sob src/ (services, pages, hooks, components, ...).
  const parts = relPath.split('/');
  const key = parts[0] === 'src' ? parts[1] : parts[0];
  current[key] = (current[key] ?? 0) + anyMessages.length;

  for (const m of anyMessages) {
    violations.push({ file: `${relPath}:${m.line}`, line: m.line });
  }
}

const totalCurrent = Object.values(current).reduce((a, b) => a + b, 0);

if (write) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`✅ Baseline gravado: ${Object.keys(sorted).length} diretório(s), ${totalCurrent} ocorrência(s) totais.`);
  console.log('Lembre-se de alinhar --max-warnings em package.json#scripts.lint:ci ao novo total.');
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
    failures.push(`  ❌ src/${dir}: ${before} → ${after} (+${after - before}) — regressão de \`any\``);
  }
}

const totalBaseline = Object.values(baseline).reduce((a, b) => a + b, 0);

if (failures.length > 0) {
  console.error(`Orçamento de \`any\` regrediu em ${failures.length} diretório(s):\n`);
  console.error(failures.join('\n'));
  console.error(
    `\nTotal: baseline=${totalBaseline} atual=${totalCurrent}. Corrija o \`any\` novo ou, se for uma redução ` +
      'legítima em outro lugar que compensa, isso ainda reprova — o orçamento é por diretório, não só a soma.'
  );
  process.exit(1);
}

console.log(
  `✅ Orçamento de \`any\` sem regressão (baseline=${totalBaseline}, atual=${totalCurrent}` +
    (totalCurrent < totalBaseline ? `, -${totalBaseline - totalCurrent} — rode --write para gravar` : '') +
    ').'
);
