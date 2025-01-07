import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import Navbar from '@/app/(main)/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'OnnRides - Book Your Next Ride',
  description: 'Book bikes and scooters for your next ride',
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.className}>
      <Navbar />
      <main className="min-h-screen pt-16">
        {children}
      </main>
    </div>
  );
} 