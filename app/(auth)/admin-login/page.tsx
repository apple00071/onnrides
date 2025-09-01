'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { signIn, useSession } from 'next-auth/react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [session, status, router]);

  // Handle error from URL
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: { [key: string]: string } = {
        'unauthorized': 'You are not authorized to access the admin area',
        'Account is blocked': 'Your account has been blocked. Please contact support.',
        'An error occurred': 'An error occurred. Please try again.',
        'CredentialsSignin': 'Invalid email or password'
      };
      toast.error(errorMessages[error] || 'An error occurred');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';
      
      const result = await signIn('credentials', {
        email,
        password,
        isAdmin: 'true',
        redirect: false,
        callbackUrl: decodeURIComponent(callbackUrl)
      });

      if (!result?.ok) {
        toast.error('Invalid credentials');
        return;
      }

      // Get the callback URL from the search params or use default
      router.replace(decodeURIComponent(callbackUrl));
    } catch (error) {
      logger.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div>
          <Link href="/" className="flex justify-center">
            <h1 className="text-4xl font-bold text-[#f26e24]">ONNRIDES</h1>
          </Link>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Not an admin?{' '}
            <Link href="/auth/signin" className="font-medium text-[#f26e24] hover:text-[#e05d13]">
              Sign in as user
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Admin Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] sm:text-sm"
                placeholder="Enter admin email"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Admin Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] sm:text-sm"
                placeholder="Enter admin password"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in as Admin'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 