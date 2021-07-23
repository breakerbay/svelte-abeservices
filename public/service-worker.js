'use strict';

// Update cache names any time any of the cached files change.
const CACHE_STATIC_NAME = 'static-v3';
const CACHE_DYNAMIC_NAME = 'dynamic-v3';

// Add list of files to cache here.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/abelogo.png',
  '/offline.html',
  '/global.css',
  '/build/bundle.css',
  '/build/bundle.js',
  '/static/images/studio/20190531/20190531_144609.jpg',
  '/static/images/studio/20190531/20190531_144629.jpg',
  '/static/images/studio/20190531/20190531_144706.jpg',
  '/images/icons/abe-maskable_icon_x128.png',
  '/images/icons/abe-maskable_icon_x144.png',
  '/images/icons/abe-maskable_icon_x152.png',
  '/images/icons/abe-maskable_icon_x192.png',
  '/images/icons/abe-maskable_icon_x256.png',
  '/images/icons/abe-maskable_icon_x512.png',
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');

  evt.waitUntil(
      caches.open(CACHE_STATIC_NAME).then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  // Remove previous cached data from disk.
  evt.waitUntil(
      caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME ) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
  );

  self.clients.claim();
});

/*
self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  // Add fetch event handler here.
  evt.respondWith(
      fetch(evt.request)
          .catch(() => {
            return caches.open(CACHE_STATIC_NAME)
                .then((cache) => {
                  return cache.match(evt.request);
                });
          })
  );
});
*/

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(function(res) {
              return caches.open(CACHE_DYNAMIC_NAME)
                .then(function(cache) {
                  cache.put(event.request.url, res.clone());
                  return res;
                })
            })
            .catch(function(err) {
                console.error(err);
            });
        }
      })
  );
});

