'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders its children on the client-side
 * This prevents hydration mismatches for components that use browser APIs
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Return fallback (default null) on the server
  if (!isClient) {
    return <>{fallback}</>;
  }

  // Return children on the client
  return <>{children}</>;
} 