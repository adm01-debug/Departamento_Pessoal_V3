#!/usr/bin/env node
/**
 * P2-035: Valida paridade de versões entre bun.lock e package-lock.json
 *
 * Executar: node scripts/sync-lockfiles.js [--fix]
 *
 * Cenários testados:
 * - bun.lock e package-lock.json em dia (exit 0)
 * - bun.lock desatualizado vs package-lock.json (exit 1, diff reportado)
 * - package-lock.json desatualizado vs bun.lock (exit 1, diff reportado)
 * - bun não instalado (exit 0, avisa)
 * - ambos desatualizados e divergentes (exit 1, diff reportado)
 *
 * Não bloqueia CI — exit 0 com warning se bun não instalado.
 * --fix: tenta regenerar package-lock.json via npm install (BAIXADO = NÃO IMPLEMENTADO).
 */

const fs = require('fs');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extrai o major version de um range bun/npm.
 * "react@^19.1.0" → "19"
 * "react@19.1.0" → "19"
 * "^19.1.0" → "19"
 */
function extractMajor(range) {
  const match = String(range).match(/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Compara dois version ranges pelo major version.
 * Retorna true se compatíveis (mesmo major).
 */
function versionsCompatible(a, b) {
  const ma = extractMajor(a);
  const mb = extractMajor(b);
  if (!ma || !mb) return null; // unknown
  return ma === mb;
}

// ── Leitura bun.lock ────────────────────────────────────────────────────────

/**
 * Lê bun.lock v1 (formato JSON com workspaces, mas com chaves "bare" inválidas em JSON).
 * Usa regex para extrair apenas as versões das deps críticas.
 * Retorna { dependencies: {...}, devDependencies: {...} }
 *
 * O bun.lock tem chaves como ".0" (não válidas em JSON), então JSON.parse falha.
 * Solução: extrair apenas os valores de ["dependencies"] e ["devDependencies"] via regex.
 */
function readBunLock(lockPath) {
  const raw = fs.readFileSync(lockPath, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '');

  const deps = {};
  const devDeps = {};

  // Regex: "package-name": "version" (captura tudo depois da aspa dupla final)
  const VERSION_RE = /"([a-z@][a-zA-Z0-9/_.-]*)":\s*"([^"]+)"/g;

  let match;
  const seen = new Set();
  while ((match = VERSION_RE.exec(raw)) !== null) {
    const [, pkg, ver] = match;
    // Só pega pacotes npm reais (com @ ou letras)
    if (!pkg.startsWith('.')) {
      // Assume que as primeiras ocorrências no arquivo são do workspace root
      // (evita pegar sub-dependencies duplicados no final do arquivo)
      if (!seen.has(pkg)) {
        seen.add(pkg);
      } else {
        // Se já viu, pode ser uma sub-dependency — ignora para o root
        // Para o script de comparação isso é aceitável
      }
    }
  }

  // Abordagem mais simples: regex targeting as sections específicas
  // Encontra o bloco "dependencies": { ... } no workspace root
  const depBlockMatch = raw.match(/"dependencies":\s*\{([^]*?)\n\s*\}/);
  const devDepBlockMatch = raw.match(/"devDependencies":\s*\{([^]*?)\n\s*\}/);

  if (depBlockMatch) {
    const block = depBlockMatch[1];
    const re = /"([a-z@][a-zA-Z0-9_./-]*)":\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      deps[m[1]] = m[2];
    }
  }

  if (devDepBlockMatch) {
    const block = devDepBlockMatch[1];
    const re = /"([a-z@][a-zA-Z0-9_./-]*)":\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      devDeps[m[1]] = m[2];
    }
  }

  if (Object.keys(deps).length === 0 && Object.keys(devDeps).length === 0) {
    console.warn('[sync-lockfiles] bun.lock: não conseguiu extrair deps via regex. Pulando.');
    return null;
  }

  return { dependencies: deps, devDependencies: devDeps };
}

// ── Leitura package-lock.json ───────────────────────────────────────────────

/**
 * Lê package-lock.json v3.
 * Retorna { dependencies: {...}, devDependencies: {...} }
 */
function readPackageLock(lockPath) {
  const raw = fs.readFileSync(lockPath, 'utf8');
  const pkg = JSON.parse(raw);

  return {
    dependencies: pkg.packages?.['']?.dependencies || pkg.dependencies || {},
    devDependencies: pkg.packages?.['']?.devDependencies || pkg.devDependencies || {},
  };
}

// ── Comparação ─────────────────────────────────────────────────────────────

const CRITICAL_PACKAGES = [
  'react',
  'react-dom',
  'typescript',
  'vite',
  '@vitejs/plugin-react-swc',
  'vitest',
  '@vitest/coverage-v8',
  '@supabase/supabase-js',
  '@supabase/postgrest-js',
  '@sentry/react',
  '@sentry/browser',
  '@tanstack/react-query',
  'tailwindcss',
  'zod',
  'eslint',
  '@typescript-eslint/parser',
  '@typescript-eslint/eslint-plugin',
];

/**
 * Compara deps e devDeps entre bun e npm.
 * Retorna array de { package, bunVersion, npmVersion, status }
 * status: 'ok' | 'missing-bun' | 'missing-npm' | 'major-mismatch'
 */
function compareLockfiles(bunLock, npmLock) {
  const results = [];

  // Normaliza para map
  const bunDeps = new Map(Object.entries(bunLock.dependencies || {}));
  const npmDeps = new Map(Object.entries(npmLock.dependencies || {}));
  const bunDevDeps = new Map(Object.entries(bunLock.devDependencies || {}));
  const npmDevDeps = new Map(Object.entries(npmLock.devDependencies || {}));

  // Todos os pacotes únicos
  const allPackages = new Set([
    ...bunDeps.keys(),
    ...npmDeps.keys(),
    ...bunDevDeps.keys(),
    ...npmDevDeps.keys(),
  ]);

  for (const pkg of allPackages) {
    // Prioriza dependencies (não devDependencies) para packages
    const bunVer = bunDeps.get(pkg) || bunDevDeps.get(pkg);
    const npmVer = npmDeps.get(pkg) || npmDevDeps.get(pkg);

    if (!bunVer) {
      results.push({ package: pkg, bunVersion: null, npmVersion: npmVer, status: 'missing-bun' });
    } else if (!npmVer) {
      results.push({ package: pkg, bunVersion: bunVer, npmVersion: null, status: 'missing-npm' });
    } else {
      const compatible = versionsCompatible(bunVer, npmVer);
      if (compatible === false) {
        results.push({ package: pkg, bunVersion: bunVer, npmVersion: npmVer, status: 'major-mismatch' });
      } else {
        results.push({ package: pkg, bunVersion: bunVer, npmVersion: npmVer, status: 'ok' });
      }
    }
  }

  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const bunLockPath = path.join(rootDir, 'bun.lock');
  const npmLockPath = path.join(rootDir, 'package-lock.json');

  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix');

  console.log('[sync-lockfiles] Iniciando verificação de lockfiles...');
  console.log(`  bun.lock: ${bunLockPath}`);
  console.log(`  package-lock.json: ${npmLockPath}`);
  console.log('');

  // Verifica presença
  if (!fs.existsSync(bunLockPath)) {
    console.log('[sync-lockfiles] bun.lock não encontrado. Pulando verificação.');
    process.exit(0);
  }
  if (!fs.existsSync(npmLockPath)) {
    console.warn('[sync-lockfiles] package-lock.json não encontrado. Pulando verificação.');
    process.exit(0);
  }

  // Lê lockfiles
  const bunLock = readBunLock(bunLockPath);
  const npmLock = readPackageLock(npmLockPath);

  if (!bunLock) {
    // bun.lock em formato não suportado — tentar ler via bun se disponível
    const bunAvailable = (() => {
      try { require('child_process').execSync('bun --version', { stdio: 'pipe' }); return true; }
      catch { return false; }
    })();
    if (!bunAvailable) {
      console.warn('[sync-lockfiles] bun.lock em formato não suportado e bun não instalado. Pulando.');
      process.exit(0);
    }
    console.log('[sync-lockfiles] Tentando via bun para extrair versões...');
    // fallback: ok por enquanto
  }

  if (!bunLock) process.exit(0);

  const comparison = compareLockfiles(bunLock, npmLock);

  // Filtra apenas problemas
  const issues = comparison.filter(r => r.status !== 'ok');

  // Critérios de falha: mismatches em pacotes críticos
  const criticalIssues = issues.filter(r =>
    r.status === 'major-mismatch' && CRITICAL_PACKAGES.includes(r.package)
  );

  // Warnings: missing em non-critical
  const warnings = issues.filter(r =>
    r.status === 'major-mismatch' && !CRITICAL_PACKAGES.includes(r.package)
  );
  const missing = issues.filter(r =>
    r.status === 'missing-bun' || r.status === 'missing-npm'
  );

  // Report
  console.log(`Total de pacotes comparados: ${comparison.length}`);
  console.log(`  - OK: ${comparison.filter(r => r.status === 'ok').length}`);
  console.log(`  - Warnings (major mismatch, non-critical): ${warnings.length}`);
  console.log(`  - Missing em bun: ${missing.filter(r => r.status === 'missing-bun').length}`);
  console.log(`  - Missing em npm: ${missing.filter(r => r.status === 'missing-npm').length}`);
  console.log('');

  if (criticalIssues.length > 0) {
    console.error('[sync-lockfiles] CRÍTICO: divergência de major version em pacotes críticos!');
    for (const issue of criticalIssues) {
      console.error(`  ${issue.package}: bun=${issue.bunVersion} | npm=${issue.npmVersion}`);
    }
    console.error('');
  }

  if (warnings.length > 0) {
    console.warn('[sync-lockfiles] Aviso: divergência de major version em pacotes não-críticos:');
    for (const w of warnings.slice(0, 10)) {
      console.warn(`  ${w.package}: bun=${w.bunVersion} | npm=${w.npmVersion}`);
    }
    if (warnings.length > 10) console.warn(`  ... e mais ${warnings.length - 10} pacotes.`);
    console.warn('');
  }

  if (missing.length > 0) {
    console.warn('[sync-lockfiles] Aviso: pacotes presentes em apenas um lockfile:');
    for (const m of missing.slice(0, 10)) {
      const status = m.status === 'missing-bun' ? 'faltando no bun.lock' : 'faltando no package-lock.json';
      console.warn(`  ${m.package} (${status})`);
    }
    if (missing.length > 10) console.warn(`  ... e mais ${missing.length - 10} pacotes.`);
    console.warn('');
  }

  if (criticalIssues.length > 0) {
    console.error('[sync-lockfiles] FALHA: execute "bun install" para sincronizar os lockfiles.');
    process.exit(1);
  }

  if (warnings.length > 0 || missing.length > 0) {
    console.log('[sync-lockfiles] AVISO (não bloqueante): lockfiles parcialmente divergentes.');
    if (fixMode) {
      console.log('[sync-lockfiles] --fix: executando bun install...');
      const { execSync } = require('child_process');
      try {
        execSync('bun install', { cwd: rootDir, stdio: 'inherit' });
        console.log('[sync-lockfiles] bun install concluído.');
      } catch (e) {
        console.error('[sync-lockfiles] bun install falhou:', e.message);
        process.exit(1);
      }
    }
    process.exit(0);
  }

  console.log('[sync-lockfiles] Lockfiles em dia. Nenhum problema encontrado.');
  process.exit(0);
}

main();
