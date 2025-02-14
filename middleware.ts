import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

declare module 'next/server' {
  interface NextResponse extends Response {
    rewrite(destination: string | URL): NextResponse;
  }
}

// Define protected routes that require authentication
const protectedRoutes = [
  '/bookings',
  '/profile',
  '/api/bookings',
  '/api/payment',
  '/payment-status'
];

// Define routes that should be excluded from middleware processing
const excludedRoutes = [
  '/api/auth',
  '/_next',
  '/favicon.ico'
];

export const config = {
  matcher: [
    // Match API routes
    '/api/:path*',
    // Match protected routes
    '/bookings/:path*',
    '/profile/:path*',
    '/payment-status/:path*'
  ]
};

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip middleware for excluded routes
  if (excludedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    // Get the token if it exists
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // Check if the route is protected
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );

    // For protected routes, require authentication
    if (isProtectedRoute && !token) {
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Authentication required'
          },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );
      }

      // For regular routes, redirect to sign in
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // For API routes, add CORS headers
    if (pathname.startsWith('/api/')) {
      const response = new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      return response;
    }

    // For all other routes, forward the request
    return new NextResponse(null, {
      status: 200,
      headers: new Headers(request.headers)
    });

  } catch (error) {
    console.error('Middleware error:', error);
    
    // Handle errors
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error' 
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }
    
    // For non-API routes, forward the request
    return new NextResponse(null, {
      status: 200,
      headers: new Headers(request.headers)
    });
  }
}

export function corsMiddleware(request: NextRequest) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Credentials': 'true'
      },
    });
  }

  // Clone the request headers and add CORS headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Access-Control-Allow-Origin', '*');
  requestHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  requestHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  requestHeaders.set('Access-Control-Allow-Credentials', 'true');

  // Forward the request with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const corsConfig = {
  matcher: '/api/:path*',
};  