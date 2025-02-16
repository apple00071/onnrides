import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/bookings',
  '/profile',
  '/api/bookings',
  '/api/payments',
  '/payment-status',
  '/admin'
];

// Define public routes that should bypass middleware
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/about',
  '/contact',
  '/vehicles',
  '/search'
];

export const config = {
  matcher: [
    // Only run middleware on protected routes
    '/bookings/:path*',
    '/profile/:path*',
    '/api/bookings/:path*',
    '/api/payments/:path*',
    '/payment-status/:path*',
    '/admin/:path*'
  ]
};

export async function middleware(request: NextRequest) {
  // Get session token from cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, value] = cookie.trim().split('=');
      return [key, value];
    })
  );
  
  const sessionToken = cookies['__Secure-next-auth.session-token'] || 
                      cookies['next-auth.session-token'];

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow public routes and static files
  if (publicRoutes.some(route => pathname === route) || 
      pathname.startsWith('/api/auth') || 
      pathname.startsWith('/_next') || 
      pathname.includes('favicon.ico') ||
      pathname.match(/\.(jpg|jpeg|gif|png|svg|ico)$/)) {
    return NextResponse.next();
  }

  // For admin routes
  if (pathname.startsWith('/admin')) {
    // Skip middleware for admin login page
    if (pathname.startsWith('/admin/login')) {
      return new NextResponse(null);
    }

    if (!sessionToken) {
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ 
            success: false,
            error: 'Admin access required'
          }),
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
      // For regular routes, redirect to admin login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // For protected routes
  if (!sessionToken) {
    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required'
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // For regular routes, redirect to login
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
  return new NextResponse(null);
}  