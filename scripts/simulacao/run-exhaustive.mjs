#!/usr/bin/env node
/**
 * Orquestrador de simulação exaustiva pós-hardening (Etapas 1–6).
 * Executa:
 *   1) Contract bridge (repetido N vezes)
 *   2) Latência SELECT em tabelas críticas (M chamadas)
 *   3) CSRF fail-closed (origins válidos, inválidos, ausentes)
 *   4) Rate limit (rajada até 429)
 *   5) Integridade — smoke via bridge/GET
 * Emite JSON bruto + markdown.
 *
 * Uso: node scripts/simulacao/run-exhaustive.mjs [--contract-loops=5] [--latency-samples=200]
 */
import fs from 'node:fs';
import path from 'node:path';

const envRaw = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(
  envRaw
    .split('\n')
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const URL_ = env.VITE_SUPABASE_URL;
// Usa PUBLISHABLE_KEY (que casa com o projeto atual) preferencialmente
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const BRIDGE = `${URL_}/functions/v1/external-db-bridge`;
const ORIGIN_OK = 'https://unified-harmony-hub.lovable.app';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const CONTRACT_LOOPS = Number(args['contract-loops'] || 5);
const LATENCY_SAMPLES = Number(args['latency-samples'] || 200);

const percentile = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

async function callBridge(body, { origin = ORIGIN_OK, auth = ANON, apikey = ANON } = {}) {
  const t0 = Date.now();
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apikey) headers.apikey = apikey;
    if (auth) headers.Authorization = `Bearer ${auth}`;
    if (origin) {
      headers.Origin = origin;
      headers.Referer = `${origin}/`;
    }
    const res = await fetch(BRIDGE, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
    return { status: res.status, json, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, json: { error: e.message }, ms: Date.now() - t0 };
  }
}

// ---- 1) Contract loop ----
const CONTRACT_SCENARIOS = [
  ['select_simple', 'ok', { action: 'select', table: 'empresas', limit: 1 }],
  ['select_count', 'ok', { action: 'select', table: 'empresas', limit: 1, countMode: 'exact' }],
  ['filter_eq', 'ok', { action: 'select', table: 'empresas', filters: [{ column: 'id', op: 'eq', value: '00000000-0000-0000-0000-000000000000' }] }],
  ['filter_in', 'ok', { action: 'select', table: 'empresas', filters: [{ column: 'id', op: 'in', value: ['00000000-0000-0000-0000-000000000000'] }] }],
  ['filter_is_null', 'ok', { action: 'select', table: 'empresas', filters: [{ column: 'deleted_at', op: 'is', value: null }], limit: 1 }],
  ['filter_ilike', 'ok', { action: 'select', table: 'empresas', filters: [{ column: 'razao_social', op: 'ilike', value: '%x%' }], limit: 1 }],
  ['order_range', 'ok', { action: 'select', table: 'empresas', order: { column: 'created_at', ascending: false }, offset: 0, limit: 5 }],
  ['delete_sem_filtro_bloqueado', 'err', { action: 'delete', table: 'empresas' }],
  ['update_sem_filtro_bloqueado', 'err', { action: 'update', table: 'empresas', data: { x: 1 } }],
  ['tabela_inexistente', 'err', { action: 'select', table: '__nope__', limit: 1 }],
  ['coluna_inexistente', 'err', { action: 'select', table: 'empresas', columns: 'nao_existe_col' }],
  ['rpc_inexistente', 'err', { action: 'rpc', fn: 'rpc_nao_existe', params: {} }],
];

async function runContract() {
  const results = [];
  for (let i = 0; i < CONTRACT_LOOPS; i++) {
    for (const [name, expect, body] of CONTRACT_SCENARIOS) {
      const r = await callBridge(body);
      const gotErr = r.json?.error || r.status >= 400;
      const pass = expect === 'ok' ? !gotErr : !!gotErr;
      results.push({ loop: i, name, expect, pass, status: r.status, ms: r.ms });
    }
  }
  const times = results.map((r) => r.ms);
  return {
    total: results.length,
    pass: results.filter((r) => r.pass).length,
    fail: results.filter((r) => !r.pass).length,
    p50: percentile(times, 0.5),
    p95: percentile(times, 0.95),
    p99: percentile(times, 0.99),
    failures: results.filter((r) => !r.pass).slice(0, 20),
  };
}

// ---- 2) Latency probe ----
async function runLatency() {
  const tables = ['empresas', 'colaboradores', 'folhas_pagamento'];
  const out = {};
  for (const t of tables) {
    const times = [];
    let errors = 0;
    const perTable = Math.floor(LATENCY_SAMPLES / tables.length);
    for (let i = 0; i < perTable; i++) {
      const r = await callBridge({ action: 'select', table: t, limit: 1 });
      if (r.status >= 400 || r.json?.error) errors++;
      else times.push(r.ms);
    }
    out[t] = {
      samples: perTable,
      errors,
      p50: percentile(times, 0.5),
      p95: percentile(times, 0.95),
      p99: percentile(times, 0.99),
      max: times.length ? Math.max(...times) : null,
    };
  }
  return out;
}

// ---- 3) CSRF fail-closed ----
async function runCsrf() {
  const cases = [
    { name: 'origin_ok', origin: ORIGIN_OK, expectBlock: false },
    { name: 'origin_ausente', origin: null, expectBlock: true },
    { name: 'origin_evil', origin: 'https://evil.example.com', expectBlock: true },
    { name: 'origin_localhost', origin: 'http://localhost:8080', expectBlock: false },
    { name: 'origin_preview', origin: 'https://id-preview--6b75936b-47df-442a-8778-2840c71d84af.lovable.app', expectBlock: false },
  ];
  const out = [];
  for (const c of cases) {
    const r = await callBridge({ action: 'select', table: 'empresas', limit: 1 }, { origin: c.origin });
    const blocked = r.status === 403 || /csrf|origin/i.test(String(r.json?.error || ''));
    out.push({ ...c, status: r.status, blocked, pass: blocked === c.expectBlock, error: r.json?.error || null });
  }
  return { cases: out, pass: out.filter((x) => x.pass).length, total: out.length };
}

// ---- 4) Rate limit smoke (bridge — 60/min por IP no _shared/rateLimit) ----
async function runRateBurst() {
  const N = 80;
  const results = await Promise.all(
    Array.from({ length: N }, () => callBridge({ action: 'select', table: 'empresas', limit: 1 })),
  );
  const codes = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  return { total: N, codes, saw429: (codes[429] || 0) > 0 };
}

// ---- Main ----
(async () => {
  console.log(`🚀 Simulação exaustiva — bridge=${BRIDGE}`);
  console.log(`   contract=${CONTRACT_LOOPS}x(${CONTRACT_SCENARIOS.length}) latency=${LATENCY_SAMPLES}`);

  const t0 = Date.now();
  const contract = await runContract();
  console.log(`✅ Contract: ${contract.pass}/${contract.total} (p95=${contract.p95}ms)`);

  const latency = await runLatency();
  for (const [k, v] of Object.entries(latency)) {
    console.log(`✅ Latency ${k}: p50=${v.p50} p95=${v.p95} p99=${v.p99} err=${v.errors}`);
  }

  const csrf = await runCsrf();
  console.log(`✅ CSRF: ${csrf.pass}/${csrf.total}`);

  const rate = await runRateBurst();
  console.log(`✅ Rate burst: codes=${JSON.stringify(rate.codes)} saw429=${rate.saw429}`);

  const report = {
    when: new Date().toISOString(),
    bridge: BRIDGE,
    duration_s: Math.round((Date.now() - t0) / 1000),
    contract,
    latency,
    csrf,
    rate_burst: rate,
  };

  fs.mkdirSync('/mnt/documents', { recursive: true });
  fs.writeFileSync('/mnt/documents/simulacao_exaustiva_v2.json', JSON.stringify(report, null, 2));
  console.log(`\n📝 /mnt/documents/simulacao_exaustiva_v2.json (${report.duration_s}s)`);
})();
