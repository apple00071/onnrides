import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/home',
    '/vehicles',
    '/about',
    '/contact',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/api/auth'
  ];

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith('/api/auth/') ||
    request.nextUrl.pathname.startsWith('/api/vehicles') // Allow public access to vehicle API
  );

  // Allow public paths and static files
  if (isPublicPath || request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|css|js)$/)) {
    return NextResponse.next();
  }

  // Protected API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin-only routes
    if (request.nextUrl.pathname.startsWith('/api/admin/') && token.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // Protected pages
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Admin-only pages
  if (request.nextUrl.pathname.startsWith('/admin/') && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next/ (Next.js internals)
     * 2. /static (static files)
     * 3. /_vercel (Vercel internals)
     * 4. /favicon.ico, /robots.txt (static files)
     */
    '/((?!_next|static|_vercel|favicon.ico|robots.txt).*)'
  ]
};  