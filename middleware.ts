import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET, COOKIE_NAME, AUTH_ROLES } from './lib/constants';

interface JWTPayload {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export async function middleware(request: NextRequest) {
  // Skip middleware for public routes and static assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.includes('.') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check if it's an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Skip middleware for login page
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );

      const { user } = payload as JWTPayload;

      // Check if user is admin
      if (!user || user.role !== AUTH_ROLES.ADMIN) {
        const url = new URL('/admin/login', request.url);
        url.searchParams.set('from', request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    } catch (error) {
      // Invalid token
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};  