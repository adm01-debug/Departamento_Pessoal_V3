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
// Campos controlados por quem abre a PR/issue: interpolá-los em run: é
// injeção de script (github.event.*, head_ref, ref, actor, inputs).
const RUN_INTERPOLATION_RE = /\$\{\{\s*(github\.event\.|github\.head_ref|github\.ref|github\.actor|github\.triggering_actor|inputs\.)/;
// Job no nível `  nome:` dentro de `jobs:`.
const JOB_HEADER_RE = /^  ([\w-]+):\s*$/gm;

for (const file of files) {
  const path = join(WORKFLOWS_DIR, file);
  const raw = readFileSync(path, 'utf-8');
  const lines = raw.split('\n');

  console.log(`\n── ${file}`);

  // 1. TODO job tem timeout-minutes — antes era 1 ocorrência por arquivo,
  // então um job sem timeout passava se outro o tivesse (bypass).
  {
    const jobsIdx = raw.search(/^jobs:\s*$/m);
    if (jobsIdx !== -1) {
      const jobsSection = raw.slice(jobsIdx);
      const heads = [...jobsSection.matchAll(JOB_HEADER_RE)];
      let missing = [];
      for (let i = 0; i < heads.length; i++) {
        const start = heads[i].index;
        const end = i + 1 < heads.length ? heads[i + 1].index : jobsSection.length;
        const body = jobsSection.slice(start, end);
        if (body.includes('if: false')) continue; // job desabilitado
        if (!body.includes('timeout-minutes')) missing.push(heads[i][1]);
      }
      if (missing.length > 0) {
        fail(`${file}: jobs sem timeout-minutes: ${missing.join(', ')} (D11)`);
      } else if (heads.length > 0) {
        pass(`timeout-minutes em todos os ${heads.length} job(s)`);
      } else {
        // Sem jobs declarados (workflow só de triggers) — mantém checagem antiga
        if (!raw.includes('timeout-minutes') && !raw.includes('if: false')) {
          fail(`${file}: nenhum timeout-minutes encontrado (D11)`);
        } else {
          pass(`timeout-minutes presente (ou job desabilitado)`);
        }
      }
    } else if (!raw.includes('timeout-minutes') && !raw.includes('if: false')) {
      fail(`${file}: nenhum timeout-minutes encontrado (D11)`);
    } else {
      pass(`timeout-minutes presente (ou job desabilitado)`);
    }
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
  // Detecta também flow-style `on: [pull_request]` e `- pull_request` e
  // exige `concurrency:` como chave YAML real — antes um comentário
  // `# concurrency:` já satisfazia a checagem.
  const hasPrTrigger =
    /^\s{0,4}pull_request:/m.test(raw) ||
    /^\s*-\s*pull_request\b/m.test(raw) ||
    /on:\s*\[[^\]]*pull_request\b/.test(raw);
  const hasConcurrency = /^\s*concurrency:/m.test(raw);
  if (hasPrTrigger && !hasConcurrency) {
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
