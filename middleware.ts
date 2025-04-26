import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that are always accessible, even in maintenance mode
const ALWAYS_ACCESSIBLE_PATHS = [
  '/api/auth',
  '/login',
  '/admin-login',
  '/favicon',
  '/images',
  '/fonts',
  '/maintenance',
  '/api/settings',
  '/api/maintenance',
  '/admin',
  '/api/admin',
];

// Check if a path should bypass the maintenance check
const shouldBypassMaintenanceCheck = (path: string): boolean => {
  return ALWAYS_ACCESSIBLE_PATHS.some(accessible => path.startsWith(accessible));
};

// Check if request is coming from a mobile device
const isMobileDevice = (userAgent: string | null): boolean => {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

export async function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const userAgent = request.headers.get('user-agent');
  const isMobile = isMobileDevice(userAgent);

  // Log information about the request (useful for debugging)
  console.log(`[Middleware] Processing request: ${pathname}, isMobile: ${isMobile}, UA: ${userAgent?.substring(0, 50)}...`);

  // Skip maintenance check for certain paths
  if (shouldBypassMaintenanceCheck(pathname)) {
    console.log(`[Middleware] Skipping maintenance check for: ${pathname}`);
    return undefined; // Continue processing the request
  }

  try {
    // Use the maintenance API endpoint instead of calling Prisma directly
    // This resolves the Edge Runtime compatibility issue
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
    const maintCheckUrl = `${baseUrl}/api/maintenance/check?_t=${Date.now()}`;
    
    const response = await fetch(maintCheckUrl, {
        method: 'GET',
        headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const maintenanceCheck = await response.json();
    
    console.log(`[Middleware] Maintenance check result for ${pathname}: ${maintenanceCheck.maintenance}, isMobile: ${isMobile}`);
    
    // If maintenance mode is enabled
    if (maintenanceCheck.maintenance) {
      // Check for admin access to bypass maintenance mode
      const token = await getToken({ req: request });
      const isAdmin = token?.role === 'admin';
      
      // Allow admins to bypass maintenance mode
      if (isAdmin) {
        console.log('[Middleware] Admin access detected, bypassing maintenance mode');
        return undefined; // Continue processing the request
      }
      
      // Redirect to maintenance page
      console.log(`[Middleware] Redirecting to maintenance page from: ${pathname}`);
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  } catch (error) {
    console.log(`[Middleware] Maintenance check error: ${error instanceof Error ? error.message : 'Unknown error'}, isMobile: ${isMobile}, timestamp: ${Date.now()}`);
    
    // In case of an error, don't block access
    return undefined; // Continue processing the request
  }

  // Continue with the request
  return undefined; // Continue processing the request
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|public\\/).*)',
  ],
}; 