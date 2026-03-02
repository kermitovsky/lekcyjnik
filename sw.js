const CACHE_NAME = 'planer-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Instalowanie i wymuszanie nowej wersji
self.addEventListener('install', event => {
  self.skipWaiting(); // Zmusza przeglądarkę do natychmiastowego użycia nowej wersji
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Sprzątanie starych plików z pamięci
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Strategia: Najpierw Internet, potem Pamięć (Network First)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Zapisujemy nową wersję do pamięci w locie
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Jeśli nie ma internetu, bierzemy z pamięci
        return caches.match(event.request);
      })
  );
});
