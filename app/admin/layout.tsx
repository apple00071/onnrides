import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '../providers';
import AdminDashboardClient from '@/app/admin/AdminDashboardClient';
import logger from '@/lib/logger';
import { Metadata } from 'next';

// Provide metadata for admin pages
export function generateMetadata(): Metadata {
  return {
    title: 'OnnRides Admin Dashboard',
    description: 'Admin dashboard for OnnRides bike rental service',
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true
      }
    },
    manifest: '/admin/manifest.json',
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#f26e24' },
      { media: '(prefers-color-scheme: dark)', color: '#f26e24' }
    ],
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': 'OnnRides Admin',
      'application-name': 'OnnRides Admin',
      'format-detection': 'telephone=no',
      'msapplication-TileColor': '#f26e24',
      'msapplication-TileImage': '/admin/icon-192x192.png',
      'msapplication-config': 'none'
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'OnnRides Admin',
      startupImage: [
        {
          url: '/admin/startup-640x1136.png',
          media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
        },
        {
          url: '/admin/icon-512x512.png',
          media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
        },
        {
          url: '/admin/icon-512x512.png',
          media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          url: '/admin/icon-512x512.png',
          media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
        }
      ]
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
    },
    icons: {
      icon: [
        { url: '/admin/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/admin/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/admin/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
        { url: '/admin/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
        { url: '/admin/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
        { url: '/admin/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: [
        { url: '/admin/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      ],
    },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn('No session found, redirecting to admin login');
      redirect('/admin-login');
    }

    if (session.user.role.toLowerCase() !== 'admin') {
      logger.warn('Non-admin user attempted to access admin area:', session.user.email);
      redirect('/');
    }

    return (
      <>
        <Providers session={session}>
          <AdminDashboardClient>
            {children}
          </AdminDashboardClient>
          <SpeedInsights />
        </Providers>
        {/* Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/admin/sw.js', { 
                    scope: '/admin/'
                  }).then(
                    function(registration) {
                      console.log('Admin Service Worker registration successful with scope:', registration.scope);
                      
                      // Check if we're on the admin root page
                      if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
                        // Redirect to dashboard if at admin root
                        window.location.href = '/admin/dashboard';
                      }
                    },
                    function(err) {
                      console.error('Admin Service Worker registration failed: ', err);
                    }
                  );
                  
                  // Unregister any existing service workers outside our scope
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      // Skip our admin service worker
                      if (registration.scope.includes('/admin/')) continue;
                      
                      // Unregister any other service workers
                      registration.unregister().then(function() {
                        console.log('ServiceWorker unregistered to avoid conflicts');
                      });
                    }
                  });
                });
              }
            `,
          }}
        />
      </>
    );
  } catch (error) {
    logger.error('Error in admin layout:', error);
    redirect('/admin-login');
  }
} 