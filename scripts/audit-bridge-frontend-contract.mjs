#!/usr/bin/env node

/**
 * Fail-closed contract gate between production frontend calls and the generic
 * database bridge. A literal `supabase.rpc('name')` added to application code
 * must be reviewed and explicitly admitted by RPC_ALLOWLIST before CI passes.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const validationPath = join(root, 'supabase/functions/external-db-bridge/validation.ts');
const accessPath = join(root, 'supabase/functions/external-db-bridge/access.ts');
const vitePath = join(root, 'vite.config.ts');
const contractPath = join(root, 'supabase/functions/_shared/contract.ts');

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

const calls = new Map();
const bridgeTableCalls = [];
const directLegacyAuditCalls = [];
for (const file of walk(join(root, 'src'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\.from\s*\(\s*["']audit_log["']\s*\)/g)) {
    directLegacyAuditCalls.push(`${relative(root, file)}:${source.slice(0, match.index).split('\n').length}`);
  }
  for (const match of source.matchAll(/\.rpc\s*\(\s*["']([A-Za-z0-9_]+)["']/g)) {
    const line = source.slice(0, match.index).split('\n').length;
    const locations = calls.get(match[1]) ?? [];
    locations.push(`${relative(root, file)}:${line}`);
    calls.set(match[1], locations);
  }

  const bridgeImport = source.match(/import\s*\{([^}]+)\}\s*from\s*["']@\/integrations\/supabase\/client["']/);
  if (bridgeImport) {
    const importedSupabase = bridgeImport[1]
      .split(',')
      .map((part) => part.trim())
      .find((part) => /^supabase(?:\s+as\s+[A-Za-z_$][\w$]*)?$/.test(part));
    const alias =
      importedSupabase?.match(/(?:\s+as\s+([A-Za-z_$][\w$]*))?$/)?.[1] ?? (importedSupabase ? 'supabase' : null);
    if (alias) {
      const tablePattern = new RegExp(
        `(?:\\b${alias}|\\(${alias}\\s+as\\s+[^)]+\\))\\.from\\s*\\(\\s*["']([A-Za-z0-9_]+)["']`,
        'g'
      );
      for (const match of source.matchAll(tablePattern)) {
        bridgeTableCalls.push({
          table: match[1],
          location: `${relative(root, file)}:${source.slice(0, match.index).split('\n').length}`,
        });
      }
    }
  }
}

const validation = readFileSync(validationPath, 'utf8');
const access = readFileSync(accessPath, 'utf8');
const allowlist = exportedSet(validation, 'RPC_ALLOWLIST');
const denylist = exportedSet(validation, 'TABLE_DENYLIST');
const publicRpcs = exportedSet(access, 'PUBLIC_RPCS');
const failures = [];

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
for (const call of bridgeTableCalls) {
  if (denylist.has(call.table)) {
    failures.push(`Tabela sensível roteada pelo gateway genérico: ${call.table} (${call.location})`);
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
  `BRIDGE_FRONTEND_CONTRACT_OK production_rpcs=${calls.size} allowlisted=${allowlist.size} public_token_rpcs=${publicRpcs.size} sensitive_bridge_calls=0`
);
