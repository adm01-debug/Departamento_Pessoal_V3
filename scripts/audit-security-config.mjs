#!/usr/bin/env node
/**
 * E-077 · Gate estático de configuração de segurança (sem acesso a banco).
 *
 * Reprova o build quando encontra:
 *   1. Função com `verify_jwt = false` fora da allowlist documentada
 *      (auth-login, healthcheck, metrics, webhook — ver supabase/config.toml).
 *   2. CORS wildcard (`Access-Control-Allow-Origin: *`) em edge functions.
 *   3. Ausência dos security headers em `_shared/contract.ts`.
 *   4. Segredo hardcoded no padrão do migrate-helper (A-015): string hex
 *      longa atribuída a constante com nome de chave/segredo.
 *   5. Service Worker cacheando rota de PII (regressão do E-037).
 *
 * Uso: node scripts/audit-security-config.mjs   (exit 1 = reprovado)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const failures = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => { console.error(`  ❌ ${m}`); failures.push(m); };
let sectionStart = 0;
const section = (title) => { console.log(title); sectionStart = failures.length; };
const sectionClean = (m) => { if (failures.length === sectionStart) ok(m); };

// ── 1. verify_jwt ──────────────────────────────────────────────────────────
section('1. verify_jwt (config.toml)');
const toml = readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
const JWT_PUBLIC_ALLOWLIST = new Set(['auth-login', 'healthcheck', 'metrics', 'webhook']);
const fnBlocks = [...toml.matchAll(/\[functions\.([\w-]+)\]\s*\nverify_jwt\s*=\s*(true|false)/g)];
for (const [, fn, val] of fnBlocks) {
  if (val === 'false' && !JWT_PUBLIC_ALLOWLIST.has(fn)) {
    fail(`função '${fn}' com verify_jwt=false fora da allowlist ${[...JWT_PUBLIC_ALLOWLIST].join(', ')}`);
  }
}
if (fnBlocks.every(([, fn]) => fn !== 'migrate-helper')) ok('migrate-helper ausente do config.toml');
else fail('migrate-helper ainda presente no config.toml (A-015)');
sectionClean('verify_jwt deny-by-default preservado');

// ── 2. CORS wildcard em edge functions ─────────────────────────────────────
section('2. CORS wildcard');
const FN_DIR = join(ROOT, 'supabase/functions');
const corsWild = /Access-Control-Allow-Origin["']?\s*[:=]\s*["']\*["']/;
for (const dir of readdirSync(FN_DIR, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const idx = join(FN_DIR, dir.name, 'index.ts');
  if (!existsSync(idx)) continue;
  const src = readFileSync(idx, 'utf8');
  if (corsWild.test(src)) fail(`CORS '*' em supabase/functions/${dir.name}/index.ts`);
}
sectionClean('nenhum CORS wildcard em edge functions');

// ── 3. Security headers no contrato compartilhado ──────────────────────────
section('3. Security headers (_shared/contract.ts)');
const contract = readFileSync(join(FN_DIR, '_shared/contract.ts'), 'utf8');
if (/\?\s*[^:]+:\s*["']\*["']/.test(contract) || /getCorsHeaders\(\)\s*;[\s\S]*Access-Control-Allow-Origin[^\n]*\*/.test(contract)) {
  fail('fallback CORS wildcard presente em _shared/contract.ts');
}
for (const h of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security']) {
  if (!contract.includes(h)) fail(`header ${h} ausente em _shared/contract.ts`);
}
sectionClean('security headers presentes');

// ── 4. Segredo hardcoded (padrão A-015) ────────────────────────────────────
section('4. Segredos hardcoded em edge functions');
const secretAssign = /(?:KEY|SECRET|TOKEN|PASSWORD)\s*=\s*["'][0-9a-f]{32,}["']/i;
for (const dir of readdirSync(FN_DIR, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const idx = join(FN_DIR, dir.name, 'index.ts');
  if (!existsSync(idx)) continue;
  const src = readFileSync(idx, 'utf8');
  if (secretAssign.test(src)) fail(`possível segredo hardcoded em ${dir.name}/index.ts (padrão A-015)`);
}
sectionClean('nenhum segredo hardcoded detectado');

// ── 5. Service Worker não cacheia PII (E-037) ──────────────────────────────
section('5. Service Worker (E-037)');
const swPath = join(ROOT, 'public/sw-custom.js');
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  if (/CacheOnly/i.test(sw)) fail('sw-custom.js contém estratégia CacheOnly (PII offline)');
  // Exige a DECLARAÇÃO da denylist (const), não menção em comentário —
  // um comentário citando "PII_PATH" não deve satisfazer o gate.
  if (!/const\s+PII_PATH\s*=/.test(sw)) fail('sw-custom.js sem denylist de PII declarada (const PII_PATH = ...)');
  if (/Default:\s*StaleWhileRevalidate/.test(sw)) fail('sw-custom.js com default SWR (cacheia tudo)');
  sectionClean('SW com allowlist estática e sem cache de PII');
} else {
  console.log('  ⏭️  sw-custom.js ausente — nada a verificar');
}

// ── Resultado ──────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n❌ E-077: ${failures.length} problema(s) de configuração de segurança`);
  process.exit(1);
}
console.log('\n✅ E-077: configuração de segurança aprovada');
