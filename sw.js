// Service worker: la app funciona sin conexión en el gimnasio.
// Sube la versión al publicar cambios para que los móviles descarguen la nueva.
const CACHE = 'forja-v5';
const FILES = ['./', './index.html', './engine.js', './coach.js', './manifest.webmanifest', './icon.svg', './assets/hero.jpg', './assets/athlete.jpg', './assets/grip.jpg'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
// Red primero (siempre la última versión), caché si no hay conexión.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html'))));
});
