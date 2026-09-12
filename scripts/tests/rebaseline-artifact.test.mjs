#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const tempDir = await mkdtemp(join(tmpdir(), 'dp-rebaseline-test-'));
const artifact = join(tempDir, 'baseline.sql');

try {
  const build = spawnSync(process.execPath, ['scripts/build-rebaseline.mjs', artifact], {
    cwd: root,
    encoding: 'utf8',
  });

  if (build.status !== 0) {
    throw new Error(`O gerador da baseline falhou:\n${build.stderr || build.stdout}`);
  }

  const content = await readFile(artifact, 'utf8');
  const orderedMarkers = [
    'Rebaseline 2026-08-31: fechamento dos gaps de autorização',
    'fecha o padrão "<col> IN (SELECT id FROM <tabela-mãe>)"',
    'fecha as 11 funções SECURITY DEFINER sem autorização interna',
    'fecha o P0 mais grave desta rodada de auditoria',
    'catálogo canônico de buckets e RLS de objetos',
  ];

  let previousIndex = -1;
  for (const marker of orderedMarkers) {
    const index = content.indexOf(marker);
    if (index === -1) {
      throw new Error(`A baseline gerada não contém a remediação esperada: ${marker}`);
    }
    if (index <= previousIndex) {
      throw new Error(`A baseline gerada contém remediações fora da ordem segura: ${marker}`);
    }
    previousIndex = index;
  }

  const forbidden = [/^\\(?:un)?restrict\b/m, /^COPY\s/m, /^INSERT INTO auth\./m];
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      throw new Error(`A baseline gerada contém conteúdo proibido: ${pattern}`);
    }
  }

  // The baseline is only used for a clean rebuild.  A production deployment
  // needs an append-only migration containing exactly the same view hardening.
  const rolloutPath = join(root, 'supabase/migrations/20260911180000_p0_views_security_invoker.sql');
  const baselineViewPath = join(root, 'supabase/rebaseline/20260902_view_security_invoker_remediation.sql');
  const statementLines = /^(?:ALTER VIEW|REVOKE SELECT ON) .+$/gm;
  const rolloutStatements = (await readFile(rolloutPath, 'utf8')).match(statementLines) ?? [];
  const baselineStatements = (await readFile(baselineViewPath, 'utf8')).match(statementLines) ?? [];

  if (rolloutStatements.length !== 84 || rolloutStatements.join('\n') !== baselineStatements.join('\n')) {
    throw new Error('A migration incremental de views não corresponde exatamente à remediação da baseline');
  }

  console.log(`✅ baseline inclui ${orderedMarkers.length} camadas de remediação e a migration P0 replica 42 views`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
