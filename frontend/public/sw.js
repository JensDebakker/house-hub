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

// Opt-in push notifications (see src/lib/pushNotifications.ts for subscribing). The
// backend's payload shape is frozen as { title, body, url? } - see PushNotificationService.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'House Hub', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // Focusing an existing tab doesn't navigate it - this is a client-side-routed
          // SPA, so the click has to drive it to the right route itself.
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Some browsers refuse to navigate a client that isn't fully active yet -
              // focusing it below still gets the user to the app, just not the exact route.
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
