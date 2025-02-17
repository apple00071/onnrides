'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNav from './UserNav';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show navbar on auth pages
  const isAuthPage = pathname?.startsWith('/auth/');
  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-[#f26e24]">ONNRIDES</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-[#f26e24]">ONNRIDES</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/about"
              className="text-sm font-medium text-gray-500 hover:text-[#f26e24]"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-gray-500 hover:text-[#f26e24]"
            >
              Contact Us
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-gray-500 hover:text-[#f26e24]"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-[#f26e24] text-white hover:bg-[#e05d13] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 