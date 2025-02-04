import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes that require authentication
const protectedRoutes = [
  '/bookings',
  '/profile',
  '/admin',
  '/api/bookings'
];

export async function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const pathname = new URL(request.url).pathname;

  // Get the token if it exists
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // For protected routes, require authentication
  if (isProtectedRoute && !token) {
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

  // Special handling for admin routes
  if (pathname.startsWith('/admin') && (!token || token.role !== 'admin')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Allow the request to proceed
  return null;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/bookings/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/api/bookings/:path*'
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );

  return response;
}

export const corsConfig = {
  matcher: '/api/:path*',
};  