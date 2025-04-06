'use client';

import { useState, useEffect } from 'react';

interface BrowserFeatures {
  isClient: boolean;
  window: typeof window | undefined;
  document: typeof document | undefined;
  navigator: typeof navigator | undefined;
  isLocalStorageAvailable: boolean;
  isSessionStorageAvailable: boolean;
  userAgent: string | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

/**
 * Hook that safely provides access to browser APIs to prevent hydration mismatches
 * Returns undefined for all browser APIs during SSR
 */
export function useBrowserFeatures(): BrowserFeatures {
  // Start with SSR-safe values (all undefined/false/null)
  const [features, setFeatures] = useState<BrowserFeatures>({
    isClient: false,
    window: undefined,
    document: undefined,
    navigator: undefined,
    isLocalStorageAvailable: false,
    isSessionStorageAvailable: false,
    userAgent: null,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    viewportWidth: null,
    viewportHeight: null,
  });

  useEffect(() => {
    // Test local storage availability
    const testLocalStorage = () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    };

    // Test session storage availability
    const testSessionStorage = () => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    };

    // Detect device type
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && 
                     !/iPad/i.test(userAgent);
    const isTablet = /iPad|Android/i.test(userAgent) && 
                     !/Mobile/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    // Update all features at once
    setFeatures({
      isClient: true,
      window,
      document,
      navigator,
      isLocalStorageAvailable: testLocalStorage(),
      isSessionStorageAvailable: testSessionStorage(),
      userAgent,
      isMobile,
      isTablet,
      isDesktop,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    // Set up window resize listener to update dimensions
    const handleResize = () => {
      setFeatures(prev => ({
        ...prev,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return features;
} 