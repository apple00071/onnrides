// OnnRides Admin Service Worker
// This service worker enables PWA functionality without offline caching

const VERSION = 'v4';
const ADMIN_SCOPE = '/admin';
const ADMIN_DASHBOARD = '/admin/dashboard';

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
          if (cacheName.includes('admin')) {
            console.log('[Admin Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(() => {
      console.log('[Admin Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - enforce admin scope with strict redirection
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle navigation requests within our domain
  if (event.request.mode === 'navigate' && url.origin === self.location.origin) {
    // If this is a navigation request to the root path or outside admin scope
    if (url.pathname === '/' || 
        (!url.pathname.startsWith(ADMIN_SCOPE) && url.pathname !== ADMIN_SCOPE)) {
      console.log('[Admin Service Worker] Redirecting to admin dashboard from:', url.pathname);
      event.respondWith(Response.redirect(ADMIN_DASHBOARD));
      return;
    }
    
    // If this is the admin root path, redirect to dashboard
    if (url.pathname === ADMIN_SCOPE) {
      console.log('[Admin Service Worker] Redirecting from admin root to dashboard');
      event.respondWith(Response.redirect(ADMIN_DASHBOARD));
      return;
    }
  }
  
  // For all other requests, use the default handling
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
      url: ADMIN_DASHBOARD
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
  
  const urlToOpen = event.notification.data?.url || ADMIN_DASHBOARD;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes(ADMIN_SCOPE) && 'focus' in client) {
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