import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';

// Cache the maintenance mode status for 60 seconds
let maintenanceMode: boolean = false;
let lastCheck = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

async function isMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  
  // Return cached value if available and not expired
  if (lastCheck > 0 && (now - lastCheck) < CACHE_DURATION) {
    return maintenanceMode;
  }

  try {
    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Call the maintenance check API
    const response = await fetch(`${baseUrl}/api/maintenance/check`, {
      headers: {
        'x-middleware-bypass': '1' // Add a custom header to identify middleware requests
      }
    });
    
    if (!response.ok) {
      console.error('Maintenance check failed:', response.status);
      return false;
    }

    const data = await response.json();
    maintenanceMode = Boolean(data.maintenance);
    lastCheck = now;
    return maintenanceMode;
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = new URL(request.url).pathname;
    const isAdminRoute = pathname.startsWith('/admin');

    // Skip maintenance mode and auth check for admin login page and API routes
    if (pathname === '/admin-login' || pathname.startsWith('/api/')) {
      return undefined;
    }

    // Handle admin routes - check authentication
    if (isAdminRoute) {
      try {
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET
        });

        // Log authentication attempt
        logger.info('Auth check:', {
          path: pathname,
          hasToken: !!token,
          role: token?.role?.toLowerCase(),
          email: token?.email
        });

        if (!token) {
          // Redirect to login if no token
          const loginUrl = new URL('/admin-login', request.url);
          loginUrl.searchParams.set('callbackUrl', pathname);
          return NextResponse.redirect(loginUrl);
        }

        // Case-insensitive role check
        const userRole = token.role?.toLowerCase();
        if (userRole !== 'admin') {
          logger.warn('Non-admin access attempt:', {
            path: pathname,
            role: userRole,
            email: token.email
          });
          // Redirect unauthorized users to home
          return NextResponse.redirect(new URL('/', request.url));
        }

        // For authenticated admin users, let the request proceed (bypass maintenance mode)
        return undefined;
      } catch (error) {
        logger.error('Auth check error:', error);
        return NextResponse.redirect(new URL('/admin-login', request.url));
      }
    }

    // For non-admin routes, check maintenance mode
    const inMaintenanceMode = await isMaintenanceMode(request);
    if (inMaintenanceMode) {
      // Allow access to maintenance page itself
      if (pathname === '/maintenance') {
        return undefined;
      }

      // Redirect all other routes to maintenance page
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    // For non-admin routes not in maintenance mode, proceed as normal
    return undefined;
  } catch (error) {
    logger.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

// Update the matcher to be more specific
export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}; 