import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';

// Define protected routes that require authentication
const protectedRoutes = [
  '/bookings',
  '/profile',
  '/api/bookings',
  '/api/payment',
  '/payment-status'
];

export async function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  
  logger.info('Middleware processing request:', {
    pathname,
    method: request.method
  });

  // Get the token if it exists
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  logger.info('Token status:', {
    hasToken: !!token,
    pathname
  });

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // For protected routes, require authentication
  if (isProtectedRoute && !token) {
    logger.warn('Unauthorized access attempt:', {
      pathname,
      hasToken: !!token
    });

    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required',
          details: 'User session not found'
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    // For regular routes, redirect to sign in
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return null;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/bookings/:path*',
    '/profile/:path*',
    '/api/bookings/:path*',
    '/api/payment/:path*',
    '/payment-status/:path*'
  ]
};

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