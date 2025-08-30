import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Providers } from '@/app/providers';
import logger from '@/lib/logger';
import AdminDashboardClient from './AdminDashboardClient';
import { Toaster } from '@/components/ui/toaster';

export function generateMetadata(): Metadata {
  return {
    title: 'Admin Dashboard - OnnRides',
    description: 'Admin dashboard for managing OnnRides platform',
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
      redirect('/admin-login?callbackUrl=n /admin/dashboard');
    }

    if (session.user.role?.toLowerCase() !== 'admin') {
      logger.warn('Non-admin user attempted to access admin area:', session.user.email);
      redirect('/');
    }

    return (
      <Providers session={session}>
        <AdminDashboardClient>
          {children}
        </AdminDashboardClient>
        <Toaster />
      </Providers>
    );
  } catch (error) {
    logger.error('Error in admin layout:', error);
    redirect('/admin-login?callbackUrl=/admin/dashboard');
  }
} 