#!/usr/bin/env node
/**
 * Gera src/schemas/tableColumns.ts a partir dos tipos do Supabase
 * (src/integrations/supabase/types.ts): mapa tabela → colunas usado pelo
 * validateTablePayload para rejeitar chaves desconhecidas em escritas.
 *
 * Uso:
 *   node scripts/gen-table-columns.mjs           # reescreve o arquivo gerado
 *   node scripts/gen-table-columns.mjs --check   # falha se o gerado estiver stale (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TYPES = 'src/integrations/supabase/types.ts';
const OUT = 'src/schemas/tableColumns.ts';

const src = readFileSync(TYPES, 'utf8');
const tablesSection = src.split('    Tables: {')[1]?.split('    Views: {')[0];
if (!tablesSection) {
  console.error(`Não achei a seção Tables em ${TYPES}`);
  process.exit(1);
}

const tables = {};
const re = /^      (\w+): \{\n        Row: \{\n((?:          [^\n]*\n)+)/gm;
let m;
while ((m = re.exec(tablesSection))) {
  const cols = [...m[2].matchAll(/^          (\w+):/gm)].map((c) => c[1]);
  tables[m[1]] = cols;
}

const header = `/**
 * GERADO por scripts/gen-table-columns.mjs — não editar à mão.
 * Rodar \`npm run gen:table-columns\` após regenerar types.ts.
 */
export const TABLE_COLUMNS: Record<string, readonly string[]> = {
`;

const body = Object.entries(tables)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([t, cols]) => `  ${JSON.stringify(t)}: [${cols.map((c) => JSON.stringify(c)).join(', ')}],`)
  .join('\n');

// O arquivo commitado passa pelo prettier (hook de format:check), então o
// conteúdo gerado precisa ser formatado igual — senão --check e o pre-commit
// discordam eternamente.
function prettierFormat(input) {
  try {
    return execFileSync('npx', ['prettier', '--stdin-filepath', OUT], {
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Sem prettier no ambiente (ex.: CI minimal) — compara sem formatar.
    return input;
  }
}

const out = prettierFormat(`${header}${body}\n} as const;\n`);

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    console.error(`tableColumns.ts ausente — rode npm run gen:table-columns`);
    process.exit(1);
  }
  if (current !== out) {
    console.error(`tableColumns.ts desatualizado — rode npm run gen:table-columns e commite o resultado`);
    process.exit(1);
  }
  console.log(`✅ tableColumns.ts em dia (${Object.keys(tables).length} tabelas)`);
} else {
  writeFileSync(OUT, out);
  console.log(`Gerado ${OUT}: ${Object.keys(tables).length} tabelas`);
}
