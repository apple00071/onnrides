'use client';

<<<<<<< HEAD
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';
=======
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminDashboardLayout from '@/components/admin/AdminDashboardLayout';
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a

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

<<<<<<< HEAD
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/admin/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-[#f26e24] rounded-full flex items-center justify-center text-white font-bold">O</div>
            <span className="ml-2 text-xl font-semibold">ONNRIDES</span>
          </Link>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <Link href="/admin/vehicles" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Vehicles
          </Link>
          <Link href="/admin/users" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Users
          </Link>
          <Link href="/admin/bookings" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Bookings
          </Link>
          <Link href="/admin/documents" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documents
          </Link>
          <Link href="/admin/reports" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Reports
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-700">
              <Bell className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">{session.user.email}</span>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {session.user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
=======
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>;
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
} 