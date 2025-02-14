import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip middleware for excluded routes
  if (excludedRoutes.some(route => pathname.startsWith(route))) {
    return new NextResponse(null, { status: 200 });
  }

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return NextResponse.json(null, {
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
    // Create base response with the original request
    const response = new NextResponse(null, {
      status: 200,
      headers: new Headers(request.headers)
    });

    // Add CORS headers for API routes
    if (pathname.startsWith('/api')) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

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

    return response;

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
    // For non-API routes, continue the request chain
    return new NextResponse(null, { status: 200 });
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

  // Create response with CORS headers
  const response = new NextResponse(
    request.body,
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Credentials': 'true'
      },
    }
  );

  return response;
}

export const corsConfig = {
  matcher: '/api/:path*',
};  