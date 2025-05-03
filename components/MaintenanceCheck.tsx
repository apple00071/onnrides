'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface MaintenanceCheckProps {
  children: React.ReactNode;
  isMaintenanceMode: boolean;
}

export function MaintenanceCheck({ children, isMaintenanceMode }: MaintenanceCheckProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';
  
  // List of paths that should be accessible during maintenance
  const allowedPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/error'
  ];
  
  // Check if current path is in allowed paths
  const isAllowedPath = allowedPaths.some(path => pathname?.startsWith(path));
  
  // Show maintenance page if:
  // 1. Maintenance mode is ON, AND
  // 2. User is not an admin, AND
  // 3. Current path is not in allowed paths
  if (isMaintenanceMode && !isAdmin && !isAllowedPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <Image
              src="/logo.png"
              alt="OnnRides Logo"
              width={140}
              height={40}
              className="mx-auto"
              priority
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