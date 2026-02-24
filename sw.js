/* ============================================================
   SLU Services Directory — Service Worker v1.0.0
   Cache-first for static assets. Network-first for data.
   ============================================================ */

const CACHE_VERSION = 'slu-services-v1.0.0';
const DATA_CACHE = 'slu-services-data-v1.0.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/browse.html',
  '/search.html',
  '/listing.html',
  '/about.html',
  '/offline.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/manifest.json',
];

const DATA_URLS = [
  '/data/services.json',
  '/data/categories.json',
];

/* --- Install: Precache core assets ------------------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => {
        return caches.open(DATA_CACHE)
          .then(cache => cache.addAll(DATA_URLS));
      })
      .then(() => self.skipWaiting())
  );
});

/* --- Activate: Remove old caches --------------------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== DATA_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* --- Fetch Strategy ---------------------------------------- */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (except our own)
  if (request.method !== 'GET') return;
  if (!url.origin.includes('services.stlucia.studio') && !url.hostname.includes('localhost')) return;

  // Data files: Network-first, cache fallback
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML pages: Network-first, cache fallback, offline page last resort
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/offline.html'));
    })
  );
});
