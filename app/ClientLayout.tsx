'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top on route change
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    // Cleanup function
    return () => {
      // Remove any lingering portals or event listeners
      const portals = document.querySelectorAll('[data-portal-root]');
      portals.forEach(portal => {
        if (portal.parentNode) {
          portal.parentNode.removeChild(portal);
        }
      });
    };
  }, [pathname]);

  return <>{children}</>;
} 