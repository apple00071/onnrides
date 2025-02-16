import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that should bypass middleware
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/about',
  '/contact',
  '/vehicles',
  '/search'
];

// Define API routes that require authentication
const protectedApiRoutes = [
  '/api/user',
  '/api/bookings',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = await getToken({ req: request });

  // Handle protected API routes
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // For admin routes, check if user has admin role
  if (pathname.startsWith('/admin')) {
    if (!token || token.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // For authenticated routes, redirect to login if no token
  if (!token) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
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