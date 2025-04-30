import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that are always accessible, even in maintenance mode
const ALWAYS_ACCESSIBLE_PATHS = [
  '/api/auth',
  '/login',
  '/admin-login',
  '/admin',           // Add explicit admin path
  '/admin/dashboard', // Add admin dashboard
  '/admin/settings',  // Add admin settings
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
  if (ALWAYS_ACCESSIBLE_PATHS.some(accessible => normalizedPath.startsWith(accessible.toLowerCase()))) {
    return true;
  }

  // Check for admin paths explicitly
  if (normalizedPath.includes('/admin')) {
    return true;
  }

  // Check for static files and API routes
  if (
    normalizedPath.match(/\.[^/]+$/) || // Static files
    normalizedPath.startsWith('/_next') || // Next.js files
    normalizedPath.startsWith('/api/admin') || // Admin API routes
    normalizedPath.startsWith('/api/auth') // Auth API routes
  ) {
    return true;
  }

  return false;
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
  console.log(`[Middleware] Processing request: ${pathname}, isMobile: ${isMobile}`);

  // Skip maintenance check for certain paths
  if (shouldBypassMaintenanceCheck(pathname)) {
    console.log(`[Middleware] Skipping maintenance check for: ${pathname}`);
    return undefined;
  }

  try {
    // Check for admin access with proper secret
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET // Explicitly pass the secret
    });

    const isAdmin = token?.role === 'admin';
    console.log(`[Middleware] Token check - isAdmin: ${isAdmin}, path: ${pathname}`);
    
    // If user is admin, let them through immediately
    if (isAdmin) {
      console.log('[Middleware] Admin access granted');
      return undefined;
    }

    // Use the maintenance API endpoint
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || process.env.NEXTAUTH_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const maintCheckUrl = `${baseUrl}/api/maintenance/check?_t=${Date.now()}`;
    
    console.log(`[Middleware] Checking maintenance status at: ${maintCheckUrl}`);
    
    const response = await fetch(maintCheckUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const maintenanceCheck = await response.json();
    
    // If maintenance mode is enabled and user is not admin, redirect to maintenance page
    if (maintenanceCheck.maintenance && !isAdmin) {
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
    // In case of an error, don't block access
    return undefined;
  }

  // Continue with the request
  return undefined;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon\\.ico|public/|assets/|images/).*)',
  ],
}; 