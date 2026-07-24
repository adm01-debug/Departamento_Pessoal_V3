const CACHE_NAME = 'bombon-dp-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// 1. Instalação e Cache de Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Ativação e Limpeza de Cache Antigo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Estratégia Fetch: NetworkFirst (para HTML) e CacheFirst (para Assets)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls, auth flows, or sensitive endpoints
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('pwnedpasswords.com') ||
    url.pathname.startsWith('/auth/') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Navegação: NetworkFirst
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Assets Estáticos: CacheFirst
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// 4. Recebimento de Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const notifUrl = (typeof data.url === 'string' && data.url.startsWith('/')) ? data.url : '/notificacoes';
    const options = {
      body: typeof data.body === 'string' ? data.body.slice(0, 300) : 'Você tem uma nova notificação do Departamento Pessoal.',
      icon: 'https://raw.githubusercontent.com/lovable-dev/lovable-preview-assets/main/dp-icon-192.png',
      badge: 'https://raw.githubusercontent.com/lovable-dev/lovable-preview-assets/main/dp-icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: notifUrl
      },
      actions: [
        { action: 'open', title: 'Ver Detalhes' },
        { action: 'close', title: 'Fechar' }
      ]
    };

    const title = (typeof data.title === 'string' && data.title.length > 0) ? data.title.slice(0, 100) : 'Bombon DP';
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error('Erro ao processar push notification:', e);
  }
});

// 5. Clique na Notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const rawUrl = event.notification.data.url || '/notificacoes';
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
