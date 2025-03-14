// OnnRides Admin Service Worker
// This service worker enables PWA functionality without offline caching

const VERSION = 'v1';

// Install event - minimal setup without caching
self.addEventListener('install', (event) => {
  console.log('[Admin Service Worker] Installing version:', VERSION);
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up any old data and take control
self.addEventListener('activate', (event) => {
  console.log('[Admin Service Worker] Activating version:', VERSION);
  
  // Clear any old caches if they exist
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[Admin Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Admin Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - network-only strategy (no caching)
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  // This ensures the app is always using the latest data from the server
  return;
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Admin Service Worker] Push received:', event);
  
  let notification = {
    title: 'OnnRides Admin',
    body: 'New notification',
    icon: '/admin/icon-192x192.png',
    badge: '/admin/icon-192x192.png',
    data: {
      url: '/admin/dashboard'
    }
  };
  
  if (event.data) {
    try {
      notification = { ...notification, ...JSON.parse(event.data.text()) };
    } catch (e) {
      console.error('[Admin Service Worker] Error parsing push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Admin Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/admin/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes('/admin') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
}); 