import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle admin routes
  if (pathname.startsWith('/admin')) {
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

      // For authenticated admin users, just let the request proceed
      return undefined;

    } catch (error) {
      console.error('Auth check error:', error);
      return NextResponse.redirect(new URL('/auth/signin', request.url));
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

    // Let all other payment requests proceed without modification
    return undefined;
  }

  // Allow all other requests to proceed
  return undefined;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/payments/:path*',
    '/api/razorpay/:path*'
  ]
}; 