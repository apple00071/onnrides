import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || '';

interface JWTPayload {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only run middleware for admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Skip middleware for admin login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (!token) {
      // Redirect to admin login if no token
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    // Verify token and check if user is admin
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    const jwtPayload = payload as unknown as JWTPayload;

    if (!jwtPayload.user || jwtPayload.user.role !== 'admin') {
      // Redirect to admin login if not admin
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Redirect to admin login on error
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
}

// Configure the paths that should be handled by this middleware
export const config = {
  matcher: '/admin/:path*',
};  