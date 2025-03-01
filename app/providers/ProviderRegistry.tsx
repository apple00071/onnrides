'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from 'next-themes';
import RazorpayProvider from '@/app/(main)/providers/RazorpayProvider';
import logger from '@/lib/logger';
import ClientOnly from '@/app/(main)/providers/ClientOnly';

/**
 * Centralized provider registry that organizes all app providers in the proper nesting order
 */
export function ProviderRegistry({
  children,
  includeRazorpay = false,
  includeClientOnly = false,
}: {
  children: ReactNode;
  includeRazorpay?: boolean;
  includeClientOnly?: boolean;
}) {
  logger.debug('Initializing ProviderRegistry', {
    providers: {
      auth: true,
      theme: true,
      razorpay: includeRazorpay,
      clientOnly: includeClientOnly
    }
  });

  // Wrap content with providers in the correct order
  let content = children;

  // Conditionally include ClientOnly provider
  if (includeClientOnly) {
    content = <ClientOnly>{content}</ClientOnly>;
  }

  // Conditionally include Razorpay provider
  if (includeRazorpay) {
    content = <RazorpayProvider>{content}</RazorpayProvider>;
  }

  // Always include theme and auth providers
  content = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {content}
    </ThemeProvider>
  );

  content = <AuthProvider>{content}</AuthProvider>;

  return content;
} 