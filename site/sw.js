const CACHE_NAME = 'e-tasmik-shell-v7';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css?v=20261029-ocean-1',
  './ocean-wallpaper.svg',
  './students.js?v=20261017-session-classes-1',
  './teachers.js?v=20261019-teachers-1',
  './app.js?v=20261028-khatam-2',
  './logo-sekolah.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon-maskable.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('e-tasmik-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match(new URL('./index.html', self.registration.scope)));
      }
    })());
    return;
  }

  const cacheable = ['script', 'style', 'image', 'font'].includes(request.destination) || url.pathname.endsWith('/manifest.webmanifest');
  if (!cacheable) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
