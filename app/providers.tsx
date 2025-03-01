'use client';

import { Session } from 'next-auth';
import { ProviderRegistry } from './providers/ProviderRegistry';
import logger from '@/lib/logger';

export function Providers({ 
  children,
  session 
}: { 
  children: React.ReactNode;
  session: Session | null;
}) {
  logger.debug('Root providers initialized');
  
  return (
    <ProviderRegistry>
      {children}
    </ProviderRegistry>
  );
} 