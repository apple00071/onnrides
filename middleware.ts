import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

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

    logger.info('Checking maintenance mode:', { baseUrl });

    // Call the maintenance check API
    const response = await fetch(`${baseUrl}/api/maintenance/check`, {
      headers: {
        'x-middleware-bypass': '1'
      }
    });
    
    if (!response.ok) {
      logger.error('Maintenance check failed:', {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    const data = await response.json();
    maintenanceMode = Boolean(data.maintenance);
    lastCheck = now;
    
    logger.info('Maintenance mode status:', { 
      maintenanceMode,
      lastCheck: new Date(lastCheck).toISOString()
    });
    
    return maintenanceMode;
  } catch (error) {
    logger.error('Error checking maintenance mode:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Log incoming request
    logger.info('Request started:', {
      requestId,
      url: request.url,
      method: request.method,
      path: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    });

    const pathname = new URL(request.url).pathname;
    const isAdminRoute = pathname.startsWith('/admin');

    // Skip maintenance check for these paths
    const shouldSkipMaintenanceCheck = 
      pathname.includes('/_next') || 
      pathname.includes('/api/maintenance/check') || 
      pathname.includes('/api') || 
      pathname.includes('/maintenance') ||
      pathname.match(/\.[^/]+$/) || 
      request.headers.get('x-middleware-bypass') === '1';

    // Handle admin routes
    if (isAdminRoute) {
      try {
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET
        });

        logger.info('Admin auth check:', {
          requestId,
          path: pathname,
          hasToken: !!token,
          role: token?.role
        });

        if (!token) {
          logger.warn('Unauthorized admin access attempt:', {
            requestId,
            path: pathname
          });
          const loginUrl = new URL('/auth/signin', request.url);
          loginUrl.searchParams.set('callbackUrl', pathname);
          return NextResponse.redirect(loginUrl);
        }

        if (token.role !== 'admin') {
          logger.warn('Non-admin user attempted to access admin route:', {
            requestId,
            path: pathname,
            userRole: token.role
          });
          return NextResponse.redirect(new URL('/', request.url));
        }

        return undefined;
      } catch (error) {
        const errorDetails = handleApiError(error);
        logger.error('Admin auth error:', {
          requestId,
          ...errorDetails
        });
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
    }

    if (shouldSkipMaintenanceCheck) {
      return undefined;
    }

    // Check maintenance mode
    const maintenance = await isMaintenanceMode(request);
    
    if (maintenance) {
      try {
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET 
        });

        if (token?.role === 'admin') {
          return undefined;
        }

        logger.info('Redirecting to maintenance page:', {
          requestId,
          path: pathname,
          userRole: token?.role
        });
        
        return NextResponse.redirect(new URL('/maintenance', request.url));
      } catch (error) {
        const errorDetails = handleApiError(error);
        logger.error('Maintenance mode auth error:', {
          requestId,
          ...errorDetails
        });
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    }

    // Handle payment endpoints
    if (pathname.startsWith('/api/payments') || pathname.startsWith('/api/razorpay')) {
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

    // Log request completion
    logger.info('Request completed:', {
      requestId,
      duration: Date.now() - requestStartTime,
      path: pathname
    });

    return undefined;
  } catch (error) {
    const errorDetails = handleApiError(error);
    
    logger.error('Middleware error:', {
      requestId,
      duration: Date.now() - requestStartTime,
      ...errorDetails
    });

    if (new URL(request.url).pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' 
            ? errorDetails.message
            : 'An unexpected error occurred',
          requestId
        },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL('/error', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 