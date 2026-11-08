/**
 * Verificação de integridade de dependências.
 *
 * Muito além dos 4 deps originais:
 * - Verifica TODAS as dependências de produção (não apenas as críticas).
 * - Aplica a regra do projeto "typescript < 6.1" — bump para ≥ 6.1 é
 *   proibido por AGENTS.md e quebra a checagem de tipos.
 * - Detecta lockfiles de executores banidos (yarn.lock, pnpm-lock.yaml,
 *   bun.lockb) — o projeto usa exclusivamente npm.
 * - Detecta campo `packageManager` apontando para executor não-npm.
 * - Auto-validação: assertions sobre o próprio motor de verificação;
 *   exit 1 se qualquer assertion falhar.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const packageJsonPath = path.resolve(root, 'package.json');
const nodeModulesPath = path.resolve(root, 'node_modules');

// ---- Auto-validação do motor ----
// Extrai major.minor de uma especificação de versão semver (com prefixos ^~>=<).
function parseMajorMinor(version) {
  const clean = String(version).replace(/^[^0-9]*/, '');
  const parts = clean.split('.');
  return { major: Number(parts[0] ?? 0), minor: Number(parts[1] ?? 0) };
}

let assertErrors = 0;
const assertList = [];
function assert(condition, msg) {
  if (!condition) { assertErrors++; assertList.push(`ASSERT: ${msg}`); }
}

assert(parseMajorMinor('6.0.3').major === 6 && parseMajorMinor('6.0.3').minor === 0, 'parseMajorMinor exact 6.0.3');
assert(parseMajorMinor('^5.9.0').major === 5 && parseMajorMinor('^5.9.0').minor === 9, 'parseMajorMinor ^5.9.0');
assert(parseMajorMinor('~4.2.1').major === 4 && parseMajorMinor('~4.2.1').minor === 2, 'parseMajorMinor ~4.2.1');
assert(parseMajorMinor('>=6.1.0').major === 6 && parseMajorMinor('>=6.1.0').minor === 1, 'parseMajorMinor >=6.1.0');
assert(parseMajorMinor('1.1.1').major === 1 && parseMajorMinor('1.1.1').minor === 1, 'parseMajorMinor exact 1.1.1');
// Regra de boundary: 6.0.x não viola; 6.1.0 viola
function violatesTs61(v) { const { major, minor } = parseMajorMinor(v); return major > 6 || (major === 6 && minor >= 1); }
assert(!violatesTs61('6.0.3'), 'violatesTs61: 6.0.3 não viola');
assert(!violatesTs61('^5.9.0'), 'violatesTs61: ^5.9.0 não viola');
assert(violatesTs61('6.1.0'), 'violatesTs61: 6.1.0 viola');
assert(violatesTs61('^6.1.0'), 'violatesTs61: ^6.1.0 viola');
assert(violatesTs61('7.0.0'), 'violatesTs61: 7.0.0 viola');

if (assertErrors > 0) {
  assertList.forEach(e => console.error(e));
  process.exit(1);
}

// ---- Verificação principal ----
let failures = 0;
console.log('--- Verificação de Integridade de Dependências ---');

// 1. package.json legível e JSON válido
if (!fs.existsSync(packageJsonPath)) {
  console.error('ERRO CRÍTICO: package.json não encontrado!');
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
} catch (e) {
  console.error(`ERRO CRÍTICO: package.json inválido: ${e.message}`);
  process.exit(1);
}

// 2. TypeScript < 6.1 (AGENTS.md: "Não bumpar typescript para ≥ 6.1")
const tsVersion = pkg.devDependencies?.typescript ?? pkg.dependencies?.typescript;
if (tsVersion) {
  if (violatesTs61(tsVersion)) {
    console.error(`ERRO: typescript "${tsVersion}" viola "não bumpar para ≥ 6.1" (AGENTS.md).`);
    failures++;
  } else {
    console.log(`ok: typescript "${tsVersion}" < 6.1 ✓`);
  }
} else {
  console.warn('AVISO: typescript não declarado em package.json.');
}

// 3. Lockfiles de executores banidos (npm ci é o único executor autorizado)
const FORBIDDEN_LOCKFILES = ['yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '.yarn'];
for (const lockfile of FORBIDDEN_LOCKFILES) {
  if (fs.existsSync(path.resolve(root, lockfile))) {
    console.error(`ERRO: lockfile de executor banido encontrado: ${lockfile} (usar somente npm).`);
    failures++;
  }
}

// 4. Campo packageManager apontando para executor não-npm
if (pkg.packageManager && !pkg.packageManager.startsWith('npm')) {
  console.error(`ERRO: "packageManager": "${pkg.packageManager}" — executor não-npm (usar somente npm).`);
  failures++;
}

// 5. Todas as dependências de produção instaladas
const prodDeps = Object.keys(pkg.dependencies ?? {});
const notInstalled = [];
if (fs.existsSync(nodeModulesPath)) {
  for (const dep of prodDeps) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) notInstalled.push(dep);
  }
  if (notInstalled.length > 0) {
    for (const dep of notInstalled) {
      console.error(`ERRO: "${dep}" declarado mas não instalado em node_modules.`);
    }
    failures += notInstalled.length;
    console.error(`\n  ${notInstalled.length} dependência(s) faltando. Execute: npm ci`);
  } else {
    console.log(`ok: ${prodDeps.length} dependências de produção instaladas ✓`);
  }
} else {
  console.warn(`AVISO: node_modules não encontrado — execute npm ci antes de verificar.`);
}

// 6. Sumário
if (failures > 0) {
  console.error(`\n❌ ${failures} problema(s) de dependência encontrado(s).`);
  process.exit(1);
}

console.log(`\n✅ Dependências íntegras: ${prodDeps.length} prod, typescript < 6.1, sem executor banido.`);
console.log(`Auto-validação: ✅ 0 erros de assertion`);
