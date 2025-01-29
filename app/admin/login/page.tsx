'use client';

import { logger } from '@/lib/logger';
import * as React from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Redirect to dashboard if already authenticated as admin
  React.useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    setLoading(true);

    try {
      logger.debug('Attempting admin sign in for:', email);
      
      // First, try to sign in with admin flag
      const result = await signIn('credentials', {
        email,
        password,
        isAdmin: 'true', // Pass as string
        redirect: false,
        callbackUrl: '/admin/dashboard'
      });

      logger.debug('Sign in result:', result);

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

      // If sign in was successful, check if user is admin
      try {
        logger.debug('Checking admin status for:', email);
        
        const response = await fetch('/api/auth/check-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();
        logger.debug('Admin check response:', data);

        if (!response.ok) {
          logger.error('Admin check failed:', data);
          throw new Error(data.error || 'Failed to verify admin access');
        }

        if (data.isAdmin) {
          toast.success('Welcome back, admin!');
          // Use replace to prevent going back to login page
          router.replace('/admin/dashboard');
        } else {
          logger.debug('User is not an admin:', data);
          toast.error('This account does not have admin access');
          // Sign out if not admin
          await signIn('credentials', {
            email: '',
            password: '',
            redirect: false,
          });
        }
      } catch (error) {
        logger.error('Admin check error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to verify admin access');
        // Sign out on error
        await signIn('credentials', {
          email: '',
            password: '',
            redirect: false,
        });
      }
    } catch (error) {
      logger.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  // Don't show login page if already authenticated as admin
  if (status === 'authenticated' && session?.user?.role === 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[#f26e24]" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Link href="/" className="flex items-center space-x-2">
            <Icons.logo className="h-8 w-8" />
            <span className="font-bold">ONNRIDES</span>
          </Link>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Manage your vehicle rental platform with ease and efficiency."
            </p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button 
                  className="w-full" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-center text-sm text-muted-foreground w-full">
                Not an admin?{' '}
                <Link
                  href="/auth/signin"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Sign in as user
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 