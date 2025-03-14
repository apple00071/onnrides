import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '../providers';
import AdminDashboardClient from '@/app/admin/AdminDashboardClient';
import logger from '@/lib/logger';

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
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/admin/sw.js').then(
                      function(registration) {
                        console.log('Admin Service Worker registration successful');
                      },
                      function(err) {
                        console.log('Admin Service Worker registration failed: ', err);
                      }
                    );
                  });
                }
              `,
            }}
          />
        </head>
        <body className="antialiased">
          <Providers session={session}>
            <AdminDashboardClient>
              {children}
            </AdminDashboardClient>
            <SpeedInsights />
          </Providers>
        </body>
      </html>
    );
  } catch (error) {
    logger.error('Error in admin layout:', error);
    redirect('/admin-login');
  }
} 