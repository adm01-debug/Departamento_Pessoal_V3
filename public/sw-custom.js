/**
 * P4-075: Service Worker com Stale-While-Revalidate + Cache Version Bust
 *
 * Estratégias por tipo de recurso (E-037 — allowlist estática, fail-closed):
 *   - HTML/navegação : StaleWhileRevalidate (sempre busca fresco em background)
 *   - Assets estáticos same-origin (js/css/fontes): StaleWhileRevalidate
 *   - Imagens estáticas same-origin: CacheFirst
 *   - Google Fonts (asset público): SWR em cache dedicado
 *   - TODO O RESTO: NetworkOnly — nunca cacheado
 *
 * E-037: NUNCA entram em cache: chamadas com credencial (Authorization/apikey),
 * Supabase, Edge Functions, webhooks, rotas de auth/MFA e APIs de dados
 * pessoais (holerites, pagamentos, dados bancários, biometria, documentos).
 *
 * Cache Version Bust: usa hash do deployment para invalidar cache
 * automaticamente em cada deploy — evita servir assets desatualizados.
 */

const CACHE_VERSION = 'v3';          // Bumpar em cada deploy para bustar cache antigo (v3: E-037)
const CORE_CACHE = `bombon-dp-${CACHE_VERSION}`;
const IMAGE_CACHE = `bombon-dp-images-${CACHE_VERSION}`;

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// ── Helpers ──────────────────────────────────────────────────

async function openCache(name) {
  try {
    return await caches.open(name);
  } catch {
    return null;
  }
}

// Stale-While-Revalidate: responde do cache IMEDIATAMENTE,
// busca fresco em background e atualiza cache.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await openCache(cacheName);
  const cachedResponse = await cache?.match(request);

  const fetchPromise = safeFetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache?.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // Responde do cache se disponível; senão espera network.
  // Se ambos falharem retorna null → quem chamou deve handlear.
  return cachedResponse || fetchPromise;
}

// Gzipbomb-safe fetch wrapper: lê apenas os primeiros 4MB antes de entregar ao SW
async function safeFetch(request, maxBytes = 4 * 1024 * 1024) {
  const response = await fetch(request);
  if (!response.ok) return response;
  // Streaming: aborta após maxBytes lidos — protege contra oversized payloads
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        reader.cancel();
        return new Response('Payload too large', { status: 413 });
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const body = new Blob(chunks);
  return new Response(body, { headers: response.headers, status: response.status });
}

// ── 1. Instalação ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting: ativa novo SW imediatamente (sem esperar todas as tabs fecharem)
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await openCache(CORE_CACHE);
      if (!cache) return;
      await cache.addAll(ASSETS_TO_PRECACHE).catch(() => {
        // Não falhar install se um asset não carregar (rede pode estar fora)
      });
    })()
  );
});

// ── 2. Ativação: limpa caches antigos ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        // Remove caches de versões anteriores do app
        const CACHE_KEEP = [CORE_CACHE, IMAGE_CACHE];
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith('bombon-dp-') && !CACHE_KEEP.includes(name))
            .map((name) => caches.delete(name))
        );
      } catch {
        // caches indisponível (ex.: modo privado restrito)
      }
      // Claim clients: assume controle das tabs abertas imediatamente
      await self.clients.claim();
    })()
  );
});

// ── 3. Fetch: allowlist estática (E-037, fail-closed) ────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase requests com credencial válida: NUNCA cachear (dados dinâmicos)
  if (url.hostname.includes('supabase.co')) {
    const authHeader = request.headers.get('authorization');
    const hasValidAuth = authHeader && authHeader !== 'null' && authHeader !== 'undefined';
    if (hasValidAuth) {
      return; // network-only
    }
  }

  // Nunca cachear (fail-closed):
  //   - não-GET (mutações)
  //   - chamadas com credencial (Authorization / apikey)
  //   - Supabase (API de dados, auth, realtime)
  //   - Edge Functions e webhooks assinados
  //   - rotas de autenticação/MFA
  //   - APIs de dados pessoais (holerites, pagamentos, dados bancários,
  //     biometria, documentos) — PII nunca fica no Cache Storage
  if (url.protocol === 'chrome-extension:') return;
  if (request.method !== 'GET') return;

  const authH = request.headers.get('authorization');
  const hasCred = !!(authH && authH !== 'null' && authH !== 'undefined') || request.headers.has('apikey');
  if (hasCred) return;

  const NEVER_CACHE_PATH = /^\/(auth|login|mfa|functions|webhooks?)\//i;
  const PII_PATH = /\/(holerites?|pagamentos?|dados-bancarios|biometria|documentos)(\/|$)/i;
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/functions/v1/') ||
    NEVER_CACHE_PATH.test(url.pathname) ||
    PII_PATH.test(url.pathname)
  ) {
    return; // network-only: resposta nunca passa pelo Cache Storage
  }

  // Navegação (HTML público): StaleWhileRevalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(request, CORE_CACHE)
        .then((r) => r || caches.match('/index.html'))
    );
    return;
  }

  // Imagens estáticas same-origin: CacheFirst
  if (url.origin === self.location.origin &&
      /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return safeFetch(request).then((r) => {
          if (r.ok) {
            const clone = r.clone();
            openCache(IMAGE_CACHE).then((c) => c?.put(request, clone));
          }
          return r;
        });
      })
    );
    return;
  }

  // Google Fonts (asset estático público, cross-origin): cache dedicado
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      staleWhileRevalidate(request, IMAGE_CACHE)
        .then((r) => r || safeFetch(request))
    );
    return;
  }

  // Assets JS/CSS/fontes same-origin: StaleWhileRevalidate
  if (url.origin === self.location.origin &&
      /\.(?:js|css|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CORE_CACHE));
    return;
  }

  // Default (E-037): network-only. Qualquer rota não listada acima NÃO é
  // cacheada — o SW apenas observa a resposta passar.
  return;
});

// ── 4. Push Notifications ─────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const notifUrl =
      typeof data.url === 'string' && data.url.startsWith('/')
        ? data.url
        : '/notificacoes';
    const options = {
      body:
        typeof data.body === 'string'
          ? data.body.slice(0, 300)
          : 'Você tem uma nova notificação do Departamento Pessoal.',
      icon: 'https://raw.githubusercontent.com/lovable-dev/lovable-preview-assets/main/dp-icon-192.png',
      badge: 'https://raw.githubusercontent.com/lovable-dev/lovable-preview-assets/main/dp-icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: notifUrl },
      actions: [
        { action: 'open', title: 'Ver Detalhes' },
        { action: 'close', title: 'Fechar' },
      ],
    };

    const title =
      typeof data.title === 'string' && data.title.length > 0
        ? data.title.slice(0, 100)
        : 'Bombon DP';

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[sw] Erro ao processar push:', e);
  }
});

// ── 5. Notification Click ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const rawUrl = event.notification.data?.url || '/notificacoes';
  const urlToOpen = rawUrl.startsWith('/') ? rawUrl : '/notificacoes';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.endsWith(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ── 6. Message: invalidar cache sob demanda ────────────────────
// Frontend pode enviar 'SKIP_WAITING' para forçar ativação imediata
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Frontend pode forçar invalidação total do cache de imagens
  if (event.data === 'CLEAR_IMAGE_CACHE') {
    event.waitUntil(caches.delete(IMAGE_CACHE));
  }
});
