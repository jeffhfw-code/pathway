const CACHE_NAME = 'pathway-v18';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/config.js',
  './js/state.js',
  './js/engine-denver.js',
  './js/engine-cos.js',
  './js/engine-epc.js',
  './js/gis.js',
  './js/glossary.js',
  './js/ui.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install — cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for API calls, cache-first for app shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // ArcGIS API calls: always go to network (never cache)
  if (url.hostname.includes('arcgis')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Colorado state API calls: always go to network
  if (url.hostname.includes('dwr.state.co.us') || url.hostname.includes('gis.colorado.gov')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: stale-while-revalidate — serve cache instantly, update in background
  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(response => {
          if (response.ok) cache.put(e.request, response.clone());
          return response;
        });
        return cached || fetched;
      })
    )
  );
});
