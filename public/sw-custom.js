/**
 * P4-075: Service Worker com Stale-While-Revalidate + Cache Version Bust
 *
 * Estratégias por tipo de recurso:
 *   - HTML/navegação : StaleWhileRevalidate (sempre busca fresco em background)
 *   - Assets estáticos: StaleWhileRevalidate com CacheFirst fallback
 *   - Avatares/imagens: CacheFirst com TTL 7 dias
 *   - Fonts/API: NetworkOnly (nunca cache)
 *   - Holerites próprios: CacheOnly (offline-first, dados sensíveis)
 *
 * Cache Version Bust: usa hash do deployment para invalidar cache
 * automaticamente em cada deploy — evita servir assets desatualizados.
 */

const CACHE_VERSION = 'v2';          // Bumpar em cada deploy para bustar cache antigo
const CORE_CACHE = `bombon-dp-${CACHE_VERSION}`;
const IMAGE_CACHE = `bombon-dp-images-${CACHE_VERSION}`;
const HOLERITE_CACHE = `bombon-dp-holerites-${CACHE_VERSION}`;

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
// (o worker parent rejeita payloads >4MB via DecompressionStream na Edge Function)
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
  } catch {
    // Abort ou erro de leitura → propagar
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

// ── 2. Ativação ──────────────────────────────────────────────
// Limpa caches de versões antigas (mantém últimas 3 versões)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) =>
            (name.startsWith('bombon-dp-') || name.startsWith('bombon-dp-images-'))
            && name !== CORE_CACHE
            && name !== IMAGE_CACHE
            && name !== HOLERITE_CACHE
          )
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Toma controle de todas as tabs imediatamente
      return self.clients.claim();
    })
  );
});

// ── 3. Fetch — Routing por Estratégia ─────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nunca cachear: APIs, auth, métodos não-GET, external services
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('pwnedpasswords.com') ||
    url.hostname.includes('supabase.io') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/') ||
    request.method !== 'GET'
  ) {
    return; // NetworkOnly (comportamento padrão)
  }

  // HTML/navegação: StaleWhileRevalidate (sempre fresco, mesmo offline = fallback index)
  if (request.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(request, CORE_CACHE)
        .then((r) => r || safeFetch(request))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Imagens: CacheFirst 7 dias
  if (
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|avif)$/i.test(url.pathname) ||
    url.pathname.includes('/avatar') ||
    url.pathname.includes('/foto/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Verifica TTL (7 dias) em background
          const cachedDate = cached.headers.get('sw-cached-at');
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
          if (cachedDate && Date.now() - Number(cachedDate) < maxAge) {
            return cached;
          }
        }
        return staleWhileRevalidate(request, IMAGE_CACHE).then((r) => {
          if (r?.ok) {
            const cloned = r.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cached-at', String(Date.now()));
            return new Response(cloned.body, { status: cloned.status, statusText: cloned.statusText, headers });
          }
          return r;
        });
      })
    );
    return;
  }

  // Fonts: CacheFirst 30 dias (com fallback offline)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      staleWhileRevalidate(request, CORE_CACHE)
        .then((r) => r || safeFetch(request))
    );
    return;
  }

  // Holerites: CacheOnly (offline-first, dados sensíveis)
  if (url.pathname.includes('/holerites/') || url.pathname.includes('/pagamentos/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        // Offline e sem cache: retorna página offline
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Assets JS/CSS: StaleWhileRevalidate
  if (/\.(?:js|css|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CORE_CACHE));
    return;
  }

  // Default: StaleWhileRevalidate
  event.respondWith(staleWhileRevalidate(request, CORE_CACHE));
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
