import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Redirect /admin-login to /admin/login
  if (path === '/admin-login') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Redirect /admin/user to /admin/users
  if (path === '/admin/user') {
    return NextResponse.redirect(new URL('/admin/users', request.url));
  }

  // Check auth status for admin routes
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // Redirect to login if not authenticated
    if (!token) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(url);
    }

    // Redirect to home if not an admin
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin-login',
    '/admin/user',
    '/admin/:path*'
  ],
};  