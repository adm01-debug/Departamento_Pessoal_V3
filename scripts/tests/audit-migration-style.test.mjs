#!/usr/bin/env node

// Regressão do gate de DROP POLICY IF EXISTS solto: cada fixture é uma
// migration nova (>= CUTOFF_VERSION) num repositório descartável.
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const fixtureRoot = mkdtempSync(join(tmpdir(), 'migration-style-'));
const checker = join(fixtureRoot, 'scripts/audit-migration-style.mjs');
const migrationsDir = join(fixtureRoot, 'supabase/migrations');
mkdirSync(join(fixtureRoot, 'scripts'));
copyFileSync(resolve('scripts/audit-migration-style.mjs'), checker);

function run(sql) {
  rmSync(migrationsDir, { recursive: true, force: true });
  mkdirSync(migrationsDir, { recursive: true });
  if (sql !== null) writeFileSync(join(migrationsDir, '20991231000000_fixture.sql'), sql);
  return spawnSync(process.execPath, [checker], { encoding: 'utf8' });
}

const guard = (name) =>
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '${name}') THEN RAISE EXCEPTION 'viva'; END IF; END $$;\n`;
const allow = '-- audit-migration-style: allow-silent-drop recriada logo abaixo\n';

const cases = [
  ['nome simples, solto', 1, 'DROP POLICY IF EXISTS p1 ON public.t;\n'],
  ['nome simples, guardado', 0, 'DROP POLICY IF EXISTS p1 ON public.t;\n' + guard('p1')],
  ['nome simples, anotado', 0, allow + 'DROP POLICY IF EXISTS p1 ON public.t;\n'],
  ['guarda de outra policy não vale', 1, 'DROP POLICY IF EXISTS p1 ON public.t;\n' + guard('p2')],
  ['DROP comentado', 0, '-- DROP POLICY IF EXISTS p1 ON public.t;\nSELECT 1;\n'],
  ['nenhuma migration avaliada', 1, null],
];

try {
  for (const [name, expected, sql] of cases) {
    const result = run(sql);
    if (result.status !== expected) {
      throw new Error(`${name}: esperado exit ${expected}, obtido ${result.status}\n${result.stdout}${result.stderr}`);
    }
  }
  console.log(`MIGRATION_STYLE_TEST_OK cases=${cases.length}`);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
