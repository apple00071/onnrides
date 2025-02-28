import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import RazorpayProvider from './providers/RazorpayProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnnRides - Vehicle Rental Service',
  description: 'Your trusted partner for vehicle rentals.',
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-background`}>
      <RazorpayProvider>
        <ClientLayout>{children}</ClientLayout>
      </RazorpayProvider>
    </div>
  );
} 