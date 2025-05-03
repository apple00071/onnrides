'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

export default function MaintenanceCheck({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAuthPath = AUTH_PATHS.includes(pathname);
  const isAdmin = session?.user?.role?.includes('admin');

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/settings?key=maintenance_mode');
        const data = await response.json();
        
        if (data.success && data.data) {
          setIsMaintenanceMode(data.data.value.toLowerCase() === 'true');
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceMode();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Allow access to auth pages and admin users during maintenance
  if (isMaintenanceMode && !isAdmin && !isAuthPath) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
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
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Site Under Maintenance</h1>
          <p className="text-gray-600">
            We are currently performing scheduled maintenance. Please check back later.
          </p>
          {!session && (
            <p className="mt-4 text-sm text-gray-500">
              For assistance, please contact our support team at{' '}
              <a href="mailto:support@onnrides.com" className="text-orange-600 hover:text-orange-800">
                support@onnrides.com
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 