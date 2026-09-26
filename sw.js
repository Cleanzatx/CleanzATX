const CACHE = 'cleanzatx-v10';
const ASSETS = [
  '/',
  '/styles.css',
  '/main.js',
  '/logo.png',
  '/hero-photo.jpg',
  '/offline.html',
  '/logos/allens-boots.png',
  '/logos/lucchese.png',
  '/logos/eddie-vs.svg',
  '/logos/capital-grille.png',
  '/logos/golds-gym.svg',
  '/logos/baldwin-beauty.png',
  '/logos/root-scalp-spa.svg',
  '/logos/ca-builders.png',
  '/logos/berkshire.svg',
  '/logos/cascade-pools.png',
  '/logos/compass.svg',
  '/logos/dish-society.png',
  '/logos/moreland.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/n8n/')) return; // never cache API calls
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || caches.match('/offline.html'));
      return cached || network;
    })
  );
});
