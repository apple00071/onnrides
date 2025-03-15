// OnnRides Admin Service Worker
// This service worker enables PWA functionality without offline caching

const VERSION = 'v6';
const ADMIN_SCOPE = '/admin/';
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

// Fetch event - handle admin scope only, don't interfere with main site
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle navigation requests within our domain and admin scope
  if (event.request.mode === 'navigate' && 
      url.origin === self.location.origin &&
      url.pathname.startsWith(ADMIN_SCOPE)) {
    
    // If this is the admin root path, redirect to dashboard
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      console.log('[Admin Service Worker] Redirecting from admin root to dashboard');
      event.respondWith(Response.redirect(ADMIN_DASHBOARD));
      return;
    }
    
    // For all other admin paths, allow through without modification
    console.log('[Admin Service Worker] Admin request:', url.pathname);
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