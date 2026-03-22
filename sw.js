// ════════════════════════════════════════════════════════════════
//  Smart Learning Adventure — Service Worker
//  Caches the app shell for offline use
//  Version bump CACHE_NAME to force update after new deployments
// ════════════════════════════════════════════════════════════════
const CACHE_NAME = 'sla-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.filter(u => !u.includes('.png') || true)))
      .then(() => self.skipWaiting())
      .catch(err => console.log('[SW] Cache failed:', err))
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch Supabase calls from network (never cache API data)
  if(url.hostname.includes('supabase.co') ||
     url.hostname.includes('phonepe.com')){
    e.respondWith(fetch(e.request));
    return;
  }

  // For the app HTML + assets: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses for same-origin resources
        if(response.ok && e.request.method === 'GET' &&
           url.origin === self.location.origin){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation
        if(e.request.mode === 'navigate'){
          return caches.match('/index.html');
        }
      });
    })
  );
});
