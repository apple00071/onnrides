'use client';

import logger from '@/lib/logger';
import React from 'react';
import { SessionProvider } from 'next-auth/react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  logger.debug('AuthProvider initialized with NextAuth SessionProvider');
  
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}