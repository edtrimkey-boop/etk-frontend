// ED TRIMKEY OS - Progressive Web App Service Worker
const CACHE_NAME = 'edtrimkey-os-v2.9';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests that are not API calls
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip API calls and cross-origin calls
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase') || url.hostname.includes('trimkey.in')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
