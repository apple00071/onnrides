'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MaintenanceCheckProps {
  children: React.ReactNode;
  isMaintenanceMode: boolean;
}

export function MaintenanceCheck({ children, isMaintenanceMode }: MaintenanceCheckProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [cachedMaintenanceMode, setCachedMaintenanceMode] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(0);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  // List of paths that should be accessible during maintenance
  const allowedPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/error',
    '/admin-login',
    '/maintenance'
  ];

  // Check if current path is in allowed paths
  const isAllowedPath = allowedPaths.some(path => pathname?.startsWith(path));

  // Skip all maintenance checks for admin users
  const shouldSkipMaintenanceCheck = isAdmin || pathname?.startsWith('/admin');

  // Cache duration: 5 minutes for regular users, skip entirely for admins
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Optimized maintenance mode check with caching
  useEffect(() => {
    // Skip maintenance checks for admin users or admin routes
    if (shouldSkipMaintenanceCheck || status === 'loading') {
      return;
    }

    // Check if we have a cached value that's still valid
    const now = Date.now();
    const cachedValue = sessionStorage.getItem('maintenanceMode');
    const cachedTime = sessionStorage.getItem('maintenanceModeTime');

    if (cachedValue && cachedTime) {
      const timeDiff = now - parseInt(cachedTime);
      if (timeDiff < CACHE_DURATION) {
        setCachedMaintenanceMode(cachedValue === 'true');
        setLastCheck(parseInt(cachedTime));
        return;
      }
    }

    // Only make API call if cache is expired or doesn't exist
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/maintenance/check', {
          cache: 'no-store',
          headers: {
            'x-client-check': '1' // Identify client-side requests
          }
        });

        if (response.ok) {
          const data = await response.json();
          const maintenanceStatus = Boolean(data.maintenance);

          // Cache the result
          sessionStorage.setItem('maintenanceMode', String(maintenanceStatus));
          sessionStorage.setItem('maintenanceModeTime', String(now));

          setCachedMaintenanceMode(maintenanceStatus);
          setLastCheck(now);
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        // On error, assume no maintenance mode
        setCachedMaintenanceMode(false);
      }
    };

    checkMaintenanceMode();
  }, [shouldSkipMaintenanceCheck, status, pathname]);

  // Determine which maintenance mode value to use
  const effectiveMaintenanceMode = shouldSkipMaintenanceCheck
    ? false
    : (cachedMaintenanceMode !== null ? cachedMaintenanceMode : isMaintenanceMode);

  // Show maintenance page if:
  // 1. Maintenance mode is ON, AND
  // 2. User is not an admin, AND
  // 3. Current path is not in allowed paths, AND
  // 4. We're not skipping maintenance checks
  if (effectiveMaintenanceMode && !isAdmin && !isAllowedPath && !shouldSkipMaintenanceCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <img
              src="/logo.png"
              alt="OnnRides Logo"
              width={140}
              height={40}
              className="mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Site Under Maintenance</h1>
          <p className="text-gray-600 mb-6">
            We are currently performing scheduled maintenance on our site. 
            We'll be back shortly.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {!session ? (
                <>
                  For assistance, please contact our support team at{' '}
                  <a href="mailto:support@onnrides.com" className="text-orange-600 hover:text-orange-800 font-medium">
                    support@onnrides.com
                  </a>
                </>
              ) : (
                'Please check back later.'
              )}
            </p>
            {session && !isAdmin && (
              <p className="text-xs text-gray-400">
                If you need immediate assistance, please contact support.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 