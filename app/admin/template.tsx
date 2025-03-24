import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OnnRides Admin Dashboard',
  description: 'Admin dashboard for OnnRides vehicle rental service',
  manifest: '/admin/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f26e24' },
    { media: '(prefers-color-scheme: dark)', color: '#f26e24' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OnnRides Admin',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    apple: [
      { url: '/admin/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/admin/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 