'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export interface User {
  id: number;
  email: string;
  role?: string;
  isDocumentsVerified?: boolean;
}

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

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      console.log('Checking user session...');
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        console.log('Session check failed:', data);
        setUser(null);
        return;
      }

      const data = await response.json();
      if (data.user) {
        console.log('User session found:', data.user);
        setUser(data.user);
      } else {
        console.log('No user session found');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Validate input before making request
      if (!email || !password) {
        toast.error('Email and password are required');
        return { success: false, message: 'Email and password are required' };
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Set user data immediately after successful login
      setUser(data.user);
      
      // Show success message
      toast.success('Login successful');

      // Redirect based on user role
      if (data.user.role === 'admin') {
        router.push('/admin');
        return { success: true, isAdmin: true };
      } else {
        router.push('/');
        return { success: true, isAdmin: false };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/login');
      toast.success('Registration successful! Please login.');
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('Sign up error:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
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