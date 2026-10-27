/**
 * E08 — Guard: verifica se todo check obrigatório do ruleset tem um job
 * correspondente em .github/workflows/*.yml.
 * Falha se um check obrigatório foi renomeado/removido sem atualizar o ruleset.
 * Roda em security-config.
 *
 * W17: comparação offline contra infra/github/ruleset-main.json.
 * Quando GITHUB_TOKEN disponível, também busca ruleset vivo e valida divergência.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RULESET_FILE = resolve(import.meta.dirname, '../infra/github/ruleset-main.json');
const WORKFLOWS_DIR = resolve(import.meta.dirname, '../.github/workflows');
const OWNER_REPO = 'adm01-debug/Departamento_Pessoal_V3';
const RULESET_ID = 21934736;

// Carrega baseline do ruleset (criado em E02)
let requiredChecks = [];
let baselineRules = null;
try {
  const ruleset = JSON.parse(readFileSync(RULESET_FILE, 'utf-8'));
  baselineRules = ruleset;
  const scRule = ruleset.rules?.find((r) => r.type === 'required_status_checks');
  requiredChecks = scRule?.parameters?.required_status_checks?.map((c) => c.context) ?? [];
} catch {
  // Arquivo ainda não existe (E02 pendente) — aviso mas não falha
  console.warn(
    '⚠  infra/github/ruleset-main.json não encontrado (E02 pendente). Pulando validação de checks obrigatórios.'
  );
  process.exit(0);
}

// --full (ruleset-sync): compara o ruleset inteiro e falha se não conseguir ler o vivo.
// Sem a flag (security-config de PR): compara só os nomes dos checks obrigatórios.
const FULL = process.argv.includes('--full');
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort((a, b) => a.localeCompare(b))
            .map((k) => [k, canonical(v[k])])
        )
      : v;
const SECTIONS = {
  enforcement: (r) => r.enforcement,
  conditions: (r) => r.conditions,
  bypass_actors: (r) => [...(r.bypass_actors ?? [])].sort((a, b) => a.actor_id - b.actor_id),
  rules: (r) => [...(r.rules ?? [])].sort((a, b) => a.type.localeCompare(b.type)),
};
const divergentSections = (a, b) =>
  Object.keys(SECTIONS).filter(
    (k) => JSON.stringify(canonical(SECTIONS[k](a))) !== JSON.stringify(canonical(SECTIONS[k](b)))
  );

if (FULL && !process.env.GITHUB_TOKEN) {
  console.error('❌ --full exige GITHUB_TOKEN.');
  process.exit(1);
}

// W17: comparação com ruleset vivo quando GITHUB_TOKEN disponível
if (process.env.GITHUB_TOKEN) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER_REPO}/rulesets/${RULESET_ID}`, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'audit-required-checks',
      },
    });
    if (!res.ok) {
      if (FULL) {
        console.error(`❌ não foi possível buscar o ruleset vivo (HTTP ${res.status}).`);
        process.exit(1);
      }
      console.warn(`⚠  W17: não foi possível buscar ruleset vivo (HTTP ${res.status}) — usando apenas baseline.`);
    } else {
      const live = await res.json();
      // GITHUB_TOKEN (sem admin no repo) recebe campos filtrados da API como
      // null — ex.: bypass_actors só é visível para admins. Comparar essas
      // seções acusaria drift falso: pular as invisíveis ao token e avisar.
      const invisible = FULL ? Object.keys(SECTIONS).filter((k) => live[k] == null) : [];
      if (invisible.length > 0) {
        console.warn(
          `⚠  seções filtradas pela permissão do token (${invisible.join(', ')}) — não comparadas com o baseline.`
        );
      }
      const divergent = FULL
        ? divergentSections(live, baselineRules).filter((k) => live[k] != null)
        : [];
      if (divergent.length > 0) {
        console.error(`❌ ruleset vivo diverge de infra/github/ruleset-main.json em: ${divergent.join(', ')}.`);
        process.exit(1);
      }
      const liveScRule = live.rules?.find((r) => r.type === 'required_status_checks');
      const liveChecks = liveScRule?.parameters?.required_status_checks?.map((c) => c.context) ?? [];
      const baselineSet = new Set(requiredChecks);
      const liveSet = new Set(liveChecks);
      const onlyInBaseline = requiredChecks.filter((c) => !liveSet.has(c));
      const onlyInLive = liveChecks.filter((c) => !baselineSet.has(c));
      if (onlyInBaseline.length > 0 || onlyInLive.length > 0) {
        console.error('❌ W17: divergência entre baseline e ruleset vivo:');
        for (const c of onlyInBaseline) console.error(`  só no baseline: "${c}"`);
        for (const c of onlyInLive) console.error(`  só no live:     "${c}"`);
        console.error('Atualize infra/github/ruleset-main.json para refletir o ruleset vivo.');
        process.exit(1);
      }
      console.log(`✅ W17: baseline em sincronia com ruleset vivo (${liveChecks.length} checks).`);
      // Usa checks do live (fonte de verdade)
      requiredChecks = liveChecks;
    }
  } catch (err) {
    if (FULL) {
      console.error(`❌ erro ao buscar o ruleset vivo: ${err.message}`);
      process.exit(1);
    }
    console.warn(`⚠  W17: erro ao buscar ruleset vivo: ${err.message} — usando apenas baseline.`);
  }
} else {
  console.log('ℹ  W17: GITHUB_TOKEN ausente — usando apenas baseline offline.');
}

if (requiredChecks.length === 0) {
  console.log('Nenhum required_status_checks no ruleset — nada a validar.');
  process.exit(0);
}

// Coleta todos os `name:` de jobs em todos os workflows
const workflows = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
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
