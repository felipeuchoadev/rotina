/* DISCIPLINA — Service Worker
   Estratégia: autoupdate agressivo (skipWaiting + clients.claim).
   Sempre que você subir código novo no host, muda a versão do CACHE abaixo
   (ou a lógica de fetch pega o novo do servidor). O app se atualiza sozinho
   na próxima abertura. */
const CACHE = 'redzone-v70';

// ---- Web Push: recebe notificação mesmo com o app fechado ----
self.addEventListener('push', (e) => {
  let d = { title: 'REDZONE', body: 'Mexa-se, recruta.' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'disciplina',
    data: { url: d.url || '/rotina/' },
    vibrate: [80, 40, 80],
    renotify: true,
    requireInteraction: !!d.requireInteraction,
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/rotina/';
  const target = new URL(url, self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.includes('/rotina') && 'focus' in c) {
        // No Android/PWA, focar nem sempre dispara navegação. Envia também uma ordem direta ao app.
        return Promise.resolve(c.focus()).then(() => { c.postMessage({type:'OPEN_DEEP_LINK',url:target}); if ('navigate' in c) return c.navigate(target).catch(() => {}); });
      }
    }
    if (clients.openWindow) return clients.openWindow(target);
  }));
});
self.addEventListener('message',(e)=>{
  if(e.data?.type==='CLEAR_NOTIFICATION'&&e.data.tag){
    e.waitUntil(self.registration.getNotifications({tag:e.data.tag}).then(ns=>ns.forEach(n=>n.close())));
  }
});
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
  // API e tempo real: sempre rede, nunca cache (dados dinâmicos)
  const p = new URL(req.url).pathname;
  if (p.includes('/api/') || p.includes('/socket.io/')) return;
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
