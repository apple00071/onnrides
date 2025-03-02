import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple no-op middleware that doesn't do anything
export function middleware(request: NextRequest) {
  // Return undefined to pass through requests without modifications
  return undefined;
}

export const config = {
  matcher: [
    /*
     * Apply this middleware to no routes
     * This effectively disables the middleware
     */
    '/_disabled_middleware_path_that_doesnt_exist',
  ],
}; 