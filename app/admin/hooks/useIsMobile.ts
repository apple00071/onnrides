'use client';

import { useState, useEffect } from 'react';

interface DeviceDetectionResult {
  isMobile: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  isMobilePWA: boolean;
}

export default function useIsMobile(): DeviceDetectionResult {
  const [state, setState] = useState<DeviceDetectionResult>({
    isMobile: false,
    isPWA: false,
    isStandalone: false,
    isMobilePWA: false
  });

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    // Check if device is mobile based on screen width
    const checkIsMobile = () => {
      const mobile = window.innerWidth <= 768;
      
      // Check if running in standalone mode (PWA)
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
      
      // Check common mobile user agents as a fallback
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Combined mobile detection
      const isMobileDevice = mobile || mobileUserAgent;
      
      setState({
        isMobile: isMobileDevice,
        isPWA: standalone,
        isStandalone: standalone,
        isMobilePWA: isMobileDevice && standalone
      });
    };

    // Initial check
    checkIsMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return state;
} 