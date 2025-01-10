import type { Metadata } from 'next';

import './globals.css';
import './responsive.css';





export const metadata: Metadata = {
  title: 'OnnRides - Your Trusted Vehicle Rental Platform',
  description: 'Find and rent vehicles for your needs. OnnRides offers a wide selection of cars, bikes, and more with easy booking and secure payments.',
  keywords: [
    'vehicle rental',
    'car rental',
    'bike rental',
    'transportation',
    'travel',
    'OnnRides',
    'rental platform',
    'vehicle booking'
  ],
  authors: [
    {
      name: 'OnnRides Team',
      url: 'https://onnrides.com'
    }
  ],
  creator: 'OnnRides',
  publisher: 'OnnRides',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  openGraph: {
    title: 'OnnRides - Your Trusted Vehicle Rental Platform',
    description: 'Find and rent vehicles for your needs. OnnRides offers a wide selection of cars, bikes, and more with easy booking and secure payments.',
    url: 'https://onnrides.com',
    siteName: 'OnnRides',
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnnRides - Your Trusted Vehicle Rental Platform',
    description: 'Find and rent vehicles for your needs. OnnRides offers a wide selection of cars, bikes, and more with easy booking and secure payments.',
    creator: '@onnrides',
    site: '@onnrides'
  }
};

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-center" reverseOrder={false} />
        </AuthProvider>
      </body>
    </html>
  );
}
