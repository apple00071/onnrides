import type { Metadata } from 'next';
import Navbar from '@/app/(main)/components/Navbar';

export const metadata: Metadata = {
  title: 'Authentication - OnnRides',
  description: 'Authentication page for OnnRides',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
} 