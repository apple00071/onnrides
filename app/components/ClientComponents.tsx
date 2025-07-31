'use client';

import dynamic from 'next/dynamic';

export const ErrorBoundary = dynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);

export const ClientSpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((mod) => ({ default: mod.SpeedInsights })),
  { ssr: false }
);

export const ClientToaster = dynamic(
  () => import('@/components/ui/toaster').then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
); 