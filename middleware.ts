import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicRoutes = ['/login', '/register', '/signup', '/forgot-password', '/admin/login', '/', '/vehicles'];
const adminRoutes = ['/admin'];
const protectedRoutes = ['/profile', '/booking', '/my-rides', '/my-booking'];

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  [key: string]: string;
}

// Edge-compatible token verification
async function verifyAuth(token: string): Promise<TokenPayload | null> {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
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
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('Middleware - Path:', pathname);

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
      console.log('Protected route without token, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const user = await verifyAuth(token);
    if (!user) {
      console.log('Invalid token for protected route, redirecting to login');
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
      console.log('No token for admin route, redirecting to admin login');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const user = await verifyAuth(token);
    if (!user || user.role !== 'admin') {
      console.log('Not admin or invalid token, redirecting to home');
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