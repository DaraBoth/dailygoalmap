// Service Worker for DailyGoalMap PWA
const CACHE_NAME = 'dailygoalmap-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon/maskable_icon_x192.png',
  '/icon/maskable_icon_x512.png',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Cache installation failed:', err);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  return self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Do not cache POST/PUT/DELETE or chrome-extension requests
  if (
    event.request.method !== 'GET' ||
    event.request.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request.clone()).then((response) => {
        if (!response || response.status !== 200) return response;

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  const options = {
    icon: '/icon/maskable_icon_x192.png',
    badge: '/icon/maskable_icon_x96.png',
    vibrate: [200, 100, 200],
    tag: 'dailygoalmap-notification',
    requireInteraction: false,
  };

  let title = 'DailyGoalMap';
  let body = 'You have a new notification';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      options.data = data;
      if (data.icon) options.icon = data.icon;
      if (data.badge) options.badge = data.badge;
      if (data.tag) options.tag = data.tag;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      ...options
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      // Perform sync operations here
      fetch('/api/sync')
        .then((response) => response.json())
        .then((data) => {
          console.log('Sync completed:', data);
        })
        .catch((err) => {
          console.error('Sync failed:', err);
        })
    );
  }
});

console.log('Service Worker loaded');
