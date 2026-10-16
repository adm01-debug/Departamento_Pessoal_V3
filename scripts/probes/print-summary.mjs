#!/usr/bin/env node
/**
 * W71 — Resumo estruturado dos canonical probes para $GITHUB_STEP_SUMMARY.
 *
 * Lê o JSON emitido por run-probes.mjs (via steps.probes.outputs.result,
 * passado como env PROBES_RESULT) e imprime uma tabela pass/fail por probe.
 *
 * D4: NUNCA imprimir dados de linha de tabela de negócio. Os únicos valores
 * que passam por aqui são os booleans/contagens já normalizados pelos
 * probes (ex.: "t"/"f", "0", "NULL") — nenhuma coluna de dados reais
 * (nome, CPF, salário, etc.) chega a este script.
 *
 * Uso:
 *   PROBES_RESULT='{"rv01":"NULL", ...}' PROBES_OUTCOME=success \
 *     node scripts/probes/print-summary.mjs >> "$GITHUB_STEP_SUMMARY"
 */

// Mesmas regras de `expect()` de run-probes.mjs — mantidas em sincronia
// manualmente (ambos os arquivos são pequenos e versionados juntos).
const ROWS = [
  { id: 'rv01', label: 'RV-01 · user_empresa_id() ignora metadata forjada', ok: (v) => v === 'NULL' || v === '' },
  { id: 'rv02', label: 'RV-02 · medidas_ciencia_tokens sem ACL/policy', ok: (v) => v === 't' },
  { id: 'rv03', label: 'RV-03 · zero policies permissivas (USING true)', ok: (v) => v === '0' },
  { id: 'rv04', label: 'RV-04 · RPCs de vínculo/autorização presentes', ok: (v) => v === 't' },
  { id: 'views', label: 'Views de PII bloqueadas para anon', ok: (v) => v === 't' },
  { id: 'ledger', label: 'Ledger de migrations (informativo)', ok: () => true, informational: true },
];

const rawResult = process.env.PROBES_RESULT ?? '';
const outcome = process.env.PROBES_OUTCOME ?? 'unknown';

let parsed = {};
let parseError = false;
try {
  parsed = rawResult ? JSON.parse(rawResult) : {};
} catch {
  parseError = true;
}

const lines = [];
lines.push(`## Canonical Probes — run ${process.env.GITHUB_RUN_ID ?? ''}`);
lines.push('');
lines.push(`Execução do step: **${outcome}**`);
lines.push('');
lines.push('| Probe | Status |');
lines.push('|-------|--------|');

for (const row of ROWS) {
  const v = parsed[row.id];
  let cell;
  if (parseError || v === undefined) {
    cell = '⚪ indisponível';
  } else if (row.informational) {
    cell = 'ℹ️ informativo';
  } else {
    cell = row.ok(v) ? '✅ pass' : '❌ fail';
  }
  lines.push(`| ${row.label} | ${cell} |`);
}

lines.push('');
lines.push('_Nenhuma linha de dado de negócio (PII) é exibida — apenas resultados booleanos/contagens dos probes (D4)._');

console.log(lines.join('\n'));
