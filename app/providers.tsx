'use client';

import { ThemeProvider } from 'next-themes';
import { Session } from 'next-auth';

export function Providers({ 
  children,
  session 
}: { 
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
} 