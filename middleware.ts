import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
    // Get NextAuth.js session token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      // Redirect to admin login if no token
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    // Check if user is admin
    if (token.role !== 'admin') {
      // Redirect to home if not admin
      return NextResponse.redirect(new URL('/', request.url));
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

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/admin/:path*']
};  