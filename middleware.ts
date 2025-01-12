import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAdminLoginRoute = request.nextUrl.pathname === '/admin/login';
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');

  // Allow access to auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Handle admin login route
  if (isAdminLoginRoute) {
    // If already logged in as admin, redirect to admin dashboard
    if (token?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect other admin routes
  if (isAdminRoute && !isAdminLoginRoute) {
    if (!token) {
      // Redirect to admin login instead of general signin
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (token.role !== 'admin') {
      // If logged in but not admin, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Update matcher to include both admin and auth routes
export const config = {
  matcher: ['/admin/:path*', '/auth/:path*']
};  