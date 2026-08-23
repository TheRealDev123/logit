/**
 * Log it - Service Worker (Network-First Strategy for Instant Updates)
 */

// Incremented version name forces browser to purge old cache
const CACHE_NAME = 'logit-cache-v3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/api.js',
  './js/auth.js',
  './js/reminders.js',
  './js/app.js',
  './js/pwa.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/chart.js'
];
// 1. INSTALL: Pre-cache assets and immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces new service worker to become active right away
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// 2. ACTIVATE: Instantly delete any old cached versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: NETWORK-FIRST (Always loads fresh code on normal refresh, falls back to cache only if offline)
self.addEventListener('fetch', (event) => {
  // Never cache Google Apps Script API calls
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Update the cache with the new fresh file in the background
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If there's no internet (offline), serve the cached version
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 4. PUSH NOTIFICATION CLICK HANDLER
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }/**
 * Log it - Clean Network-First Service Worker
 */

const CACHE_NAME = 'logit-v4-' + Date.now();

// Immediately take control
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Wipe out all old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW] Deleting stale cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Always fetch directly from server when online
self.addEventListener('fetch', (event) => {
  // Never intercept Google Sheets API
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network First: Always get fresh files from your server/disk
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        // Fallback only when completely offline
        return caches.match(event.request);
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
    })
  );
});
