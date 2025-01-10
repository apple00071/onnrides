'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

export default function SignOut() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signOut();
        toast.success('Signed out successfully');
        router.push('/login');
      } catch (error) {
        logger.error('Sign out error:', error);
        toast.error('Failed to sign out. Please try again.');
        router.push('/dashboard');
      }
    };

    performSignOut();
  }, [router, signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing out...</p>
      </div>
    </div>
  );
} 