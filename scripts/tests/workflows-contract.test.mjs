/**
 * E96/W97 — Contrato dos workflows GitHub Actions.
 * Roda em security-config.
 * Valida invariantes que, se violados, causam falhas silenciosas ou custos ocultos.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOWS_DIR = resolve(import.meta.dirname, '../../.github/workflows');
const ROOT = resolve(import.meta.dirname, '../..');
const ACTION_PINS_PATH = join(ROOT, 'infra/github/action-pins.json');
const actionPins = existsSync(ACTION_PINS_PATH)
  ? JSON.parse(readFileSync(ACTION_PINS_PATH, 'utf-8')).pins ?? {}
  : {};
const denoLockExists = existsSync(join(ROOT, 'deno.lock'));

// W97c: carrega required checks do baseline para detectar jobs que podem ficar skipped
const RULESET_PATH = join(ROOT, 'infra/github/ruleset-main.json');
const requiredChecks = new Set(
  existsSync(RULESET_PATH)
    ? (JSON.parse(readFileSync(RULESET_PATH, 'utf-8'))
        ?.rules?.parameters?.required_status_checks ?? [])
        .map(c => c.context)
    : []
);

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

  // 6. SHA pins: (a) comentário coerente + (b) check reverso — todo SHA usado deve estar no JSON
  if (Object.keys(actionPins).length > 0) {
    const versionCommentRe = /uses:\s+[^\s@]+@([0-9a-f]{40})\s+#\s+(\S+)/g;
    let mismatches = [];
    let missing = [];
    for (const m of raw.matchAll(versionCommentRe)) {
      const sha = m[1];
      const comment = m[2];
      if (actionPins[sha]) {
        if (actionPins[sha].version !== comment) {
          mismatches.push(`SHA ${sha.slice(0,8)}… comentado como '${comment}', esperado '${actionPins[sha].version}'`);
        }
      } else {
        // W35 check reverso: SHA usado no workflow mas ausente do action-pins.json
        missing.push(`${sha.slice(0,8)}… (${comment}) não está em action-pins.json — atualize infra/github/action-pins.json`);
      }
    }
    if (mismatches.length > 0) {
      for (const m of mismatches) fail(`${file}: comentário de versão incorreto: ${m} (D6/W35)`);
    }
    if (missing.length > 0) {
      for (const m of missing) fail(`${file}: SHA sem entrada no catálogo: ${m} (W35)`);
    }
    if (mismatches.length === 0 && missing.length === 0) {
      pass(`comentários de versão coerentes com action-pins.json`);
    }
  }

  // 7. --no-lock proibido quando deno.lock existe (W97b/D6) — W36 corrigido
  if (denoLockExists && raw.includes('--no-lock')) {
    const noLockLines = lines
      .map((l, i) => ({ line: l, n: i + 1 }))
      .filter(({ line }) => line.includes('--no-lock'));
    for (const { line, n } of noLockLines) {
      fail(`${file}:${n}: --no-lock usado apesar de deno.lock existir — usar --frozen (D6/W97b/W36): "${line.trim()}"`);
    }
  } else if (denoLockExists) {
    pass(`sem --no-lock (deno.lock presente)`);
  }

  // 8. continue-on-error: exige comentário # contrato: … (W97d)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s+continue-on-error:\s*true/.test(line)) {
      const prevLine = lines[i - 1] ?? '';
      if (!prevLine.includes('# contrato:')) {
        fail(`${file}:${i + 1}: continue-on-error: true sem comentário '# contrato: …' (W97d): "${line.trim()}"`);
      }
    }
  }

  // 9. Proibir echo/cat da expansão de variáveis sensíveis em run: (W97e/D4)
  // Só flagra expansão real ($VAR ou ${VAR}), não literais string em mensagens de erro.
  const sensitiveVarRe = /\b(echo|cat|printf)\b[^#\n]*\$\{?(SUPABASE_DB_URL|DIAG_QUERY)\}?/;
  for (let i = 0; i < lines.length; i++) {
    if (sensitiveVarRe.test(lines[i])) {
      fail(`${file}:${i + 1}: possível vazamento de dados sensíveis em log (W97e/D4): "${lines[i].trim()}"`);
    }
  }

  // 10. npx -y em run: proibido (W40 concluído — @lhci/cli está no lock) (W97f/D12)
  for (let i = 0; i < lines.length; i++) {
    if (/\bnpx\s+-y\b/.test(lines[i]) || /\bnpx\s+--yes\b/.test(lines[i])) {
      fail(`${file}:${i + 1}: npx -y baixa código remoto sem lock (W97f/D12): "${lines[i].trim()}"`);
    }
  }

  // 11. node-version: literal proibido (W38 concluído — todos usam node-version-file) (W97g/D6)
  for (let i = 0; i < lines.length; i++) {
    if (/^\s+node-version:\s+'?\d/.test(lines[i])) {
      fail(`${file}:${i + 1}: node-version: literal, usar node-version-file: .nvmrc (W97g/D6): "${lines[i].trim()}"`);
    }
  }

  // 12. W97c: jobs required pelo ruleset baseline não podem ter if: de nível de job
  // que os exclua de pull_request (causaria check "never reported" no ruleset).
  // Exceção: if: contendo 'pull_request' ou 'workflow_call' é seguro.
  if (requiredChecks.size > 0) {
    const jobsIdx12 = raw.search(/^jobs:\s*$/m);
    if (jobsIdx12 !== -1) {
      const js12 = raw.slice(jobsIdx12);
      const heads12 = [...js12.matchAll(JOB_HEADER_RE)];
      const violations = [];
      for (let i = 0; i < heads12.length; i++) {
        const start12 = heads12[i].index;
        const end12 = i + 1 < heads12.length ? heads12[i + 1].index : js12.length;
        const body12 = js12.slice(start12, end12);
        if (body12.includes('if: false')) continue; // job desabilitado
        const nameMatch12 = body12.match(/^\s{4}name:\s+(.+)$/m);
        if (!nameMatch12) continue;
        const jobName12 = nameMatch12[1].trim();
        if (!requiredChecks.has(jobName12)) continue;
        // Job é required — verifica if: de nível (4 espaços), coletando blocos multi-linha
        const bodyLines12 = body12.split('\n');
        let ifBlock = []; let inIf = false;
        for (const ln of bodyLines12) {
          if (!inIf && /^ {4}if:/.test(ln)) { inIf = true; ifBlock.push(ln); continue; }
          if (inIf) { if (/^ {5,}/.test(ln)) { ifBlock.push(ln); } else { break; } }
        }
        if (ifBlock.length === 0) continue;
        const ifText = ifBlock.join('\n');
        // Seguro se a condição inclui pull_request ou workflow_call
        if (ifText.includes('pull_request') || ifText.includes('workflow_call')) continue;
        violations.push(`${heads12[i][1]} (name: "${jobName12}", if: "${ifBlock[0].trim().slice(0, 60)}")`);
      }
      if (violations.length > 0) {
        fail(`${file}: jobs required com if: que pode excluí-los de PRs (W97c/D3): ${violations.join('; ')}`);
      } else {
        pass(`jobs required sem if: perigoso (W97c)`);
      }
    }
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
