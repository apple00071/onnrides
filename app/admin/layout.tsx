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

    // Check if user is not logged in
    if (!session?.user) {
      const currentPath = '/admin/dashboard';
      redirect(`/admin-login?callbackUrl=${encodeURIComponent(currentPath)}`);
    }

    // Check if user is not an admin (case insensitive check)
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== 'admin') {
      logger.warn('Non-admin user attempted to access admin area:', {
        email: session.user.email,
        role: session.user.role
      });
      redirect('/');
    }

    // Check if user is blocked
    if (session.user.is_blocked) {
      logger.warn('Blocked admin user attempted to access admin area:', session.user.email);
      redirect('/admin-login?error=Account%20is%20blocked');
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
    redirect('/admin-login?error=An%20error%20occurred');
  }
} 