#!/usr/bin/env node
/**
 * Etapa 11 — wrapper de simulação exaustiva pós-cutover.
 *
 * Executa em sequência:
 *   1) Contract test (18 cenários) — via verify_bridge_contract.cjs
 *   2) Sonda de latência — 100 SELECTs curtos em `empresas`, calcula p50/p95/p99
 *   3) Presença de infra — 5 tabelas críticas via HEAD count
 *
 * Saída: /mnt/documents/run_all_report.json + resumo humano no stdout.
 * Exit code != 0 se qualquer categoria falhar.
 *
 * Sem deps externas — Node puro. Respeita CSRF Origin allowlisted.
 */

/* eslint-disable no-console */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !ANON) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes.');
  process.exit(2);
}

const ORIGIN = 'https://unified-harmony-hub.lovable.app';
const BRIDGE = `${SUPABASE_URL}/functions/v1/external-db-bridge`;

async function bridge(body) {
  const start = Date.now();
  const res = await fetch(BRIDGE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok && !json?.error, status: res.status, json, ms: Date.now() - start };
}

// ---------- 1. Contract test -------------------------------------------------
function runContractTest() {
  console.log('\n▶ [1/3] Contract test');
  const script = resolve(__dirname, 'verify_bridge_contract.cjs');
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  return { passed: r.status === 0, exitCode: r.status };
}

// ---------- 2. Sonda de latência ---------------------------------------------
async function latencyProbe(n = 100) {
  console.log(`\n▶ [2/3] Sonda de latência (${n} chamadas)`);
  const samples = [];
  let fails = 0;
  for (let i = 0; i < n; i++) {
    const r = await bridge({ action: 'select', table: 'empresas', limit: 1 });
    if (!r.ok) fails++;
    samples.push(r.ms);
    if (i % 10 === 9) process.stdout.write('.');
  }
  console.log();
  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const stats = { n, fails, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: sorted[sorted.length - 1] };
  const passed = fails === 0 && stats.p95 < 1500;
  console.log(`  p50=${stats.p50}ms p95=${stats.p95}ms p99=${stats.p99}ms max=${stats.max}ms fails=${fails}`);
  console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'} (esperado: fails=0 e p95<1500ms)`);
  return { passed, stats };
}

// ---------- 3. Presença de infra --------------------------------------------
async function infraPresence() {
  console.log('\n▶ [3/3] Presença de tabelas críticas');
  const tables = ['empresas', 'colaboradores', 'folhas_pagamento', 'registros_ponto', 'profiles'];
  const results = [];
  for (const t of tables) {
    const r = await bridge({ action: 'select', table: t, limit: 1, countMode: 'exact' });
    const ok = r.ok;
    console.log(`  ${ok ? '✓' : '✗'} ${t.padEnd(22)} ${r.status}  ${r.ms}ms`);
    results.push({ table: t, ok, status: r.status, ms: r.ms, error: r.json?.error || null });
  }
  const passed = results.every((r) => r.ok);
  console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'} (${results.filter((r) => r.ok).length}/${tables.length} tabelas acessíveis)`);
  return { passed, results };
}

// ---------- Main -------------------------------------------------------------
(async () => {
  console.log(`🚀 run-all simulação — ${BRIDGE}`);
  const contract = runContractTest();
  const latency = await latencyProbe(100);
  const infra = await infraPresence();

  const report = {
    when: new Date().toISOString(),
    bridge: BRIDGE,
    contract,
    latency,
    infra,
    allPassed: contract.passed && latency.passed && infra.passed,
  };

  try { mkdirSync('/mnt/documents', { recursive: true }); } catch { /* ok */ }
  writeFileSync('/mnt/documents/run_all_report.json', JSON.stringify(report, null, 2));

  console.log('\n───────────────────────────────────────────────');
  console.log(`  Contract test : ${contract.passed ? '✅' : '❌'}`);
  console.log(`  Latência p95  : ${latency.passed ? '✅' : '❌'}  (${latency.stats.p95}ms)`);
  console.log(`  Infra presente: ${infra.passed ? '✅' : '❌'}`);
  console.log(`  📝 /mnt/documents/run_all_report.json`);
  console.log('───────────────────────────────────────────────');

  process.exit(report.allPassed ? 0 : 1);
})();
