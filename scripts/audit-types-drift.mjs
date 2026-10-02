#!/usr/bin/env node

/**
 * Ratchet de drift: tabela criada em migration/baseline sem entrada em
 * `src/integrations/supabase/types.ts`.
 *
 * Cada tabela nova sem tipo correspondente é uma janela para queries
 * untyped (`.from('qualquer_coisa' as never)` / casts manuais). O baseline
 * versionado lista as tabelas já divergentes; novas divergências reprovam.
 *
 * Limitação conhecida: types.ts é gerado por `supabase gen types` e só pode
 * ficar 100% correto quando o schema vivo estiver reconciliado com o repo.
 * Por isso o baseline existe — cobre o estado atual sem fingir que ele é zero.
 *
 * Uso:
 *   node scripts/audit-types-drift.mjs            # falha se surgiu divergência nova
 *   node scripts/audit-types-drift.mjs --write    # regrava o baseline (após revisar)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const baselinePath = resolve(root, 'scripts/.types-drift-baseline.json');
const write = process.argv.includes('--write');

// Palavras-chave SQL que podem aparecer logo após "CREATE TABLE" em DDL
// incomum (partições, tabelas temporárias de teste) — nunca são nomes de tabela.
const KEYWORDS = new Set([
  'for', 'if', 'in', 'to', 'was', 'with', 'do', 'does', 'as', 'on', 'of',
  'or', 'the', 'a', 'and', 'not', 'is', 'temp', 'temporary', 'unlogged',
]);

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function collect(dir) {
  const sqls = [];
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.sql')) sqls.push(readFileSync(resolve(dir, f), 'utf8'));
  }
  return sqls.map(stripComments).join('\n');
}

const allSql = collect(resolve(root, 'supabase/migrations')) + '\n' + collect(resolve(root, 'supabase/baseline'));

const created = new Set();
for (const m of allSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi)) {
  created.add(m[1].toLowerCase());
}
const dropped = new Set();
for (const m of allSql.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)/gi)) {
  dropped.add(m[1].toLowerCase());
}
const live = [...created].filter((t) => !dropped.has(t) && !KEYWORDS.has(t)).sort((a, b) => a.localeCompare(b));

const types = readFileSync(resolve(root, 'src/integrations/supabase/types.ts'), 'utf8');
const tablesSection = types.includes('Tables: {')
  ? types.split('Tables: {')[1].split('Functions:')[0]
  : types;
const typed = new Set();
for (const m of tablesSection.matchAll(/^\s{6}(\w+):\s*\{$/gm)) {
  typed.add(m[1].toLowerCase());
}

const missing = live.filter((t) => !typed.has(t)).sort((a, b) => a.localeCompare(b));

if (write) {
  writeFileSync(baselinePath, JSON.stringify(missing, null, 2) + '\n');
  console.log(`✅ Baseline gravado: ${missing.length} tabela(s) sem tipo.`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
} catch {
  console.error(`❌ Baseline não encontrado em ${baselinePath}. Rode com --write para criar.`);
  process.exit(1);
}

const baselineSet = new Set(baseline);
const newMissing = missing.filter((t) => !baselineSet.has(t));
const resolved = baseline.filter((t) => !missing.includes(t));

if (newMissing.length === 0) {
  console.log(
    `✅ Drift de tipos sob controle: ${missing.length}/${live.length} tabela(s) sem tipo ` +
    `(${baseline.length} no baseline).`,
  );
  if (resolved.length > 0) {
    console.log(
      `ℹ️  ${resolved.length} tabela(s) do baseline já têm tipo — rode com --write para reduzir o baseline:`,
      resolved.join(', '),
    );
  }
  process.exit(0);
}

console.error(`❌ ${newMissing.length} tabela(s) nova(s) sem entrada em types.ts:`);
for (const t of newMissing) console.error(`   - ${t}`);
console.error(
  '\nCorrija regenerando os tipos (scripts/regenerate-supabase-types.sh) ou, se a tabela\n' +
  'for intencionalmente interna/descartada, documente a exceção no baseline com --write.',
);
process.exit(1);
