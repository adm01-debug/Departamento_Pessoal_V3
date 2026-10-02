/**
 * E51-030 — Orçamento de bundle.
 * Mede dist/assets após `npm run build` e reprova se algum limite do
 * baseline (scripts/.bundle-budget.json) for excedido. A dívida só pode
 * descer: para afrouxar um limite é preciso editar o baseline com
 * `--write`, o que fica explícito no diff do PR.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const distAssets = join(root, 'dist', 'assets');
const baselinePath = join(root, 'scripts', '.bundle-budget.json');
const writeMode = process.argv.includes('--write');

if (!existsSync(distAssets)) {
  console.error('dist/assets não existe — rode `npm run build` antes.');
  process.exit(1);
}

function dirBytes(dir, ext) {
  let total = 0;
  let max = { name: '', bytes: 0 };
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (!statSync(p).isFile() || !f.endsWith(ext)) continue;
    const b = statSync(p).size;
    total += b;
    if (b > max.bytes) max = { name: f, bytes: b };
  }
  return { total, max };
}

const js = dirBytes(distAssets, '.js');
const css = dirBytes(distAssets, '.css');

const KB = 1024;
const measured = {
  js_total_kb: Math.ceil(js.total / KB),
  js_max_chunk_kb: Math.ceil(js.max.bytes / KB),
  css_total_kb: Math.ceil(css.total / KB),
};

if (writeMode) {
  writeFileSync(baselinePath, JSON.stringify(measured, null, 2) + '\n');
  console.log(`✅ Baseline de bundle gravado: ${JSON.stringify(measured)}`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error(`Baseline ausente: ${baselinePath}\nRode com --write para criar.`);
  process.exit(1);
}

const budget = JSON.parse(readFileSync(baselinePath, 'utf-8'));
let failures = 0;

for (const key of Object.keys(measured)) {
  const lim = budget[key];
  const val = measured[key];
  if (lim === undefined) {
    console.error(`  FAIL: métrica "${key}" sem baseline (${val} KB medido)`);
    failures++;
  } else if (val > lim) {
    console.error(`  FAIL: ${key} = ${val} KB > limite ${lim} KB (+${val - lim} KB)`);
    failures++;
  } else {
    console.log(`  ok: ${key} = ${val} KB ≤ ${lim} KB`);
  }
}

console.log(`\nMaior chunk JS: ${js.max.name} (${Math.round(js.max.bytes / KB)} KB)`);

if (failures > 0) {
  console.error(`\n❌ ${failures} limite(s) de bundle excedido(s).`);
  process.exit(1);
}
console.log('\n✅ Bundle dentro do orçamento.');
