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

import { spawn } from 'node:child_process';

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

// Strip literals, dollar-quoted bodies and comments before token checks —
// a `;` or keyword inside 'text' or -- comment is data, not syntax.
// Sequential scanner mirroring the Postgres lexer: regex stripping in ANY
// order can be bypassed (a '--' inside /* */ hides the rest of the line; a
// '/*' inside -- hides a block-comment span and swallows real statements).
// Block comments nest in Postgres, so depth is tracked.
function stripSqlComments(input) {
  let out = '';
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    const two = input.slice(i, i + 2);
    if (two === '--') {
      while (i < n && input[i] !== '\n') i++;
      continue;
    }
    if (two === '/*') {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (input.slice(i, i + 2) === '/*') { depth++; i += 2; }
        else if (input.slice(i, i + 2) === '*/') { depth--; i += 2; }
        else i++;
      }
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n) {
        if (input.slice(i, i + 2) === "''") { i += 2; continue; }
        if (input[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '"') {
      i++;
      while (i < n) {
        if (input.slice(i, i + 2) === '""') { i += 2; continue; }
        if (input[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    const dollar = input.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
    if (dollar) {
      const tag = dollar[0];
      const end = input.indexOf(tag, i + tag.length);
      i = end === -1 ? n : end + tag.length;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const stripped = QUERY.replace(/;+\s*$/, '');
const codeOnly = stripSqlComments(stripped);

// Single statement only: no semicolons except an optional trailing one.
if (codeOnly.includes(';')) {
  console.error('::error::somente UMA instrução é permitida (sem ponto-e-vírgula interno)');
  process.exit(1);
}
if (!/^(select|with|explain|show)\b/i.test(codeOnly.trim())) {
  console.error('::error::somente SELECT/WITH/EXPLAIN/SHOW são permitidos');
  process.exit(1);
}

// Belt-and-suspenders on top of the READ ONLY transaction: obvious DDL/DML
// keywords are rejected so accidental paste of a migration fails fast.
const FORBIDDEN_RE =
  /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|call|copy|vacuum|cluster|reindex|comment|discard|prepare|execute|deallocate|declare|fetch|move|listen|unlisten|notify|import|checkpoint|load|refresh|lock|set|reset|begin|commit|rollback|start)\b/i;
if (FORBIDDEN_RE.test(codeOnly)) {
  const kw = codeOnly.match(FORBIDDEN_RE)?.[1];
  console.error(`::error::palavra-chave não permitida em diagnóstico read-only: "${kw}"`);
  process.exit(1);
}

// Calls that bypass READ ONLY protection or mutate outside the transaction:
// cron.schedule writes survive ROLLBACK once dequeued by pg_cron workers;
// pg_terminate/cancel affect live connections; dblink/pg_read_file/lo_*
// reach outside the catalog. Reading cron.job / net queues stays allowed.
const FORBIDDEN_CALL_RE =
  /\b(cron|net)\s*\.\s*(schedule|unschedule|alter_job|http_post)\b|\b(pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_promote|pg_read_file|pg_stat_file|pg_ls_dir|dblink_exec|dblink_send_query|lo_import|lo_export|lo_unlink)\b/i;
if (FORBIDDEN_CALL_RE.test(codeOnly)) {
  const fn = codeOnly.match(FORBIDDEN_CALL_RE)?.[0];
  console.error(`::error::chamada não permitida em diagnóstico read-only: "${fn}"`);
  process.exit(1);
}

// Hard guard: READ ONLY transaction — Postgres rejects any write attempt.
// The terminator goes on its own line so a trailing `-- comment` cannot
// swallow it and leave the statement unterminated before ROLLBACK.
const sql = `BEGIN TRANSACTION READ ONLY;\n${stripped}\n;\nROLLBACK;`;

// Stream stdout and truncate incrementally — buffering everything first
// means a multi-MiB result dies on maxBuffer before the row cap can run.
const MAX_BYTES = 256 * 1024;
const child = spawn('psql', [
  DB_URL, '--no-psqlrc', '-X', '-q', '-P', 'pager=off', '-v', 'ON_ERROR_STOP=1', '-c', sql,
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stdout = '';
let stderr = '';
let stdoutBytes = 0;
let truncated = false;

// setEncoding keeps the UTF-8 decoder state across chunks — raw toString()
// per chunk corrupts multibyte chars that straddle a chunk boundary.
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');

child.stdout.on('data', (chunk) => {
  if (truncated) return;
  stdout += chunk;
  stdoutBytes += Buffer.byteLength(chunk, 'utf8');
  if (stdoutBytes > MAX_BYTES) {
    truncated = true;
    child.kill('SIGTERM');
  }
});
child.stderr.on('data', (chunk) => {
  if (stderr.length < 64 * 1024) stderr += chunk;
});

const status = await new Promise((resolvePromise, rejectPromise) => {
  child.on('error', rejectPromise);
  child.on('close', (code) => resolvePromise(code));
}).catch((err) => {
  console.error(`::error::falha ao executar psql: ${err.message}`);
  process.exit(1);
});

if (status !== 0 && !truncated) {
  console.error('::error::a consulta falhou no canônico');
  console.error(stderr);
  process.exit(1);
}

const lines = stdout.split('\n');
if (lines.length > MAX_ROWS) {
  console.log(lines.slice(0, MAX_ROWS).join('\n'));
  console.log(`\n… saída truncada em ${MAX_ROWS} linhas (${lines.length} no total)`);
} else {
  console.log(stdout);
}
if (truncated) {
  console.log(`\n… saída truncada em ${MAX_BYTES / 1024} KiB`);
}
if (stderr.trim()) console.error(stderr);
