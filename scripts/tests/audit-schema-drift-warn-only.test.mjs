// Teste do contrato --warn-only do audit-schema-drift.mjs (gate db-integrity-live).
//
// Em pull_request o gate roda com --warn-only: uma migration nova não pode
// estar no ledger antes do merge em main (o canonical-migrations.yml só aceita
// `apply` a partir de main), então reprovar ali seria falso negativo em toda
// PR de migration. Em push na main, continua reprovando.
//
// Roda o script de verdade, com `psql` falso no PATH devolvendo um ledger vazio.
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');

function preparar() {
  const dir = mkdtempSync(path.join(tmpdir(), 'drift-warn-only-'));
  mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  mkdirSync(path.join(dir, 'supabase', 'migrations'), { recursive: true });
  mkdirSync(path.join(dir, 'bin'), { recursive: true });
  copyFileSync(
    path.join(RAIZ, 'scripts', 'audit-schema-drift.mjs'),
    path.join(dir, 'scripts', 'audit-schema-drift.mjs')
  );
  writeFileSync(
    path.join(dir, 'supabase', 'migrations', '20261101000000_teste.sql'),
    '-- migration de teste\n'
  );
  // Ledger vazio: imprime nada e sai 0.
  const psql = path.join(dir, 'bin', 'psql');
  writeFileSync(psql, '#!/bin/sh\nexit 0\n');
  chmodSync(psql, 0o755);
  return dir;
}

function rodar(dir, args) {
  const r = spawnSync('node', [path.join(dir, 'scripts', 'audit-schema-drift.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`, SUPABASE_DB_URL: 'postgres://fake/db' },
  });
  return { status: r.status, stdout: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

test('sem --warn-only, migration ausente do ledger reprova', () => {
  const dir = preparar();
  const r = rodar(dir, ['--since=20261001']);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /sem registro no ledger/);
});

test('com --warn-only, mesma situação vira aviso e nao reprova', () => {
  const dir = preparar();
  const r = rodar(dir, ['--since=20261001', '--warn-only']);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /sem registro no ledger/);
  assert.match(r.stdout, /AVISO — 1 migration\(ões\) sem registro no ledger/);
  assert.doesNotMatch(r.stdout, /todas com registro no ledger/);
});

test('--since invalido continua reprovando mesmo com --warn-only', () => {
  const dir = preparar();
  const r = rodar(dir, ['--since=2026-10-01', '--warn-only']);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /--since inválido/);
});