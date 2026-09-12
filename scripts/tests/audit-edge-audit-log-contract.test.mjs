#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = resolve('scripts/audit-edge-audit-log-contract.mjs');
const fixtureRoot = mkdtempSync(join(tmpdir(), 'edge-audit-contract-'));

function runFixture(source) {
  const target = join(fixtureRoot, 'supabase/functions/example/index.ts');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
  return spawnSync(process.execPath, [checker], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
}

try {
  const valid = runFixture(`
    const audit = client.from('audit_log');
    await audit.insert({
      tabela: 'folhas_pagamento', registro_id: 'f1',
      empresa_id: 'e1', acao: 'PAYROLL_CLOSE'
    });
  `);
  if (valid.status !== 0 || !valid.stdout.includes('checked_inserts=1')) {
    throw new Error(`valid alias was not inspected:\n${valid.stdout}${valid.stderr}`);
  }

  const invalid = runFixture(`
    const audit = client.from('audit_log');
    await audit.insert({ tabela: 'folhas_pagamento', acao: 'NOT_ALLOWED' });
  `);
  if (
    invalid.status === 0
    || !invalid.stderr.includes('coluna obrigatória ausente em audit_log: registro_id')
    || !invalid.stderr.includes('acao incompatível com audit_log_acao_check: NOT_ALLOWED')
  ) {
    throw new Error(`invalid alias escaped the checker:\n${invalid.stdout}${invalid.stderr}`);
  }

  console.log('EDGE_AUDIT_LOG_ALIAS_TEST_OK');
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
