'use client';

import { Session } from 'next-auth';
import { ProviderRegistry } from './providers/ProviderRegistry';
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
      <SafeDomProvider>
        <ProviderRegistry>
          {children}
        </ProviderRegistry>
      </SafeDomProvider>
    </ErrorBoundary>
  );
} 