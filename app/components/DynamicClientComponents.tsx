'use client';

import nextDynamic from 'next/dynamic';

// Import ErrorBoundary dynamically with no SSR
export const DynamicErrorBoundary = nextDynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);

// Import Toaster dynamically with no SSR
export const DynamicToaster = nextDynamic(
  () => import('@/components/ui/toaster').then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
); 