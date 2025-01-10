import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import logger from '@/lib/logger';
import type { NextRequest } from 'next/server';

// Define routes configurations
const publicRoutes = ['/', '/login', '/register', '/about', '/contact', '/vehicles'];
const protectedRoutes = ['/dashboard', '/profile', '/bookings'];
const adminRoutes = ['/admin'];

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  [key: string]: string;
}

// Edge-compatible token verification
async function verifyAuth(token: string): Promise<TokenPayload | null> {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not set');
    return null;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
      iss: payload.iss as string,
      aud: payload.aud as string
    };
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  logger.debug('Middleware - Path:', pathname);

  // Allow access to static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public routes - allow access without token
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('token')?.value;

  // Check token for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      logger.debug('Protected route without token, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const user = await verifyAuth(token);
    if (!user) {
      logger.debug('Invalid token for protected route, redirecting to login');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token'); // Clear invalid token
      return response;
    }

    return NextResponse.next();
  }

  // Check admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    if (!token) {
      logger.debug('No token for admin route, redirecting to admin login');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const user = await verifyAuth(token);
    if (!user || user.role !== 'admin') {
      logger.debug('Not admin or invalid token, redirecting to home');
      const response = NextResponse.redirect(new URL('/', request.url));
      if (!user) {
        response.cookies.delete('token'); // Clear invalid token
      }
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};  