'use client';

import { useEffect, useState } from 'react';

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    return () => {
      // Cleanup any portals when unmounting
      const portals = document.querySelectorAll('[data-portal-root]');
      portals.forEach(portal => {
        if (portal.parentNode) {
          try {
            portal.parentNode.removeChild(portal);
          } catch (error) {
            console.error('Error removing portal:', error);
          }
        }
      });
    };
  }, []);

  // During server-side rendering, return null
  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
} 