#!/usr/bin/env node
/**
 * E71 — Canonical security probes runner.
 *
 * Executes RV-01/02/03/04 + views/ledger probes against SUPABASE_DB_URL.
 * All probes run in READ ONLY transactions with guaranteed ROLLBACK.
 * Outputs human-readable results; exits 1 on any probe failure.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://..." node scripts/probes/run-probes.mjs
 *
 * Requires psql (postgresql-client) in PATH.
 */

import { spawnSync } from 'node:child_process';

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error('::error::SUPABASE_DB_URL is required');
  process.exit(1);
}

function psql(sql) {
  const result = spawnSync(
    'psql',
    [DB_URL, '--no-psqlrc', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

const probes = [
  {
    id: 'rv01',
    label: 'user_empresa_id() ignores forged user_metadata',
    // SET LOCAL ROLE authenticated simulates a JWT-authenticated request with forged empresa_id.
    // user_empresa_id() must return NULL (no real tenant binding for this sub).
    sql: `BEGIN TRANSACTION READ ONLY;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-00000000e151","role":"authenticated","user_metadata":{"empresa_id":"deadbeef-dead-beef-dead-beefdeadbeef"},"app_metadata":{}}';
SELECT COALESCE(public.user_empresa_id()::text, 'NULL');
ROLLBACK;`,
    expect: (v) => v === 'NULL' || v === '',
    failMsg: (v) => `RV-01: user_empresa_id() respondeu a metadata forjada: ${v}`,
  },
  {
    id: 'rv02',
    label: 'medidas_ciencia_tokens locked down (no ACL, no policy)',
    sql: `BEGIN TRANSACTION READ ONLY;
SELECT (NOT has_table_privilege('anon','public.medidas_ciencia_tokens','SELECT'))
   AND (NOT has_table_privilege('authenticated','public.medidas_ciencia_tokens','SELECT'))
   AND (SELECT count(*) = 0 FROM pg_catalog.pg_policies
        WHERE schemaname='public' AND tablename='medidas_ciencia_tokens');
ROLLBACK;`,
    expect: (v) => v === 't',
    failMsg: () => 'RV-02: medidas_ciencia_tokens exposta (ACL ou policy)',
  },
  {
    id: 'rv03',
    label: 'Zero permissive policies on critical tables',
    sql: `BEGIN TRANSACTION READ ONLY;
SELECT count(*) FROM pg_catalog.pg_policies
WHERE schemaname='public'
  AND tablename IN ('audit_log','cnab_configuracoes','historico_rescisoes')
  AND regexp_replace(COALESCE(qual,''), '\\s+', '', 'g') ~* '(^|\\()(true)(\\)|$)';
ROLLBACK;`,
    expect: (v) => v === '0',
    failMsg: (v) => `RV-03: ${v} policy(s) permissiva(s) nas tabelas críticas`,
  },
  {
    id: 'rv04',
    label: 'Auth/membership RPCs present',
    sql: `BEGIN TRANSACTION READ ONLY;
SELECT to_regprocedure('public.get_my_user_empresas()') IS NOT NULL
   AND to_regprocedure('public.set_own_default_empresa(uuid)') IS NOT NULL
   AND to_regprocedure('public.admin_associar_usuario_empresa(uuid,uuid)') IS NOT NULL
   AND to_regprocedure('public.pode_gerir_rh_para(uuid,uuid)') IS NOT NULL
   AND to_regprocedure('public.pode_gerir_pessoas_para(uuid,uuid)') IS NOT NULL;
ROLLBACK;`,
    expect: (v) => v === 't',
    failMsg: () => 'RV-04: RPCs de vínculo/autorização ausentes',
  },
  {
    id: 'views',
    label: 'PII views blocked for anon',
    sql: `BEGIN TRANSACTION READ ONLY;
SELECT (NOT has_table_privilege('anon','public.vw_colaboradores_completo','SELECT'))
   AND (NOT has_table_privilege('anon','public.v_audit_events_unified','SELECT'))
   AND (NOT has_table_privilege('anon','public.dp_slow_queries','SELECT'))
   AND (NOT has_table_privilege('anon','public.vw_banco_horas_saldo','SELECT'));
ROLLBACK;`,
    expect: (v) => v === 't',
    failMsg: () => 'Views de PII legíveis por anon',
  },
  {
    id: 'ledger',
    label: 'Migration ledger row count (informational)',
    sql: `BEGIN TRANSACTION READ ONLY;
SELECT count(*) FROM supabase_migrations.schema_migrations;
ROLLBACK;`,
    expect: () => true,
    failMsg: () => '',
  },
];

const results = [];
const failures = [];

for (const probe of probes) {
  const raw = psql(probe.sql);
  const pass = raw !== null && probe.expect(raw);
  results.push({ probe: probe.id, result: raw ?? 'error', pass });
  if (!pass && probe.id !== 'ledger') {
    failures.push(probe.failMsg(raw ?? 'null'));
  }
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} ${probe.id.padEnd(8)} ${raw ?? 'error'}  — ${probe.label}`);
}

// Emit structured output for GITHUB_OUTPUT consumers
const summary = Object.fromEntries(results.map((r) => [r.probe, r.result]));
console.log('\nresult=' + JSON.stringify(summary));
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify(summary)}\n`);
}

if (failures.length > 0) {
  console.error('\nPROBE_FAILURES:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\nCANONICAL_PROBES_OK');
