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

  console.log(`✅ baseline inclui ${orderedMarkers.length} camadas de remediação na ordem validada`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
