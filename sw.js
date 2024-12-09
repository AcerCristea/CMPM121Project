const CACHE_NAME = 'farming-game-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/game.js',
  '/manifest.json',
  '/scenarios/easy_start.json',
  '/scenarios/drought_challenge.json',
  '/scenarios/survival_challenge.json',
  '/locales/en.json',
  '/locales/es.json',
  '/locales/zh.json',
  '/locales/ar.json',
  '/icons/plant.png'
  // add any CSS or icon files you use
];

// Install event: cache everything
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>{
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(keyList=>{
      return Promise.all(keyList.map(key=>{
        if(key!==CACHE_NAME){
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Fetch event: Serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // For requests going to same domain
  event.respondWith(
    caches.match(event.request).then(response=>{
      return response || fetch(event.request);
    })
  );
});
