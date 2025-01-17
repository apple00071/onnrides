'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaHome, FaCar, FaUsers, FaBookmark, FaSignOutAlt } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import { IconType } from 'react-icons';

interface MenuItem {
  href: string;
  label: string;
  icon: IconType;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
      router.push(`/admin/login?from=${encodeURIComponent(pathname || '/admin')}`);
    }
  }, [status, session, router, pathname]);

  // If we're on the login page, just render the children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Show loading state while checking session
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  // Don't render admin UI if not admin
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  const menuItems: MenuItem[] = [
    { href: '/admin', label: 'Dashboard', icon: FaHome },
    { href: '/admin/vehicles', label: 'Vehicles', icon: FaCar },
    { href: '/admin/users', label: 'Users', icon: FaUsers },
    { href: '/admin/bookings', label: 'Bookings', icon: FaBookmark },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b">
            <span className="text-xl font-bold text-[#f26e24]">Admin Panel</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-[#f26e24] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {Icon && <Icon className="h-5 w-5" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign Out Button */}
          <div className="border-t p-4">
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <FaSignOutAlt className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="min-h-screen bg-gray-100 p-8">{children}</main>
      </div>
    </div>
  );
} 