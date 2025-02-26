'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import logger from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our logging service
    logger.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>
        <p className="text-gray-600">
          We apologize for the inconvenience. Please try again later.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-mono text-gray-700">Error: {error.message}</p>
            {error.digest && (
              <p className="text-sm font-mono text-gray-700">Digest: {error.digest}</p>
            )}
          </div>
        )}
        <div className="mt-6 space-x-3">
          <Button onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
          <Button onClick={() => reset()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
} 