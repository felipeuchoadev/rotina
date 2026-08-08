/* DISCIPLINA — Service Worker
   Estratégia: autoupdate agressivo (skipWaiting + clients.claim).
   Sempre que você subir código novo no host, muda a versão do CACHE abaixo
   (ou a lógica de fetch pega o novo do servidor). O app se atualiza sozinho
   na próxima abertura. */
const CACHE = 'disciplina-v3-1';
const CORE = [
  './disciplina-v3.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Network-first pra HTML (garante update); cache-first pro resto. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./disciplina-v3.html')))
    );
  } else {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached))
    );
  }
});
