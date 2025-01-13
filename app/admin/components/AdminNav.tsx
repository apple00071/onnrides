'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.startsWith(path) 
      ? 'border-[#f26e24] text-gray-900'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';
  };

  return (
    <nav className="bg-white shadow-lg fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin/dashboard" className="text-2xl font-bold text-[#f26e24] font-goodtimes">
                ONNRIDES ADMIN
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/admin/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/dashboard')}`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/bookings"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/bookings')}`}
              >
                Bookings
              </Link>
              <Link
                href="/admin/vehicles"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/vehicles')}`}
              >
                Vehicles
              </Link>
              <Link
                href="/admin/users"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/users')}`}
              >
                Users
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Back to Site
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/admin-login' })}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 