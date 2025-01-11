'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import logger from '@/lib/logger';

export default function AdminSessionCheck() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if session exists
        const sessionResponse = await fetch('/api/admin/me');
        if (!sessionResponse.ok) {
          throw new Error('No valid session');
        }
        
        const session = await sessionResponse.json();
        if (!session) {
          // No session, redirect to login
          Cookies.remove('admin_session', { path: '/admin' });
          router.push('/admin/login');
          return;
        }

        // Verify admin role
        const profileResponse = await fetch('/api/admin/profile');
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch admin profile');
        }
        
        const profile = await profileResponse.json();
        if (!profile || profile.role !== 'admin') {
          // Not an admin, clear session and redirect
          await fetch('/api/admin/logout', { method: 'POST' });
          Cookies.remove('admin_session', { path: '/admin' });
          router.push('/admin/login');
        }
      } catch (error) {
        logger.error('Admin session check error:', error);
        // Handle any errors by clearing session and redirecting
        Cookies.remove('admin_session', { path: '/admin' });
        router.push('/admin/login');
      }
    };

    // Check session on mount and setup refresh interval
    checkSession();
    const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [router]);

  return null;
} 