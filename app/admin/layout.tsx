'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (!response.ok) {
          if (pathname !== '/admin/login') {
            router.push(`/admin/login?from=${encodeURIComponent(pathname || '/admin')}`);
          }
          return;
        }

        if (data.user.role !== 'admin') {
          router.push('/');
          return;
        }

        setUser(data.user);
      } catch (error) {
        if (pathname !== '/admin/login') {
          router.push(`/admin/login?from=${encodeURIComponent(pathname || '/admin')}`);
        }
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  // If we're on the login page, just render the children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // For other admin pages, require authentication
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 px-8 py-6">
        {children}
      </main>
    </div>
  );
} 