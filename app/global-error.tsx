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
        console.error('Global error:', error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                    <div className="text-center space-y-6 max-w-lg">
                        <h1 className="text-6xl font-bold text-red-600">Error</h1>
                        <h2 className="text-3xl font-semibold text-gray-900">Something went wrong!</h2>

                        <p className="text-gray-600">
                            {error.message || 'An unexpected error occurred.'}
                        </p>

                        <div className="flex gap-4 justify-center pt-4">
                            <Button
                                onClick={() => reset()}
                                className="bg-[#f26e24] hover:bg-[#e05d13] text-white px-8"
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={() => window.location.href = '/'}
                                variant="outline"
                                className="px-8"
                            >
                                Back to Home
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
