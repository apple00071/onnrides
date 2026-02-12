'use client';

import nextDynamic from 'next/dynamic';

// Import ErrorBoundary dynamically with no SSR
export const DynamicErrorBoundary = nextDynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);