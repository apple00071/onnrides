import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Empty middleware that does nothing
export function middleware(request: NextRequest) {
  // Return nothing, allowing the request to pass through
  return undefined;
}

// Match nothing to effectively disable the middleware
export const config = {
  matcher: [],
}; 