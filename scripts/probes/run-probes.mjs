#!/usr/bin/env node
// run-probes.mjs — canonical DB security probes (read-only)
// Each probe runs inside BEGIN TRANSACTION READ ONLY … ROLLBACK

import postgres from 'postgres';

const DB_URL = process.env.CANONICAL_DB_URL;
if (!DB_URL) {
  console.error('CANONICAL_DB_URL not set');
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1, ssl: 'require' });

const probes = [
  {
    id: 'RV-01',
    name: 'RLS habilitado nas tabelas críticas',
    query: `
      BEGIN TRANSACTION READ ONLY;
      SELECT bool_and(rowsecurity)
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind = 'r'
        AND relname IN (
          'users','empresas','user_empresas','user_roles',
          'funcionarios','documentos','ausencias'
        );
      ROLLBACK;
    `,
    expect: (v) => v === 't',
    failMsg: 'RV-01: RLS desabilitado em tabela crítica',
  },
  {
    id: 'RV-02',
    name: 'Funções SECURITY DEFINER têm search_path fixo',
    query: `
      BEGIN TRANSACTION READ ONLY;
      SELECT COUNT(*) = 0
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prosecdef = true
        AND (
          p.proconfig IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) cfg
            WHERE cfg LIKE 'search_path=%'
          )
        );
      ROLLBACK;
    `,
    expect: (v) => v === 't',
    failMsg: 'RV-02: SECURITY DEFINER sem search_path fixo',
  },
  {
    id: 'RV-03',
    name: 'Extensões permitidas apenas (uuid-ossp, pgcrypto, pg_stat_statements)',
    query: `
      BEGIN TRANSACTION READ ONLY;
      SELECT bool_and(extname IN ('uuid-ossp','pgcrypto','pg_stat_statements','plpgsql'))
      FROM pg_extension;
      ROLLBACK;
    `,
    expect: (v) => v === 't',
    failMsg: 'RV-03: Extensão não autorizada instalada',
  },
  {
    id: 'RV-04',
    name: 'RPCs de vínculo/autorização presentes',
    query: `
      BEGIN TRANSACTION READ ONLY;
      SELECT to_regprocedure('public.get_my_user_empresas()') IS NOT NULL
         AND to_regprocedure('public.set_own_default_empresa(uuid)') IS NOT NULL
         AND to_regprocedure('public.admin_associar_usuario_empresa(uuid,uuid,boolean)') IS NOT NULL
         AND to_regprocedure('public.pode_gerir_rh_para(uuid,uuid)') IS NOT NULL
         AND to_regprocedure('public.pode_gerir_pessoas_para(uuid,uuid)') IS NOT NULL;
      ROLLBACK;
    `,
    expect: (v) => v === 't',
    failMsg: 'RV-04: RPCs de vínculo/autorização ausentes',
  },
  {
    id: 'RV-05',
    name: 'Views de auditoria existem',
    query: `
      BEGIN TRANSACTION READ ONLY;
      SELECT COUNT(*) = 2
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname IN ('vw_audit_log','vw_audit_summary');
      ROLLBACK;
    `,
    expect: (v) => v === 't',
    failMsg: 'RV-05: Views de auditoria ausentes',
  },
  {
    id: 'RV-06',
    name: 'Ledger de alterações de schema existe',
    query: `
      BEGIN TRANSACTION READ ONLY;
      SELECT to_regclass('public.schema_change_ledger') IS NOT NULL;
      ROLLBACK;
    `,
    expect: (v) => v === 't',
    failMsg: 'RV-06: Tabela schema_change_ledger ausente',
  },
];

let failed = 0;

for (const probe of probes) {
  try {
    const rows = await sql.unsafe(probe.query);
    // postgres() returns array of row objects; last row before ROLLBACK has our value
    const lastRow = rows[rows.length - 1];
    const value = lastRow ? Object.values(lastRow)[0] : null;
    if (probe.expect(value)) {
      console.log(`✅ ${probe.id}: ${probe.name}`);
    } else {
      console.error(`❌ ${probe.id}: ${probe.failMsg} (got: ${value})`);
      failed++;
    }
  } catch (err) {
    console.error(`❌ ${probe.id}: erro ao executar probe — ${err.message}`);
    failed++;
  }
}

await sql.end();

if (failed > 0) {
  console.error(`\n${failed} probe(s) falharam.`);
  process.exit(1);
}

console.log('\nTodos os probes passaram.');
process.exit(0);
