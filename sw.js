const CACHE = 'jamam-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/jamam-core.js',
  './js/jamam-progress.js',
  './js/jamam-achievements.js',
  './js/jamam-audio.js',
  './js/jamam-i18n.js',
  './js/jamam-integration.js',
  './js/jamam-share-card.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(err => console.warn('Precache error:', err)))
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  // استراتيجية: الشبكة أولاً للملفات الأساسية لضمان التحديث
  if (e.request.mode === 'navigate' || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // الكاش أولاً للبقية
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
