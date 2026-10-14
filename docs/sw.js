/* Bubble Match-3 service worker — offline cache */
const CACHE = 'bm3-v2.1.0';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/meta.css',
  './js/levels.js',
  './js/storage.js',
  './js/audio.js',
  './js/ads.js',
  './js/game.js',
  './js/ui.js',
  './js/sr.js',
  './js/a11y.js',
  './js/shopcore.js',
  './js/ads-config.js',
  './js/adgate.js',
  './js/daily.js',
  './js/achievements.js',
  './js/coach.js',
  './js/review.js',
  './js/ach-defs.js',
  './js/metakit.js',
  './js/meta-config.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
