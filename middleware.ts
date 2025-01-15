import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle incorrect admin user URL
  if (pathname === '/admin/user') {
    return NextResponse.redirect(new URL('/admin/users', request.url));
  }

  // Skip middleware for public routes and static assets
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/public/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check authentication
  const user = await verifyAuth(request.cookies);
  
  // Redirect unauthenticated users to login
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (user.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/bookings/:path*',
    '/vehicles/:path*'
  ]
};  