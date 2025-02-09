'use client';

import logger from '@/lib/logger';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle error from URL
  const error = searchParams.get('error');
  if (error === 'unauthorized') {
    toast.error('You are not authorized to access the admin area');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const callbackUrl = searchParams.get('from') || '/admin/dashboard';
      const result = await signIn('credentials', {
        email,
        password,
        isAdmin: 'true',
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        toast.error('An error occurred. Please try again.');
        return;
      }

      if (result.error) {
        if (result.error === 'CredentialsSignin') {
          toast.error('Invalid email or password');
        } else if (result.error === 'AccessDenied') {
          toast.error('You do not have permission to access the admin area');
        } else {
          toast.error('Failed to sign in. Please try again.');
        }
      } else if (result.ok) {
        toast.success('Welcome back, admin!');
        router.push(callbackUrl);
      }
    } catch (error) {
      logger.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div>
          <Link href="/" className="flex justify-center">
            <h1 className="text-4xl font-bold text-[#f26e24] font-goodtimes">ONNRIDES</h1>
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