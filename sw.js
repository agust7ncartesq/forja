// Service worker: la app funciona sin conexión en el gimnasio.
// Sube la versión al publicar cambios para que los móviles descarguen la nueva.
const CACHE = 'forja-v7';
const FILES = ['./', './index.html', './engine.js', './coach.js', './manifest.webmanifest', './icon.svg', './assets/hero.jpg', './assets/athlete.jpg', './assets/grip.jpg', './assets/fonts/manrope-latin.woff2', './vendor/chart.umd.min.js', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-512.png', './assets/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
// Red primero (siempre la última versión), caché si no hay conexión. Solo peticiones propias.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && !url.search) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) =>
    m || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
