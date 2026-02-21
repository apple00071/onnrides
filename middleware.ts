import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';

// Cache the maintenance mode status for 5 minutes
let maintenanceMode: boolean = false;
let lastCheck = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function middleware(request: NextRequest) {
  try {
    const pathname = new URL(request.url).pathname;

    // Skip middleware for API routes completely to avoid circular dependencies
    if (pathname.startsWith('/api/')) {
      // For protected API routes, check auth
      const isPublicApiRoute =
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/webhooks') ||
        pathname.startsWith('/api/maintenance') ||
        pathname.startsWith('/api/health') ||
        pathname.startsWith('/api/cron') ||
        (pathname.startsWith('/api/vehicles') && request.method === 'GET');

      if (isPublicApiRoute) {
        return undefined;
      }

      // For protected API routes, verify token
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      return undefined;
    }

    // Always allow static assets and system routes
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.') // Static files like .png, .js, etc.
    ) {
      return undefined;
    }

    // Always allow admin login page
    if (pathname === '/admin-login' || pathname === '/admin/login') {
      return undefined;
    }

    // Always allow maintenance page
    if (pathname === '/maintenance') {
      return undefined;
    }

    const isAdminRoute = pathname.startsWith('/admin');

    // Handle admin routes - check authentication first
    if (isAdminRoute) {
      try {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET
        });

        logger.info('Admin auth check:', {
          path: pathname,
          hasToken: !!token,
          role: token?.role?.toLowerCase(),
        });

        if (!token) {
          const loginUrl = new URL('/admin-login', request.url);
          loginUrl.searchParams.set('callbackUrl', pathname);
          return NextResponse.redirect(loginUrl);
        }

        const userRole = token.role?.toLowerCase();
        const allowedRoles = ['admin', 'staff'];

        if (!userRole || !allowedRoles.includes(userRole)) {
          logger.warn('Unauthorized access attempt:', {
            path: pathname,
            role: userRole,
            email: token.email
          });
          return NextResponse.redirect(new URL('/', request.url));
        }

        // Authenticated admin bypasses maintenance mode
        return undefined;
      } catch (error) {
        logger.error('Auth check error:', error);
        return NextResponse.redirect(new URL('/admin-login', request.url));
      }
    }

    // For non-admin routes, check maintenance mode using cached value
    const now = Date.now();
    if (lastCheck > 0 && (now - lastCheck) < CACHE_DURATION && maintenanceMode) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    // Let the request proceed
    return undefined;
  } catch (error) {
    logger.error('Middleware error:', error);
    return undefined;
  }
}

// Expose a function to update maintenance mode from the settings API
export function setMaintenanceMode(enabled: boolean) {
  maintenanceMode = enabled;
  lastCheck = Date.now();
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth|api/webhooks|api/maintenance|api/health|api/cron).*)',
  ],
};