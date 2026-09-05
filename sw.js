const CACHE_NAME = 'notatiko-v13';
const ARQUIVOS_ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/audio.js',
  './js/icones.js',
  './js/taticas.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro para o código do app (mantém tudo atualizado), cache como reserva offline.
// Demais requisições: cache primeiro.
self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const ehCodigo = req.mode === 'navigate' || /\.(?:js|css|html|json)$/.test(url.pathname);

  if (ehCodigo) {
    // cache: 'reload' ignora o cache HTTP do navegador, garantindo código sempre atual
    evento.respondWith(
      fetch(new Request(req.url, { cache: 'reload', credentials: 'same-origin' }))
        .then((resposta) => {
          const clone = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return resposta;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  evento.respondWith(
    caches.match(req).then((emCache) => emCache || fetch(req).then((resposta) => {
      if (resposta && resposta.status === 200 && resposta.type === 'basic') {
        const clone = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      }
      return resposta;
    }))
  );
});
