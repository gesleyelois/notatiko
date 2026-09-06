const CACHE_NAME = 'notatiko-v24';
const ARQUIVOS_ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/audio.js',
  './js/falas.js',
  './js/icones.js',
  './js/taticas.js',
  './audio/trilha.mp3',
  './audio/efeitos/toque.mp3',
  './audio/efeitos/abrir.mp3',
  './audio/efeitos/fechar.mp3',
  './audio/efeitos/pouso.mp3',
  './audio/efeitos/tirar.mp3',
  './audio/efeitos/excluir.mp3',
  './audio/efeitos/guardar.mp3',
  './audio/efeitos/tatica.mp3',
  './audio/efeitos/revelar.mp3',
  './audio/efeitos/impacto.mp3',
  './audio/efeitos/brilho.mp3',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

/* Baixa em lotes, com uma segunda tentativa para o que falhar.

   Pedir as 42 gravações de uma vez derrubava a maioria: numa medição local
   só 3 chegaram ao cache, e o catch vazio escondia as outras 39. Numa rede
   de celular instável daria no mesmo — o app ficaria com um cache offline
   incompleto sem ninguém perceber. Lotes pequenos e uma repescagem tornam
   a instalação bem mais provável de terminar inteira.                     */
async function guardarEmLotes(cache, arquivos, tamanho = 6) {
  const falharam = [];

  for (let i = 0; i < arquivos.length; i += tamanho) {
    const lote = arquivos.slice(i, i + tamanho);
    await Promise.all(lote.map((a) => cache.add(a).catch(() => falharam.push(a))));
  }

  // repescagem, uma por vez: o que caiu por concorrência costuma passar aqui
  for (const a of falharam) {
    await cache.add(a).catch(() => { /* sem essa fala; a voz do aparelho cobre */ });
  }
}

// As gravações da narração são opcionais: se ainda não foram geradas, o app
// cai na voz do próprio aparelho. Por isso elas entram num passo separado,
// que pode falhar sem derrubar a instalação do que é essencial.
async function guardarNarracao(cache) {
  try {
    const resposta = await fetch('./audio/falas/indice.json', { cache: 'reload' });
    if (!resposta.ok) return;
    // o clone tem que sair ANTES de ler o corpo: depois de .json() o corpo
    // está consumido e clonar lança — erro que o catch abaixo engoliria
    const copia = resposta.clone();
    const { frases } = await resposta.json();
    const arquivos = [...new Set(Object.values(frases || {}))]
      .map((nome) => `./audio/falas/${nome}.mp3`);
    await cache.put('./audio/falas/indice.json', copia);
    await guardarEmLotes(cache, arquivos);
  } catch {
    /* sem gravações: segue com a voz do aparelho */
  }
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(ARQUIVOS_ESSENCIAIS);
        await guardarNarracao(cache);
      })
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
