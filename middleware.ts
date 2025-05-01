import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { UserRole } from '@/lib/types';

// Paths that are always accessible, even in maintenance mode
const ALWAYS_ACCESSIBLE_PATHS = [
  '/api/auth',
  '/api/auth/signin',
  '/api/auth/session',
  '/api/auth/callback',
  '/api/auth/signout',
  '/login',
  '/admin-login',
  '/admin',           
  '/admin/dashboard', 
  '/admin/settings',  
  '/favicon',
  '/images',
  '/fonts',
  '/maintenance',
  '/api/settings',
  '/api/maintenance',
  '/api/admin',
  '/logo.png',
  '/_next',
  '/static',
  '/api/health',
  '/api/trpc',  // Add if you're using tRPC
];

// Check if a path should bypass the maintenance check
const shouldBypassMaintenanceCheck = (path: string): boolean => {
  // Normalize the path
  const normalizedPath = path.toLowerCase();
  
  // First check exact matches
  if (ALWAYS_ACCESSIBLE_PATHS.some(accessible => normalizedPath === accessible.toLowerCase())) {
    return true;
  }
  
  // Then check path starts with
  return ALWAYS_ACCESSIBLE_PATHS.some(accessible => 
    normalizedPath.startsWith(accessible.toLowerCase())
  ) || normalizedPath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i) !== null;
};

// Check if request is coming from a mobile device
const isMobileDevice = (userAgent: string | null): boolean => {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const userAgent = request.headers.get('user-agent');
  const isMobile = isMobileDevice(userAgent);

  // Log information about the request (useful for debugging)
  console.log(`[Middleware] Processing request: ${pathname}, isMobile: ${isMobile}`);

  // Skip maintenance check for bypassed paths
  if (shouldBypassMaintenanceCheck(pathname)) {
    console.log(`[Middleware] Skipping maintenance check for: ${pathname}`);
    return undefined;
  }

  try {
    // Check for admin access first
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // If user is admin, let them through immediately
    if (token?.role === 'admin') {
      console.log('[Middleware] Admin access granted');
      return undefined;
    }

    // Check maintenance mode status
    const baseUrl = process.env.NEXTAUTH_URL || `${url.protocol}//${url.host}`;
    const maintCheckUrl = `${baseUrl}/api/maintenance/check?_t=${Date.now()}`;
    
    console.log(`[Middleware] Checking maintenance status at: ${maintCheckUrl}`);
    
    const response = await fetch(maintCheckUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      // If maintenance check fails, let the request through
      return undefined;
    }

    const { maintenance } = await response.json();
    
    // If maintenance mode is enabled and user is not admin, redirect to maintenance page
    const userRole = token?.role as UserRole | undefined;
    if (maintenance && userRole !== 'admin') {
      console.log(`[Middleware] Redirecting to maintenance page from: ${pathname}`);
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  } catch (error) {
    console.error(`[Middleware] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Log additional error details in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[Middleware] Full error:', error);
      console.error('[Middleware] Request URL:', request.url);
      console.error('[Middleware] Request headers:', Object.fromEntries(request.headers.entries()));
    }
    // In case of error, don't block access
    return undefined;
  }

  // Continue with the request
  return undefined;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon\\.ico|public/|assets/|images/|static/).*)',
  ],
}; 