import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes that require authentication
const protectedRoutes = [
  '/bookings',
  '/profile',
  '/api/bookings',
  '/api/payment',
  '/payment-status',
  '/admin'
];

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip middleware for auth routes and static files
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/auth/signin') ||
      pathname.startsWith('/_next') || 
      pathname.includes('favicon.ico')) {
    return;
  }

  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // For admin routes, require admin role
    if (pathname.startsWith('/admin')) {
      // Skip middleware for admin login page
      if (pathname.startsWith('/admin/login')) {
        return;
      }

      if (!token || token.role !== 'admin') {
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

    if (isProtectedRoute && !token) {
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
    return;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // For API routes, return error response
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Internal server error' 
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // For other routes, redirect to login
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('error', 'internal_error');
    return NextResponse.redirect(loginUrl);
  }
}

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