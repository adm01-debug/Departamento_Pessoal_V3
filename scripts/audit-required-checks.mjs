/**
 * E08 — Guard: verifica se todo check obrigatório do ruleset tem um job
 * correspondente em .github/workflows/*.yml.
 * Falha se um check obrigatório foi renomeado/removido sem atualizar o ruleset.
 * Roda em security-config.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RULESET_FILE = resolve(import.meta.dirname, '../infra/github/ruleset-main.json');
const WORKFLOWS_DIR = resolve(import.meta.dirname, '../.github/workflows');

// Carrega baseline do ruleset (criado em E02)
let requiredChecks = [];
try {
  const ruleset = JSON.parse(readFileSync(RULESET_FILE, 'utf-8'));
  const scRule = ruleset.rules?.find(r => r.type === 'required_status_checks');
  requiredChecks = scRule?.parameters?.required_status_checks?.map(c => c.context) ?? [];
} catch {
  // Arquivo ainda não existe (E02 pendente) — aviso mas não falha
  console.warn('⚠  infra/github/ruleset-main.json não encontrado (E02 pendente). Pulando validação de checks obrigatórios.');
  process.exit(0);
}

if (requiredChecks.length === 0) {
  console.log('Nenhum required_status_checks no ruleset — nada a validar.');
  process.exit(0);
}

// Coleta todos os `name:` de jobs em todos os workflows
const workflows = readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
const jobNames = new Set();
for (const file of workflows) {
  const raw = readFileSync(join(WORKFLOWS_DIR, file), 'utf-8');
  // Regex simples para capturar job names no nível "jobs.<name>:"
  for (const m of raw.matchAll(/^  ([\w-]+):\s*\n\s+(?:name:|runs-on:)/gm)) {
    jobNames.add(m[1]);
  }
  // Também captura `name:` explícito dentro de jobs
  for (const m of raw.matchAll(/^\s{4}name:\s+(.+)$/gm)) {
    jobNames.add(m[1].trim());
  }
}

let failures = 0;
for (const check of requiredChecks) {
  // Match EXATO: substring criava falso-verde — um job "Lint" satisfazia o
  // check "Lint Edge Functions" mesmo após renomear/remover o job real.
  const found = jobNames.has(check);
  if (found) {
    console.log(`  ok: "${check}" → job encontrado`);
  } else {
    console.error(`  FAIL: required check "${check}" sem job correspondente nos workflows (renomeação silenciosa?)`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) obrigatório(s) sem job. Atualize o ruleset (E04) ou o workflow.\n`);
  process.exit(1);
} else {
  console.log(`\nTodos os ${requiredChecks.length} required checks têm job correspondente.\n`);
}
