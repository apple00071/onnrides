import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'OnnRides Admin Dashboard',
  description: 'Admin dashboard for OnnRides vehicle rental service',
  manifest: '/admin/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OnnRides Admin',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f26e24' },
    { media: '(prefers-color-scheme: dark)', color: '#f26e24' }
  ],
};

export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 