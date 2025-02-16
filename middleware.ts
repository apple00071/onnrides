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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip middleware for auth routes and static files
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/auth/signin') ||
      pathname.startsWith('/_next') || 
      pathname.includes('favicon.ico')) {
    return new NextResponse(null);
  }

  // Get session token from cookie using proper Edge Runtime method
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, value] = cookie.trim().split('=');
      return [key, value];
    })
  );
  
  const sessionToken = cookies['__Secure-next-auth.session-token'] || 
                      cookies['next-auth.session-token'];

  // For admin routes, require admin role
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

  // For other protected routes, require authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !sessionToken) {
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

  // For all other routes, allow the request to proceed
  return new NextResponse(null);
}  