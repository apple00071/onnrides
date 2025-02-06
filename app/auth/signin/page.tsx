'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Head from 'next/head';

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Show success message if account was created - using useEffect to show only once
  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast.success(message);
      // Clear the message from URL to prevent showing again on re-render
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResetEmailSent(true);
        toast.success('Password reset instructions sent to your email');
      } else {
        throw new Error(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        // Get user data to check role
        const userResponse = await fetch('/api/auth/session');
        const userData = await userResponse.json();
        
        if (userData?.user?.role === 'admin') {
          toast.error('Please use the admin login page');
          router.push('/admin/login');
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <div className="min-h-screen flex flex-col justify-center bg-[#fff8f0] py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div>
              <Link href="/" className="flex justify-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#f26e24] font-goodtimes">ONNRIDES</h1>
              </Link>
              <h2 className="mt-6 text-center text-xl sm:text-2xl font-bold text-gray-900">
                {isForgotPassword ? 'Reset your password' : 'Sign in to your account'}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {isForgotPassword ? (
                  <button
                    onClick={() => setIsForgotPassword(false)}
                    className="font-medium text-[#f26e24] hover:text-[#e05d13]"
                  >
                    Back to sign in
                  </button>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <Link href="/auth/signup" className="font-medium text-[#f26e24] hover:text-[#e05d13]">
                      Sign up
                    </Link>
                  </>
                )}
              </p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {resetEmailSent ? (
              <div className="mt-6 text-center">
                <div className="rounded-md bg-green-50 p-4">
                  <p className="text-sm text-green-700">
                    If an account exists with this email, you will receive password reset instructions shortly.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                  className="mt-4 text-sm font-medium text-[#f26e24] hover:text-[#e05d13]"
                >
                  Return to sign in
                </button>
              </div>
            ) : (
              <form 
                className="mt-6 space-y-4 sm:space-y-6" 
                onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} 
                noValidate
              >
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] text-base"
                      placeholder="Enter your email"
                    />
                  </div>
                  {!isForgotPassword && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] text-base"
                        placeholder="Enter your password"
                      />
                    </div>
                  )}
                </div>

                {!isForgotPassword && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm font-medium text-[#f26e24] hover:text-[#e05d13]"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24] disabled:opacity-50 transition-colors"
                  >
                    {loading 
                      ? (isForgotPassword ? 'Sending...' : 'Signing in...') 
                      : (isForgotPassword ? 'Send reset instructions' : 'Sign in')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 