'use client'
import { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { User, UserRole } from '@/lib/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; message?: string }>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ success: boolean; message: string; details?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false, message: 'Not implemented' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'authenticated' && session?.user) {
      setUser(session.user as User);
    } else {
      setUser(null);
    }

    setLoading(false);
  }, [session, status]);

  const signIn = async (email: string, password: string) => {
    if (!email || !password) {
      toast.error('Email and password are required');
      return { success: false, message: 'Email and password are required' };
    }

    try {
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        throw new Error(result?.error || 'Login failed');
      }

      toast.success('Login successful');

      // Wait for session to update
      await new Promise(resolve => setTimeout(resolve, 100));

      if (session?.user?.role === 'admin') {
        router.push('/admin');
        return { success: true, isAdmin: true };
      } else {
        router.push('/');
        return { success: true, isAdmin: false };
      }
    } catch (error) {
      logger.error('Sign in error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/auth/signin');
      toast.success('Registration successful! Please login.');
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      logger.error('Sign up error:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      router.push('/auth/signin');
    } catch (error) {
      logger.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};