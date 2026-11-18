// Offline-first: the app works with no internet after the first install.
const CACHE = 'minu-paev-v4';
const FILES = ['./', './index.html', './styles.css', './app.js', './db.js', './logic.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './audio/index.json'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(FILES);
    const voices = await (await c.match('./audio/index.json')).json();
    await c.addAll(voices.map((h) => `./audio/${h}.m4a`));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
