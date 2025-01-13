'use client';

<<<<<<< HEAD
import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
=======
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
<<<<<<< HEAD
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/admin/dashboard';
=======
  const [loading, setLoading] = useState(false);
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
<<<<<<< HEAD
        redirect: false,
        callbackUrl
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success('Login successful');
      router.push(callbackUrl);
=======
        isAdmin: 'true',
        redirect: false,
      });

      if (!result) {
        toast.error('An error occurred. Please try again.');
        return;
      }

      if (result.error) {
        toast.error(result.error === 'CredentialsSignin' 
          ? 'Invalid email or password' 
          : 'Failed to sign in. Please try again.'
        );
      } else {
        toast.success('Welcome back, admin!');
        router.push('/admin/dashboard');
        router.refresh();
      }
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="OnnRides Logo"
            width={150}
            height={150}
            className="mb-8"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Not an admin?{' '}
          <Link href="/" className="font-medium text-[#f26e24] hover:text-[#e05d13]">
            Back to main site
=======
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div>
          <Link href="/" className="flex justify-center">
            <h1 className="text-4xl font-bold text-[#f26e24] font-goodtimes">ONNRIDES</h1>
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
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
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in as Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 