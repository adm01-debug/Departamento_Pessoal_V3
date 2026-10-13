#!/usr/bin/env node
/**
 * Canonical read-only SQL diagnostic runner.
 *
 * Runs a single SELECT/WITH/EXPLAIN/SHOW statement against SUPABASE_DB_URL
 * inside a READ ONLY transaction with guaranteed ROLLBACK — no write can
 * succeed even if the statement embeds DML in a CTE or calls a function.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://..." DIAG_QUERY="SELECT ..." node scripts/diag/run-sql-diag.mjs
 *
 * Requires psql (postgresql-client) in PATH.
 */

import { spawnSync } from 'node:child_process';

const DB_URL = process.env.SUPABASE_DB_URL;
const QUERY = (process.env.DIAG_QUERY ?? '').trim();
const MAX_ROWS = Number(process.env.DIAG_MAX_ROWS ?? '300');

if (!DB_URL) {
  console.error('::error::SUPABASE_DB_URL is required');
  process.exit(1);
}
if (!QUERY) {
  console.error('::error::DIAG_QUERY is required');
  process.exit(1);
}

// Single statement only: no semicolons except an optional trailing one.
const stripped = QUERY.replace(/;+\s*$/, '');
if (stripped.includes(';')) {
  console.error('::error::somente UMA instrução é permitida (sem ponto-e-vírgula interno)');
  process.exit(1);
}
if (!/^(select|with|explain|show)\b/i.test(stripped)) {
  console.error('::error::somente SELECT/WITH/EXPLAIN/SHOW são permitidos');
  process.exit(1);
}

// Belt-and-suspenders on top of the READ ONLY transaction: obvious DDL/DML
// keywords are rejected so accidental paste of a migration fails fast.
// String literals and dollar-quoted bodies are stripped first — a legitimate
// filter like `jobname LIKE '%update%'` must not trip the blocklist.
const codeOnly = stripped
  .replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, '$$')
  .replace(/'(?:[^']|'')*'/g, "''");
const FORBIDDEN_RE =
  /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|call|copy|vacuum|cluster|reindex|comment|discard|prepare|execute|deallocate|declare|fetch|move|listen|unlisten|notify|import|checkpoint|load|refresh|lock|set|reset|begin|commit|rollback|start)\b/i;
if (FORBIDDEN_RE.test(codeOnly)) {
  const kw = codeOnly.match(FORBIDDEN_RE)?.[1];
  console.error(`::error::palavra-chave não permitida em diagnóstico read-only: "${kw}"`);
  process.exit(1);
}

// Hard guard: READ ONLY transaction — Postgres rejects any write attempt.
const sql = `BEGIN TRANSACTION READ ONLY;\n${stripped};\nROLLBACK;`;

const result = spawnSync(
  'psql',
  [DB_URL, '--no-psqlrc', '-X', '-q', '-P', 'pager=off', '-v', 'ON_ERROR_STOP=1', '-c', sql],
  { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
);

if (result.error) {
  console.error(`::error::falha ao executar psql: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error('::error::a consulta falhou no canônico');
  console.error(result.stderr);
  process.exit(1);
}

const lines = result.stdout.split('\n');
if (lines.length > MAX_ROWS) {
  console.log(lines.slice(0, MAX_ROWS).join('\n'));
  console.log(`\n… saída truncada em ${MAX_ROWS} linhas (${lines.length} no total)`);
} else {
  console.log(result.stdout);
}
