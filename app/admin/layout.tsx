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
    description: 'Admin dashboard for OnnRides vehicle rental service',
    manifest: '/admin/manifest.json',
    themeColor: '#f26e24',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'OnnRides Admin',
      startupImage: [
        {
          url: '/admin/icon-512x512.png',
          media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
        }
      ]
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    },
    icons: {
      icon: [
        { url: '/admin/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/admin/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
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
      <html lang="en">
        <head>
          <link rel="manifest" href="/admin/manifest.json" />
          <meta name="theme-color" content="#f26e24" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="OnnRides Admin" />
          <link rel="apple-touch-icon" href="/admin/icon-192x192.png" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="application-name" content="OnnRides Admin" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="msapplication-TileColor" content="#f26e24" />
          <meta name="msapplication-config" content="none" />
        </head>
        <body className="antialiased">
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
                      },
                      function(err) {
                        console.error('Admin Service Worker registration failed: ', err);
                      }
                    );
                  });
                }
              `,
            }}
          />
        </body>
      </html>
    );
  } catch (error) {
    logger.error('Error in admin layout:', error);
    redirect('/admin-login');
  }
} 