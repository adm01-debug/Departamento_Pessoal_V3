/**
 * E96 — Contrato dos workflows GitHub Actions.
 * Roda em security-config (via scripts/audit-edge-syntax.mjs ou similar).
 * Valida invariantes que, se violados, causam falhas silenciosas ou custos ocultos.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOWS_DIR = resolve(import.meta.dirname, '../../.github/workflows');

const files = readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

let failures = 0;

function fail(msg) {
  console.error(`  FAIL: ${msg}`);
  failures++;
}

function pass(msg) {
  console.log(`  ok:   ${msg}`);
}

const USES_RE = /uses:\s+(\S+)/g;
const RUN_INTERPOLATION_RE = /\$\{\{\s*github\.event\.|inputs\./;

for (const file of files) {
  const path = join(WORKFLOWS_DIR, file);
  const raw = readFileSync(path, 'utf-8');
  const lines = raw.split('\n');

  console.log(`\n── ${file}`);

  // 1. Todos os jobs têm timeout-minutes (salvo jobs desabilitados com if:false)
  const hasTimeout = raw.includes('timeout-minutes');
  // Heurística: workflows com jobs reais devem ter pelo menos 1 timeout-minutes
  const hasIfFalse = raw.includes('if: false');
  if (!hasTimeout && !hasIfFalse) {
    fail(`${file}: nenhum timeout-minutes encontrado (D11)`);
  } else {
    pass(`timeout-minutes presente (ou job desabilitado)`);
  }

  // 2. Todo uses: tem SHA de 40 chars (salvo local ./ ou reusable workflows)
  let nonPinned = [];
  for (const m of raw.matchAll(USES_RE)) {
    const ref = m[1];
    if (ref.startsWith('./')) continue;          // reusable local
    if (ref.startsWith('docker://')) continue;   // docker action
    // Verifica se o @ref é SHA40
    const atIdx = ref.lastIndexOf('@');
    if (atIdx === -1) {
      nonPinned.push(ref);
      continue;
    }
    const ver = ref.slice(atIdx + 1);
    if (!/^[0-9a-f]{40}$/.test(ver)) {
      nonPinned.push(ref);
    }
  }
  if (nonPinned.length > 0) {
    fail(`${file}: actions sem SHA pin: ${nonPinned.join(', ')} (D9)`);
  } else {
    pass(`todas as actions pinadas por SHA`);
  }

  // 3. run: não interpola github.event.* ou inputs.* diretamente (injeção de script)
  // Contextos seguros: YAML key-value (env vars, name:, if:, uses:, with:…)
  // Só flagra linhas que NÃO são YAML key: value (exceto run: direto)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (/^[\w][\w-]*:\s/.test(trimmed) && !trimmed.startsWith('run:')) continue;
    if (RUN_INTERPOLATION_RE.test(line)) {
      fail(`${file}:${i + 1}: interpolação perigosa em run: "${trimmed}" (D20/E20)`);
    }
  }

  // 4. permissions: presente no nível do workflow (bloco top-level)
  if (!raw.includes('\npermissions:') && !raw.startsWith('permissions:')) {
    fail(`${file}: sem bloco permissions: de nível top (E44)`);
  } else {
    pass(`permissions: presente`);
  }

  // 5. concurrency: presente em workflows com pull_request trigger
  // Usa regex para distinguir o trigger YAML de usos do texto em run:/env:
  const hasPrTrigger = /^\s{0,4}pull_request:/m.test(raw);
  if (hasPrTrigger && !raw.includes('concurrency:')) {
    fail(`${file}: trigger pull_request sem concurrency: (cancelamento de runs duplicadas)`);
  } else if (hasPrTrigger) {
    pass(`concurrency: presente`);
  }
}

console.log(`\n─────────────────────────────────────────`);
if (failures > 0) {
  console.error(`\n${failures} contrato(s) violado(s). Corrija antes de mergear.\n`);
  process.exit(1);
} else {
  console.log(`\nTodos os contratos OK (${files.length} workflows).\n`);
}
