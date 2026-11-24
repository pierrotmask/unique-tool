/* LiftCanvas サービスワーカー
   ・このアプリ（lift-canvas*）だけを担当し、同じリポジトリの他ツールには影響しない
   ・HTMLは「ネット優先」：オンラインなら毎回最新版を取得し、オフライン時だけ保存版を表示
   ・アイコン等は保存版を即表示しつつ裏で更新 */
const VERSION = '2026.11.24.6';
const CACHE = 'lift-canvas-' + VERSION;
const PAGE = './lift-canvas.html';
const ASSETS = [PAGE, './lift-canvas.webmanifest', './lift-canvas-icon-192.png', './lift-canvas-icon-512.png', './lift-canvas-apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('lift-canvas-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const isPage = url => /\/lift-canvas\.html$/.test(url.pathname);
const isOurs = url => url.origin === self.location.origin && /\/lift-canvas[^/]*$/.test(url.pathname);

function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const fallback = () => caches.open(CACHE).then(c => c.match(PAGE)).then(r => { if (!done && r) { done = true; resolve(r); } });
    const timer = setTimeout(fallback, 4000);           // 電波が弱いときは4秒で保存版を表示
    fetch(req, { cache: 'no-store' }).then(res => {
      clearTimeout(timer);
      if (res && res.ok && !new URL(req.url).searchParams.has('check')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(PAGE, copy)); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(timer); fallback().then(() => { if (!done) { done = true; resolve(Response.error()); } }); });
  });
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (!isOurs(url)) return;
  if (req.mode === 'navigate' || isPage(url)) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
