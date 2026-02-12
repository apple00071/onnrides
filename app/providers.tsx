'use client';

import { Session } from 'next-auth';
import { ProviderRegistry } from './context-providers/ProviderRegistry';
import { AuthProvider } from './context-providers/AuthProvider';
import logger from '@/lib/logger';
import { SafeDomProvider } from '@/components/SafeDomProvider';
import dynamic from 'next/dynamic';

// Import ErrorBoundary dynamically with no SSR
const ErrorBoundary = dynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);

export function Providers({
  children,
  session
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  logger.debug('Root providers initialized');

  return (
    <ErrorBoundary>
      <AuthProvider session={session}>
        <SafeDomProvider>
          <ProviderRegistry>
            {children}
          </ProviderRegistry>
        </SafeDomProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
} 