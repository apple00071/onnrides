'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Fatal application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="text-center space-y-6 max-w-lg">
            <h1 className="text-4xl font-bold text-gray-900">
              Something went wrong!
            </h1>
            
            <div className="space-y-2">
              <p className="text-gray-600">
                We apologize for the inconvenience. A critical error has occurred.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg">
                  <p>Error: {error.message || 'Unknown error occurred'}</p>
                  {error.digest && <p>Digest: {error.digest}</p>}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => reset()}
                className="bg-[#f26e24] hover:bg-[#e05d13] text-white"
              >
                Try again
              </Button>
              
              <div>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="mt-2"
                >
                  Return to home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 