// Minimal app-shell service worker for House Hub's PWA install support.
//
// Scope is deliberately narrow:
//   - Never touches `/api/*` requests (same-origin or not) - this app is data-driven,
//     and a stale cached API response would show the wrong household's data.
//   - Only caches same-origin GET requests.
//   - HTML navigations are network-first so a new deploy is visible on the very next
//     load; only the last-seen page is served from cache when the network is down.
//   - Everything else (hashed JS/CSS bundles, icons, fonts) uses stale-while-revalidate:
//     instant from cache on repeat visits, silently refreshed in the background.
//
// Bump CACHE_VERSION when this file's caching strategy changes; activate() wipes any
// cache that doesn't match the current version so old entries don't linger forever.
// Routine app deploys don't need a bump - hashed asset filenames change on their own,
// so stale entries are simply never requested again and fall out of use.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `house-hub-shell-${CACHE_VERSION}`;

self.addEventListener('install', () => {
  // Take over as soon as possible instead of waiting for all tabs of the old worker to
  // close - combined with clients.claim() below, this is the standard "new service
  // worker takes over on next load" pattern rather than one that pins users to a stale
  // bundle indefinitely.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
