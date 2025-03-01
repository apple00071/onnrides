'use client';

import { createContext, useEffect, useState, useRef } from 'react';
import logger from '@/lib/logger';

// Create a context to manage portal state
export const PortalContext = createContext<{
  registerPortal: (id: string) => void;
  unregisterPortal: (id: string) => void;
}>({
  registerPortal: () => {},
  unregisterPortal: () => {},
});

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  const activePortalsRef = useRef(new Set<string>());

  const registerPortal = (id: string) => {
    activePortalsRef.current.add(id);
  };

  const unregisterPortal = (id: string) => {
    activePortalsRef.current.delete(id);
  };

  useEffect(() => {
    setHasMounted(true);

    return () => {
      // Ensure we're running this cleanup only when the component is actually unmounting
      if (typeof window !== 'undefined') {
        try {
          // Only remove portals that were registered through our context
          const portals = document.querySelectorAll('[data-portal-root]');
          portals.forEach(portal => {
            try {
              if (portal && 
                  portal.parentNode && 
                  portal.parentElement?.contains(portal) &&
                  (!portal.id || activePortalsRef.current.has(portal.id))) {
                portal.parentNode.removeChild(portal);
              }
            } catch (error) {
              logger.error('Error removing portal:', error);
            }
          });
          // Clear the set after cleanup
          activePortalsRef.current.clear();
        } catch (error) {
          logger.error('Error during cleanup:', error);
        }
      }
    };
  }, []);

  // During server-side rendering, return null
  if (!hasMounted) {
    return null;
  }

  return (
    <PortalContext.Provider value={{ registerPortal, unregisterPortal }}>
      {children}
    </PortalContext.Provider>
  );
} 