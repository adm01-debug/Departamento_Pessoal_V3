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
  // The rollout migration applies the hardening programmatically (FOREACH over
  // an expected_views array), so parity is checked on the view set and on the
  // two operations applied to every entry.
  const rollout = await readFile(rolloutPath, 'utf8');
  const baseline = await readFile(baselineViewPath, 'utf8');
  const baselineViews = new Set(
    [...baseline.matchAll(/^ALTER VIEW public\."([^"]+)"/gm)].map((m) => m[1]),
  );
  const rolloutViews = new Set(
    [...rollout.matchAll(/^\s*'([a-z0-9_]+)',?\s*$/gm)].map((m) => m[1]),
  );

  const baselineRevokes = (baseline.match(/^REVOKE SELECT ON /gm) ?? []).length;
  const missingInRollout = [...baselineViews].filter((v) => !rolloutViews.has(v));
  const extraInRollout = [...rolloutViews].filter((v) => !baselineViews.has(v));
  const appliesAlter = /ALTER VIEW public\.%I SET \(security_invoker = true\)/.test(rollout);
  const appliesRevoke = /REVOKE SELECT ON public\.%I FROM anon/.test(rollout);

  if (
    baselineViews.size !== 42 ||
    baselineRevokes !== 42 ||
    missingInRollout.length > 0 ||
    extraInRollout.length > 0 ||
    !appliesAlter ||
    !appliesRevoke
  ) {
    throw new Error(
      `A migration incremental de views não replica a remediação da baseline ` +
        `(baseline=${baselineViews.size}/${baselineRevokes} ` +
        `faltando=${missingInRollout.join(',') || 'nenhuma'} ` +
        `extras=${extraInRollout.join(',') || 'nenhuma'} alter=${appliesAlter} revoke=${appliesRevoke})`,
    );
  }

  console.log(`✅ baseline inclui ${orderedMarkers.length} camadas de remediação e a migration P0 replica 42 views`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
