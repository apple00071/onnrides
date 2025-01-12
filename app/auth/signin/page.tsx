'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminLogin = searchParams.get('admin') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || (isAdminLogin ? '/admin/dashboard' : '/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        isAdmin: isAdminLogin ? 'true' : 'false',
        redirect: false,
        callbackUrl
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.url) {
        toast.success('Signed in successfully');
        router.push(result.url);
        router.refresh();
      }
    } catch (error) {
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
            {isAdminLogin ? 'Admin Login' : 'Welcome Back'}
          </h2>
          {!isAdminLogin && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-[#f26e24] hover:text-[#e05d13]">
                Sign up
              </Link>
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
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
                placeholder={isAdminLogin ? "Admin email" : "Enter your email"}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isAdminLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] sm:text-sm"
                placeholder={isAdminLogin ? "Admin password" : "Enter your password"}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : (isAdminLogin ? 'Sign in as Admin' : 'Sign in')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 