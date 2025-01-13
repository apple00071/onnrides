'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminDashboardLayout from '@/components/admin/AdminDashboardLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const childrenString = children?.toString() || '';
  const isLoginPage = childrenString.includes('AdminLoginPage');

  useEffect(() => {
    if (status === 'loading') return;

    // For login page, redirect to dashboard if already authenticated
    if (isLoginPage && session?.user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    // For all other admin pages, require admin authentication
    if (!isLoginPage && (!session?.user || session.user.role !== 'admin')) {
      router.push('/admin/login');
      return;
    }
  }, [session, status, router, isLoginPage]);

  // If it's the login page, don't show the admin layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return <AdminDashboardLayout>{children}</AdminDashboardLayout>;
} 