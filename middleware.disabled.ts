import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a disabled version of the middleware
// Rename this file to middleware.ts and rename the existing middleware.ts to middleware.backup.ts
// to disable the maintenance mode functionality

export function middleware(request: NextRequest) {
  // This middleware does nothing, just passes all requests through
  return undefined;
}

export const config = {
  matcher: [
    // Match nothing specifically
    '/_disabled_middleware_path_that_doesnt_exist',
  ],
}; 