const CACHE_NAME = 'Bolo237-v1';

// Pages et assets essentiels à mettre en cache
const PRECACHE_URLS = [
  '/',
  '/connexion',
  '/emplois',
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

// Fetch : stratégie Network-First avec fallback cache
// (idéal pour les connexions instables au Cameroun)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorer les requêtes non-GET et les API calls
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la réponse est valide, la mettre en cache
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Pas de réseau → servir depuis le cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;

          // Si c'est une navigation, montrer la page d'accueil en cache
          if (request.mode === 'navigate') {
            return caches.match('/');
          }

          // Rien en cache → réponse offline
          return new Response(
            '<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px"><h1>Bolo237</h1><p>Pas de connexion internet.<br>Vérifiez votre réseau et réessayez.</p><button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#DA7756;color:white;border:none;border-radius:12px;font-weight:bold;font-size:16px;cursor:pointer">Réessayer</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
  );
});
