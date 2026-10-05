#!/usr/bin/env node

/**
 * Fail-closed contract gate between production frontend calls and the generic
 * database bridge. A literal `supabase.rpc('name')` added to application code
 * must be reviewed and explicitly admitted by RPC_ALLOWLIST before CI passes.
 *
 * Cobertura deliberada:
 *  - aliases de `supabase` vindos de client OU client.base, por import
 *    nomeado ({ supabase }, { supabase as x }), namespace (* as ns) e
 *    specifier relativo ou @/ — client.base ignora o proxy do bridge, então
 *    `.from(tabela)` nele NUNCA passa pela denylist/tenant scope.
 *  - `.from(<denylisted>)` via alias de client.base falha, EXCETO os call
 *    sites ratchetados em .bridge-base-baseline.json (acesso direto legado,
 *    protegido por RLS admin — o baseline impede o crescimento da exceção).
 *  - `.rpc(` com primeiro argumento não-literal falha: nome dinâmico não é
 *    auditável pela allowlist.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const validationPath = join(root, 'supabase/functions/external-db-bridge/validation.ts');
const accessPath = join(root, 'supabase/functions/external-db-bridge/access.ts');
const vitePath = join(root, 'vite.config.ts');
const contractPath = join(root, 'supabase/functions/_shared/contract.ts');
const baselinePath = join(root, 'scripts/.bridge-base-baseline.json');

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const rel = relative(root, path);
    if (/\/(?:__tests__|tests)\//.test(`/${rel}/`) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name)) {
      continue;
    }
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (/\.[cm]?[jt]sx?$/.test(name)) files.push(path);
  }
  return files;
}

function exportedSet(source, name) {
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*new Set<[^>]+>\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!match) throw new Error(`Não foi possível localizar ${name}`);
  return new Set([...match[1].matchAll(/["']([A-Za-z0-9_]+)["']/g)].map((item) => item[1]));
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

// Aliases {supabase, supabaseBase, ns.supabase} -> lane 'bridge' | 'base'.
function collectSupabaseAliases(source) {
  const aliases = [];
  for (const imp of source.matchAll(
    /import\s+(?:type\s+)?([^'";]+?)\s+from\s+["']([^"']+)["']/g
  )) {
    const [, clause, spec] = imp;
    if (!/integrations\/supabase\/client(?:\.base)?$/.test(spec)) continue;
    const lane = spec.endsWith('.base') ? 'base' : 'bridge';
    const named = clause.match(/\{([^}]+)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const m = part.trim().match(/^supabase(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
        if (m) aliases.push({ name: m[1] ?? 'supabase', lane });
      }
    }
    const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) aliases.push({ name: `${ns[1]}.supabase`, lane });
  }
  return aliases;
}

const calls = new Map();
const dynamicRpcCalls = [];
const bridgeTableCalls = [];
const baseTableCalls = [];
const directLegacyAuditCalls = [];
for (const file of walk(join(root, 'src'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\.from\s*\(\s*["']audit_log["']\s*\)/g)) {
    directLegacyAuditCalls.push(`${relative(root, file)}:${lineAt(source, match.index)}`);
  }
  for (const match of source.matchAll(/\.rpc\s*\(\s*["']([A-Za-z0-9_]+)["']/g)) {
    const locations = calls.get(match[1]) ?? [];
    locations.push(`${relative(root, file)}:${lineAt(source, match.index)}`);
    calls.set(match[1], locations);
  }
  for (const match of source.matchAll(/\.rpc\s*\(\s*([^"'\s)][^,)\n]*)/g)) {
    dynamicRpcCalls.push(`${relative(root, file)}:${lineAt(source, match.index)}`);
  }

  for (const alias of collectSupabaseAliases(source)) {
    const escaped = alias.name.replace(/\./g, '\\.');
    const tablePattern = new RegExp(
      `(?:\\b${escaped}|\\(${escaped}\\s+as\\s+[^)]+\\))\\.from\\s*\\(\\s*["']([A-Za-z0-9_]+)["']`,
      'g'
    );
    for (const match of source.matchAll(tablePattern)) {
      const entry = {
        table: match[1],
        location: `${relative(root, file)}:${lineAt(source, match.index)}`,
        file: relative(root, file),
      };
      (alias.lane === 'base' ? baseTableCalls : bridgeTableCalls).push(entry);
    }
  }
}

const validation = readFileSync(validationPath, 'utf8');
const access = readFileSync(accessPath, 'utf8');
const allowlist = exportedSet(validation, 'RPC_ALLOWLIST');
const denylist = exportedSet(validation, 'TABLE_DENYLIST');
const publicRpcs = exportedSet(access, 'PUBLIC_RPCS');
const failures = [];

// Baseline ratchet: acessos diretos (client.base) a tabelas denylisted que já
// existiam quando o gate ganhou a lane 'base'. Cada entrada é aprovada porque
// a tabela tem policy RLS admin-equivalente — novas entradas exigem revisão.
const baseBaseline = existsSync(baselinePath)
  ? new Set(JSON.parse(readFileSync(baselinePath, 'utf8')).map((e) => `${e.file}:${e.table}`))
  : new Set();

if (directLegacyAuditCalls.length) {
  failures.push(
    `Leitura/escrita frontend direta na tabela legada audit_log; use RPC tenant-scoped: ${directLegacyAuditCalls.join(', ')}`
  );
}

for (const [rpc, locations] of [...calls].sort(([a], [b]) => a.localeCompare(b))) {
  if (!allowlist.has(rpc)) failures.push(`RPC de produção fora da allowlist: ${rpc} (${locations.join(', ')})`);
}
for (const rpc of publicRpcs) {
  if (!allowlist.has(rpc)) failures.push(`RPC pública fora da allowlist principal: ${rpc}`);
}
if (dynamicRpcCalls.length) {
  failures.push(
    `RPC com nome dinâmico não auditável pela allowlist — use literal + RPC_ALLOWLIST: ${dynamicRpcCalls.join(', ')}`
  );
}
for (const call of bridgeTableCalls) {
  if (denylist.has(call.table)) {
    failures.push(`Tabela sensível roteada pelo gateway genérico: ${call.table} (${call.location})`);
  }
}
for (const call of baseTableCalls) {
  if (denylist.has(call.table) && !baseBaseline.has(`${call.file}:${call.table}`)) {
    failures.push(
      `Acesso direto (client.base) a tabela denylisted fora do baseline: ${call.table} (${call.location}) — use RPC dedicada ou aprove no baseline`
    );
  }
}

const forbidden = [
  'check_account_lockout',
  'record_login_attempt',
  'reset_login_attempts',
  'check_rate_limit',
  'pg_read_file',
  'run_rls_tests',
];
for (const rpc of forbidden) {
  if (allowlist.has(rpc)) failures.push(`RPC interna/proibida exposta pela bridge: ${rpc}`);
  if (publicRpcs.has(rpc)) failures.push(`RPC interna/proibida exposta anonimamente: ${rpc}`);
}

const vite = readFileSync(vitePath, 'utf8');
const contract = readFileSync(contractPath, 'utf8');
const proxyOrigin = vite.match(/proxyReq\.setHeader\(['"]origin['"],\s*['"]([^'"]+)['"]\)/)?.[1];
if (!proxyOrigin) failures.push('Origin do proxy Vite não pôde ser determinada');
else if (!contract.includes(`'${proxyOrigin}'`) && !contract.includes(`"${proxyOrigin}"`)) {
  failures.push(`Origin do proxy Vite não pertence à allowlist CORS: ${proxyOrigin}`);
}

if (failures.length) {
  console.error(`BRIDGE_FRONTEND_CONTRACT_FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `BRIDGE_FRONTEND_CONTRACT_OK production_rpcs=${calls.size} allowlisted=${allowlist.size} public_token_rpcs=${publicRpcs.size} base_denylist_baseline=${baseBaseline.size}`
);
