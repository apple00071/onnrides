'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force cache clearing on mobile browsers
  useEffect(() => {
    // Check if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    if (isMobile) {
      // Try to clear any browser caches that might prevent seeing maintenance mode
      if ('caches' in window) {
        caches.keys().then((names) => {
          // Delete all caches
          for (let name of names) {
            caches.delete(name);
          }
        });
      }
      
      // Set timestamp in sessionStorage to force re-render
      sessionStorage.setItem('maintenance_timestamp', Date.now().toString());
      
      // Add random param to current URL to bust cache without redirect
      if (!window.location.search.includes('_t=')) {
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  return (
    <html lang="en">
      <head>
        {/* Meta tags to prevent caching */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Script to detect and handle mobile cache issues */}
        <Script id="maintenance-cache-buster" strategy="beforeInteractive">
          {`
            (function() {
              // Mark this page as dynamically generated each time
              document.cookie = "maintenance_ts=" + Date.now() + ";path=/;max-age=60";
              
              // Force reload if page might be cached on mobile
              var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              var lastVisit = sessionStorage.getItem('maintenance_last_visit');
              var now = Date.now();
              
              // Store the current visit time
              sessionStorage.setItem('maintenance_last_visit', now);
              
              // If mobile and cached version suspected, force reload
              if (isMobile && lastVisit && (now - parseInt(lastVisit)) > 120000) {
                window.location.reload(true);
              }
            })();
          `}
        </Script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
} 