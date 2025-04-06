'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function AdminNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => {
    return pathname?.startsWith(path) 
      ? 'border-[#f26e24] text-gray-900'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';
  };

  const mobileIsActive = (path: string) => {
    return pathname?.startsWith(path) 
      ? 'bg-orange-50 text-[#f26e24]'
      : 'text-gray-700 hover:bg-gray-100';
  };

  return (
    <nav className="bg-white shadow-lg fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin/dashboard" className="text-xl sm:text-2xl font-bold text-[#f26e24] font-goodtimes truncate">
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
          <div className="flex items-center">
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
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
            <div className="sm:hidden flex items-center ml-4">
              <button 
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#f26e24] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#f26e24]"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">{isMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
                {isMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/admin/dashboard"
            className={`block pl-3 pr-4 py-2 text-base font-medium ${mobileIsActive('/admin/dashboard')}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/bookings"
            className={`block pl-3 pr-4 py-2 text-base font-medium ${mobileIsActive('/admin/bookings')}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Bookings
          </Link>
          <Link
            href="/admin/vehicles"
            className={`block pl-3 pr-4 py-2 text-base font-medium ${mobileIsActive('/admin/vehicles')}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Vehicles
          </Link>
          <Link
            href="/admin/users"
            className={`block pl-3 pr-4 py-2 text-base font-medium ${mobileIsActive('/admin/users')}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Users
          </Link>
          <div className="border-t border-gray-200 pt-2">
            <Link
              href="/"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              Back to Site
            </Link>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                signOut({ callbackUrl: '/admin-login' });
              }}
              className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 