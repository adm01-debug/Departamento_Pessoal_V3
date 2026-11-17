#!/usr/bin/env node
/**
 * Agente A2 · Harness de teste do Service Worker (E-037)
 * Carrega public/sw-custom.js num sandbox com mocks de self/caches/fetch
 * e dispara eventos de fetch sintéticos, verificando:
 *   - respondWith CHAMADO  → resposta servida pelo SW (cache envolvido)
 *   - respondWith NUNCA chamado para PII/auth/funções/Supabase (network-only)
 * Exit 0 = todos os cenários com o resultado esperado.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const swPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'sw-custom.js');
const src = readFileSync(swPath, 'utf8');

const ORIGIN = 'https://app.dp.example';
let failures = 0;
const results = [];

// ── Mocks ──────────────────────────────────────────────────────────────────
const cacheStore = new Map(); // name → Map(request → response)
const fakeCache = (name) => ({
  match: async (req) => cacheStore.get(name)?.get(typeof req === 'string' ? req : req.url) ?? null,
  put: async (req, res) => {
    if (!cacheStore.has(name)) cacheStore.set(name, new Map());
    cacheStore.get(name).set(typeof req === 'string' ? req : req.url, res);
  },
  delete: async (req) => cacheStore.get(name)?.delete(typeof req === 'string' ? req : req.url) ?? false,
  addAll: async () => {},
});
const caches = {
  open: async (n) => fakeCache(n),
  keys: async () => [...cacheStore.keys()],
  delete: async (n) => cacheStore.delete(n),
  match: async (req) => { for (const m of cacheStore.values()) { const r = m.get(typeof req === 'string' ? req : req.url); if (r) return r; } return null; },
};
const netFetch = async (req) => new Response('net:' + (typeof req === 'string' ? req : req.url), { status: 200 });
const listeners = {};
const makeSelf = () => ({
  location: new URL(ORIGIN + '/'),
  skipWaiting: () => {},
  clients: { claim: async () => {}, matchAll: async () => [], openWindow: async () => {} },
  registration: { showNotification: async () => {} },
  addEventListener: (ev, fn) => { (listeners[ev] ??= []).push(fn); },
});
const sandbox = {
  self: makeSelf(),
  caches,
  fetch: netFetch,
  Response, Request, Blob: class extends Blob {},
  console,
  URL,
  setTimeout: (fn) => fn(),      // executa imediato (biometria n/a aqui)
  clients: undefined,
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'sw-custom.js' });

// Instala handlers de ciclo (para não dar erro de referência)
listeners.install?.forEach((h) => h({ waitUntil: () => {} }));
listeners.activate?.forEach((h) => h({ waitUntil: () => {} }));

async function fireFetch(url, { method = 'GET', mode, headers = {} } = {}) {
  const parsedUrl = new URL(url);
  // Node's Request aceita apenas HTTP(S); o SW ainda recebe a URL da extensão.
  const req = new Request(
    parsedUrl.protocol === 'chrome-extension:' ? ORIGIN + '/' : parsedUrl,
    { method, headers },
  );
  if (parsedUrl.protocol === 'chrome-extension:') {
    Object.defineProperty(req, 'url', { value: parsedUrl.href });
  }
  // Node/undici não aceita mode:'navigate' no construtor; o getter vive no
  // prototype — uma propriedade própria na instância o oculta sem erro.
  if (mode) Object.defineProperty(req, 'mode', { value: mode });
  let responded = false; let returned;
  const event = {
    request: req,
    respondWith: (p) => { responded = true; returned = p; },
    waitUntil: () => {},
  };
  for (const h of listeners.fetch ?? []) h(event);
  if (responded) await Promise.resolve(returned).catch(() => {});
  return responded;
}

async function scenario(id, desc, url, opts, expectRespondWith) {
  const got = await fireFetch(url, opts);
  const pass = got === expectRespondWith;
  if (!pass) failures++;
  results.push(`${pass ? '✅' : '❌'} ${id} ${desc} → respondWith=${got} (esperado ${expectRespondWith})`);
}

const H = ORIGIN; // same-origin
const scenarios = [
  ['A', 'asset js same-origin (SWR)', H + '/assets/app.js', {}, true],
  ['B', 'imagem same-origin (CacheFirst)', H + '/img/logo.png', {}, true],
  ['C', 'Google Fonts gstatic (dedicado)', 'https://fonts.gstatic.com/s/x.woff2', {}, true],
  ['D', 'navegação HTML (NetworkFirst)', H + '/dashboard', { mode: 'navigate' }, true],
  // E–P e R usam mode:'navigate' (que a allowlist cachearia): sem isso o
  // default network-only escondia a remoção de cada regra de bloqueio.
  ['E', 'supabase COM Authorization', 'https://abc.supabase.co/rest/v1/holerites?select=*',
    { headers: { authorization: '******' }, mode: 'navigate' }, false],
  ['F', 'supabase SEM Authorization (hostname)', 'https://abc.supabase.co/rest/v1/colaboradores', { mode: 'navigate' }, false],
  ['G', 'PII holerites same-origin', H + '/holerites/123.pdf', { mode: 'navigate' }, false],
  ['H', 'PII pagamentos same-origin', H + '/pagamentos/2026-08', { mode: 'navigate' }, false],
  ['I', 'PII dados-bancarios', H + '/dados-bancarios/x', { mode: 'navigate' }, false],
  ['J', 'PII biometria', H + '/biometria/foto.jpg', {}, false],
  ['K', 'PII documentos', H + '/documentos/rg.pdf', { mode: 'navigate' }, false],
  ['L', 'edge function /functions/v1', H + '/functions/v1/calcular-folha', { mode: 'navigate' }, false],
  ['M', 'rota /auth/...', H + '/auth/callback', { mode: 'navigate' }, false],
  ['N', 'rota /mfa/...', H + '/mfa/verify', { mode: 'navigate' }, false],
  ['O', 'POST mutação same-origin', H + '/api/qualquer', { method: 'POST', mode: 'navigate' }, false],
  ['P', 'GET com apikey header', H + '/rest/v1/tabela', { headers: { apikey: 'k' }, mode: 'navigate' }, false],
  ['Q', 'rota desconhecida (default network-only)', H + '/rota-nova-api', {}, false],
  ['R', 'chrome-extension', 'chrome-extension://ext/id', { mode: 'navigate' }, false],
  ['U', 'imagem cross-origin (network-only)', 'https://cdn.outro.example/foto.png', {}, false],
];

for (const [id, desc, url, opts, exp] of scenarios) await scenario(id, desc, url, opts, exp);

// S: uma falha no stream não pode virar HTTP 200 com corpo parcial/vazio.
const safeFetchFn = vm.runInContext('safeFetch', sandbox);
const originalFetch = sandbox.fetch;
sandbox.fetch = async () => new Response(new ReadableStream({
  start(controller) { controller.error(new Error('stream interrompido')); },
}), { status: 200 });
try {
  await safeFetchFn(new Request(H + '/assets/interrompido.js'));
  failures++;
  results.push('❌ S erro de stream foi convertido em resposta 200');
} catch {
  results.push('✅ S erro de stream é propagado (sem falso HTTP 200)');
}
sandbox.fetch = originalFetch;

// V e W: o rewrite SPA da Vercel responde 200 `text/html` para qualquer asset
// que não exista mais (hash antigo após um deploy). Esse HTML não pode entrar
// no cache sob a URL do .js, nem ser servido de um cache já envenenado — é o
// que fazia o browser recusar o módulo por MIME e o app não dar boot.
const swrFn = vm.runInContext('staleWhileRevalidate', sandbox);
const CORE = vm.runInContext('CORE_CACHE', sandbox);
const htmlDoRewrite = () =>
  new Response('<!doctype html><html></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

const urlAssetMorto = H + '/assets/index-HASHMORTO.js';
cacheStore.set(CORE, new Map());
sandbox.fetch = async () => htmlDoRewrite();
await swrFn(new Request(urlAssetMorto), CORE);
const naoEnvenenou = !cacheStore.get(CORE)?.has(urlAssetMorto);
if (!naoEnvenenou) failures++;
results.push(`${naoEnvenenou ? '✅' : '❌'} V HTML do rewrite não entra no cache sob a URL do .js`);

// W: cache já envenenado por uma versão anterior do SW — descarta e vai à rede.
cacheStore.get(CORE).set(urlAssetMorto, htmlDoRewrite());
sandbox.fetch = async () =>
  new Response('export default 1', { status: 200, headers: { 'content-type': 'application/javascript' } });
const servido = await swrFn(new Request(urlAssetMorto), CORE);
const serviuJs = /javascript/i.test(servido?.headers?.get('content-type') || '');
if (!serviuJs) failures++;
results.push(`${serviuJs ? '✅' : '❌'} W entrada envenenada é descartada em favor da rede`);

// X: a navegação é NetworkFirst — o HTML fresco da rede vence o cache antigo,
// senão o usuário recebe a casca de um deploy cujos assets já não existem.
const networkFirstFn = vm.runInContext('networkFirst', sandbox);
const urlNav = H + '/login';
cacheStore.get(CORE).set(urlNav, new Response('ANTIGO', { status: 200, headers: { 'content-type': 'text/html' } }));
sandbox.fetch = async () => new Response('NOVO', { status: 200, headers: { 'content-type': 'text/html' } });
const corpoNav = await (await networkFirstFn(new Request(urlNav), CORE))?.text();
const vencuRede = corpoNav === 'NOVO';
if (!vencuRede) failures++;
results.push(`${vencuRede ? '✅' : '❌'} X navegação serve o HTML da rede, não o cacheado`);
sandbox.fetch = originalFetch;

// T: ativação limpa somente caches deste app; caches de outras aplicações
// no mesmo origin não podem ser apagados.
cacheStore.set('third-party-cache', new Map());
cacheStore.set('bombon-dp-v1', new Map());
let activation;
for (const h of listeners.activate ?? []) {
  h({ waitUntil: (p) => { activation = p; } });
}
await activation;
const scopedCleanupOk = cacheStore.has('third-party-cache') && !cacheStore.has('bombon-dp-v1');
if (!scopedCleanupOk) failures++;
results.push(`${scopedCleanupOk ? '✅' : '❌'} T limpeza de cache limitada ao prefixo do app`);

console.log(results.join('\n'));
console.log(failures === 0
  ? `\n✅ SW-TEST: ${scenarios.length + 5}/${scenarios.length + 5} cenários OK`
  : `\n❌ SW-TEST: ${failures} falha(s) em ${scenarios.length + 5} cenários`);
process.exit(failures === 0 ? 0 : 1);
