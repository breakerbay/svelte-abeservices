'use strict';

// Update cache names any time any of the cached files change.
const CACHE_STATIC_NAME = 'static-v17';
const CACHE_DYNAMIC_NAME = 'dynamic-v17';

// Add list of files to cache here.
let STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/abelogo.png',
  '/offline.html',
  '/global.css',
  // '/build/bundle.css',
  // '/build/bundle.js',
  '/static/images/studio/20190531/20190531_144609.jpg',
  '/static/images/studio/20190531/20190531_144629.jpg',
  '/static/images/studio/20190531/20190531_144706.jpg',
  '/images/icons/abe-maskable_icon_x128.png',
  '/images/icons/abe-maskable_icon_x144.png',
  '/images/icons/abe-maskable_icon_x152.png',
  '/images/icons/abe-maskable_icon_x192.png',
  '/images/icons/abe-maskable_icon_x256.png',
  '/images/icons/abe-maskable_icon_x512.png',
  '/images/how-it-works.jpg',
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');

  evt.waitUntil(
      caches.open(CACHE_STATIC_NAME).then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(STATIC_FILES);
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
              return caches.open(CACHE_STATIC_NAME)
                .then(function(cache) {
                  return cache.match('/offline.html');
                });
            });
        }
      })
  );
});

/*
Draft Background syncing
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background syncing', event);
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing new Posts');
    event.waitUntil(
      readAllData('sync-posts')
        .then(function(data) {
          for (var dt of data) {
            fetch('https://us-central1-pwagram-99adf.cloudfunctions.net/storePostData', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                id: dt.id,
                title: dt.title,
                location: dt.location,
                image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-99adf.appspot.com/o/sf-boat.jpg?alt=media&token=19f4770c-fc8c-4882-92f1-62000ff06f16'
              })
            })
              .then(function(res) {
                console.log('Sent data', res);
                if (res.ok) {
                  res.json()
                    .then(function(resData) {
                      deleteItemFromData('sync-posts', resData.id);
                    });
                }
              })
              .catch(function(err) {
                console.log('Error while sending data', err);
              });
          }

        })
    );
  }
});*/
