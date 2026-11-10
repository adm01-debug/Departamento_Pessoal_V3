#!/usr/bin/env node
/**
 * W55: scripts/report-workflows.mjs
 * Relatório de duração e fila dos workflows (últimos 50 runs).
 * Uso: GITHUB_TOKEN=<token> node scripts/report-workflows.mjs
 * Meta: PR docs-only ≤ 4 min, PR de código ≤ 12 min
 */
import { readFileSync } from 'node:fs';

const OWNER = 'adm01-debug';
const REPO = 'Departamento_Pessoal_V3';
const WORKFLOWS_DIR = '.github/workflows';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.log('GITHUB_TOKEN não definido — modo offline.');
  console.log('Para relatório ao vivo: GITHUB_TOKEN=<token> node scripts/report-workflows.mjs');
  console.log('');
  console.log('Metas de duração:');
  console.log('  PR docs-only : ≤ 4 min');
  console.log('  PR de código : ≤ 12 min');
  console.log('  Push main    : ≤ 15 min');
  process.exit(0);
}

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
  } catch (err) {
    throw new Error(`GitHub API inacessível (rede): ${err.message}`);
  }
  if (res.status === 401 || res.status === 403) {
    console.error(`[report-workflows] GitHub API ${res.status} — token sem escopo "actions:read" ou expirado.`);
    process.exit(0); // soft-skip: não reprovar build por token local desatualizado
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`);
  return res.json();
}

async function getWorkflowDurations(workflowId) {
  const { workflow_runs } = await fetchJson(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${workflowId}/runs?per_page=50&status=completed`
  );
  const durations = workflow_runs
    .filter(r => r.conclusion === 'success' || r.conclusion === 'failure')
    .map(r => {
      const start = new Date(r.created_at);
      const end = new Date(r.updated_at);
      return Math.round((end - start) / 60000); // minutes
    });
  if (!durations.length) return null;
  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  return { median, p95, count: durations.length };
}

async function main() {
  const { workflows } = await fetchJson(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows?per_page=100`
  );
  // Acumula e só imprime no fim: um 401/403 no meio (soft-skip acima) deixava
  // um relatório parcial no stdout, que o workflows-report.yml injetava no doc.
  const out = ['# Relatório de Workflows\n'];
  out.push('| Workflow | Median (min) | P95 (min) | Runs |');
  out.push('|----------|-------------|-----------|------|');
  for (const wf of workflows) {
    const stats = await getWorkflowDurations(wf.id);
    if (!stats) { out.push(`| ${wf.name} | — | — | 0 |`); continue; }
    const flag = stats.median > 12 ? ' ⚠️' : '';
    out.push(`| ${wf.name} | ${stats.median}${flag} | ${stats.p95} | ${stats.count} |`);
  }
  console.log(out.join('\n'));
}

main().catch(e => { console.error(e.message); process.exit(1); });
