#!/usr/bin/env node
/**
 * E43 — Orçamento de warnings ESLint por regra.
 *
 * Nenhuma regra pode subir; qualquer uma pode descer.
 * `--write` grava a redução (só após revisar a diferença).
 *
 * Uso:
 *   node scripts/ratchet-lint-warnings.mjs            # falha se alguma regra subiu
 *   node scripts/ratchet-lint-warnings.mjs --write    # atualiza o baseline
 */
import { ESLint } from 'eslint';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const budgetPath = resolve(root, 'scripts/.eslint-warnings-budget.json');
const write = process.argv.includes('--write');

const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);

/** @type {Record<string, number>} */
const current = {};
for (const result of results) {
  for (const msg of result.messages) {
    if (msg.severity !== 1) continue; // só warnings (1), não errors (2)
    const rule = msg.ruleId ?? '(unknown)';
    current[rule] = (current[rule] ?? 0) + 1;
  }
}

const budgetRaw = await readFile(budgetPath, 'utf-8');
const budget = JSON.parse(budgetRaw);

let failures = 0;
const newBudget = { ...budget };

for (const [rule, count] of Object.entries(current)) {
  const budgetCount = budget[rule] ?? 0;
  if (count > budgetCount) {
    console.error(`  FAIL: ${rule}: ${count} > ${budgetCount} (subiu ${count - budgetCount})`);
    failures++;
  } else if (count < budgetCount) {
    console.log(`  DOWN: ${rule}: ${count} < ${budgetCount} (reduziu ${budgetCount - count})`);
    if (write) newBudget[rule] = count;
  } else {
    console.log(`  ok:   ${rule}: ${count}`);
  }
}

// Regras no budget que sumiram do código (0 ocorrências)
for (const rule of Object.keys(budget)) {
  if (rule.startsWith('_')) continue;
  if (!(rule in current) && typeof budget[rule] === 'number' && budget[rule] > 0) {
    console.log(`  DOWN: ${rule}: 0 < ${budget[rule]} (eliminada)`);
    if (write) newBudget[rule] = 0;
  }
}

const totalCurrent = Object.values(current).reduce((a, b) => a + b, 0);
const totalBudget = typeof budget._total === 'number' ? budget._total : Infinity;
if (totalCurrent > totalBudget) {
  console.error(`  FAIL: total: ${totalCurrent} > ${totalBudget}`);
  failures++;
} else {
  console.log(`  ok:   total: ${totalCurrent} / ${totalBudget}`);
  if (write) newBudget._total = totalCurrent;
}

if (write) {
  await writeFile(budgetPath, JSON.stringify(newBudget, null, 2) + '\n');
  console.log(`\nBaseline atualizado: ${budgetPath}`);
}

if (failures > 0) {
  console.error(`\n${failures} regra(s) ultrapassaram o orçamento.\n`);
  process.exit(1);
}
console.log('\nOrçamento de warnings OK.\n');
