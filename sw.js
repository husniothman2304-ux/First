// Service worker: only shows push notifications and opens the right page
// when one is tapped. It doesn't cache anything, so the site always loads fresh.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Husni O.', {
    body: d.body || '',
    tag: d.tag || undefined,
    icon: 'assets/img/icon-192.png',
    badge: 'assets/img/icon-192.png',
    data: { url: d.url || '#/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || '#/';
  const url = new URL(hash, self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        w.postMessage({ open: hash });
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
