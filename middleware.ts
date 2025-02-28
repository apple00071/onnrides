import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define paths that should be accessible during maintenance mode
const maintenanceAllowedPaths = [
  '/maintenance',
  '/admin',
  '/api/admin',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/auth/signin',  // Allow sign-in during maintenance
];

export async function middleware(request: NextRequest) {
  // Get the pathname
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check maintenance mode first, before any other checks
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  if (isMaintenanceMode) {
    // Check if current path is allowed during maintenance
    const isAllowedPath = maintenanceAllowedPaths.some(path => 
      pathname.startsWith(path)
    );

    // If path is not allowed during maintenance, check if user is admin
    if (!isAllowedPath) {
      const token = await getToken({ req: request });
      const isAdmin = token?.role === 'admin';

      // If not admin, redirect to maintenance page
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    }
  }

  // Continue with normal auth checks
  const token = await getToken({ req: request });

  // Handle admin routes
  if (pathname.startsWith('/admin')) {
    if (!token || token.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // Handle protected API routes
  if (pathname.startsWith('/api/user') || pathname.startsWith('/api/bookings')) {
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Allow the request to continue
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/admin/* (admin API routes)
     * 2. /_next/* (static files)
     * 3. /favicon.ico, /logo.png (static files)
     * 4. /maintenance (maintenance page)
     */
    '/((?!api/admin|_next|favicon.ico|logo.png|maintenance).*)',
  ],
};  