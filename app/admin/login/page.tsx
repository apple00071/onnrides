'use client';

import { logger } from '@/lib/logger';
import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    setLoading(true);

    try {
      logger.debug('Attempting admin sign in for:', email);
      
      const result = await signIn('credentials', {
        email,
        password,
        isAdmin: 'true',
        redirect: false,
        callbackUrl: '/admin/dashboard'
      });

      if (!result) {
        toast.error('An error occurred. Please try again.');
        return;
      }

      if (result.error) {
        if (result.error === 'Admin access required') {
          toast.error('This account does not have admin access');
        } else if (result.error === 'Invalid email or password') {
          toast.error('Invalid email or password');
        } else {
          toast.error('Failed to sign in');
        }
        return;
      }

      toast.success('Welcome back, admin!');
      router.replace('/admin/dashboard');
    } catch (error) {
      logger.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-[#f26e24]">ONNRIDES</span>
          </Link>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Admin Login</h2>
            <p className="text-gray-600 mt-2">
              Enter your credentials to access the admin dashboard
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@onnrides.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24]"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e85d1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Not an admin?{' '}
              <Link href="/auth/signin" className="text-[#f26e24] hover:text-[#e85d1c]">
                Sign in as user
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 