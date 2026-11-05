// Pages are always fetched from the network first, so visitors (and Google
// Analytics) get the latest deploy right away; the cache is only an offline
// fallback. Static files use cache-then-refresh. Other sites (Google tag,
// fonts, EmailJS, the tracker API) are never touched.
const CACHE = 'cleanzatx-v10';
const OFFLINE = '/__offline';
const ASSETS = ['/', '/styles.css', '/logo.png', '/hero-photo.jpg'];

// Store the offline page as a plain (non-redirected) response — Vercel
// redirects /offline.html to /offline, and redirected responses can't be
// used to answer a page navigation.
async function cacheOfflinePage(cache) {
  for (const url of ['/offline', '/offline.html']) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const body = await res.blob();
      await cache.put(OFFLINE, new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      return;
    } catch (e) {}
  }
}

self.addEventListener('install', e => {
  // One missing file must not stop the install (a deleted logo used to)
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all([...ASSETS.map(a => c.add(a).catch(() => {})), cacheOfflinePage(c)]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/n8n/')) return; // never cache API calls

  // Pages: network first, cached copy only when offline
  if (req.mode === 'navigate') {
    const key = url.origin + url.pathname; // ignore ?utm_… so tagged links share one entry
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && !res.redirected) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(key, clone));
        }
        return res;
      }).catch(() => caches.match(key).then(cached => cached || caches.match(OFFLINE)))
    );
    return;
  }

  // Static files: serve cached copy, refresh it in the background
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
