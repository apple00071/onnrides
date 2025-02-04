import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/admin/login',
  '/about',
  '/contact-us',
  '/vehicles'
];

// Define auth routes where authenticated users shouldn't access
const authRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/admin/login'
];

export async function middleware(request: NextRequest) {
  const pathname = request.url ? new URL(request.url).pathname : '/';

  try {
    // Get NextAuth.js session token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If user is authenticated and trying to access auth routes, redirect to home
    if (token && authRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Handle admin routes
    if (pathname.startsWith('/admin')) {
      // Allow access to admin login
      if (pathname === '/admin/login') {
        if (token?.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
        return new NextResponse();
      }

      // Check admin access for other admin routes
      if (!token || token.role !== 'admin') {
        const url = new URL('/admin/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
    }

    // For non-public routes, require authentication
    if (!publicRoutes.includes(pathname) && !token) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    return new NextResponse();
  } catch (error) {
    logger.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};  