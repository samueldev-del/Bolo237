const CACHE_NAME = 'Bolo237-v2';
const OFFLINE_URL = '/offline.html';

// Assets legers et page hors ligne uniquement.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/logo.svg',
  '/logo-white.svg',
  '/icon.svg',
];

// Installation : pre-cache les pages essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently fail for individual URLs that can't be cached
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

function isStaticAssetRequest(request) {
  const destination = request.destination;
  return destination === 'script' || destination === 'style' || destination === 'image' || destination === 'font';
}

function shouldHandleRequest(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;

  return true;
}

// Fetch : navigations en reseau prioritaire sans cache HTML stale.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!shouldHandleRequest(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      })
    );
    return;
  }

  if (!isStaticAssetRequest(request)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkRequest = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => cached || Response.error());

      return cached || networkRequest;
    })
  );
});
