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
    // Add request logging
    logger.info('Incoming request:', {
      url: request.url,
      method: request.method,
      path: new URL(request.url).pathname,
    });

    const pathname = new URL(request.url).pathname;
    const isAdminRoute = pathname.startsWith('/admin');

    // Skip maintenance check for these paths
    const shouldSkipMaintenanceCheck = 
        pathname.includes('/_next') || 
        pathname.includes('/api/maintenance/check') || 
        pathname.includes('/api') || 
        pathname.includes('/maintenance') ||
        pathname.match(/\.[^/]+$/) || // Skip files with extensions
        request.headers.get('x-middleware-bypass') === '1'; // Skip if it's a middleware request

    // Handle admin routes - check authentication
    if (isAdminRoute) {
      try {
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET
        });

        // Log authentication attempt
        console.log('Auth check:', {
          path: pathname,
          hasToken: !!token,
          role: token?.role
        });

        if (!token) {
          // Redirect to login if no token
          const loginUrl = new URL('/auth/signin', request.url);
          loginUrl.searchParams.set('callbackUrl', pathname);
          return NextResponse.redirect(loginUrl);
        }

        if (token.role !== 'admin') {
          // Redirect unauthorized users to home
          return NextResponse.redirect(new URL('/', request.url));
        }

        // For authenticated admin users, let the request proceed
        return undefined;
      } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
    }

    // If we should skip maintenance check, just proceed
    if (shouldSkipMaintenanceCheck) {
      return undefined;
    }

    // Check maintenance mode
    const maintenance = await isMaintenanceMode(request);
    
    if (maintenance) {
      try {
        // Get the token using next-auth
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET 
        });

        // If user is admin, let them through
        if (token?.role === 'admin') {
          return undefined;
        }

        // Otherwise redirect to maintenance page
        const maintenanceUrl = new URL('/maintenance', request.url);
        return NextResponse.redirect(maintenanceUrl);
      } catch (error) {
        console.error('Error verifying admin status:', error);
        const maintenanceUrl = new URL('/maintenance', request.url);
        return NextResponse.redirect(maintenanceUrl);
      }
    }

    // Handle payment endpoints
    if (pathname.startsWith('/api/payments') || pathname.startsWith('/api/razorpay')) {
      // Only handle OPTIONS requests for CORS
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }
    }

    // Allow all other requests to proceed
    return undefined;
  } catch (error) {
    // Log the error
    logger.error('Middleware error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      method: request.method,
    });

    // For API routes, return a JSON error
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' 
            ? error instanceof Error ? error.message : 'Unknown error'
            : 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }

    // For page routes, redirect to error page
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Apply to all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 