'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import logger from '@/lib/logger';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const searchParams = useSearchParams();

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
        } else if (result.error === 'Invalid credentials') {
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#f26e24]/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-3xl font-extrabold tracking-tight text-[#f26e24] drop-shadow-[0_0_15px_rgba(242,110,36,0.3)] group-hover:scale-105 transition-transform duration-200">
              Mister Rides
            </span>
          </Link>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Login</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Enter your credentials to access the admin dashboard
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@misterrides.com"
                className="block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:border-transparent transition-all duration-200 disabled:opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                className="block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:border-transparent transition-all duration-200 disabled:opacity-50"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-[#f26e24] to-[#e85d1c] hover:from-[#e85d1c] hover:to-[#f26e24] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-[#f26e24] transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
            <p className="text-sm text-slate-400">
              Not an admin?{' '}
              <Link href="/auth/signin" className="text-[#f26e24] hover:text-[#ff8c42] font-semibold transition-colors duration-150">
                Sign in as user
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
