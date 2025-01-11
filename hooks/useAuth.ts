'use client';

import { useSession, signOut } from 'next-auth/react';
import { Session } from 'next-auth';

interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    role: string;
    isDocumentsVerified: boolean;
  } & Session['user'];
}

interface User {
  id: string;
  email: string;
  role: string;
  isDocumentsVerified: boolean;
}

export function useAuth() {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
  };

  const user: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email as string,
    role: session.user.role,
    isDocumentsVerified: session.user.isDocumentsVerified
  } : null;

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signOut: () => signOut({ callbackUrl: '/' })
  };
} 