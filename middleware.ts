import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Cache the maintenance mode status for a short period
let maintenanceMode: boolean = false;
let lastCheck = 0;
const CACHE_DURATION = 10 * 1000; // 10 seconds

// Simple logging helper for middleware
function logMiddleware(message: string) {
  console.log(`[Middleware] ${message}`);
}

// Helper function to check if the request is from a mobile device
function isMobileDevice(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}

async function isMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  
  // Always check on first request or if cache expired
  if (lastCheck === 0 || (now - lastCheck) >= CACHE_DURATION) {
    try {
      // Get the base URL from the request
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      // Add a cache-busting parameter
      const url = `${baseUrl}/api/maintenance/check?_t=${now}`;
      
      // Call the maintenance check API with no-cache headers
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      const isMobile = isMobileDevice(request);
      
      logMiddleware(`Maintenance check: ${JSON.stringify(data)}, isMobile: ${isMobile}`);
      
      maintenanceMode = Boolean(data.maintenance);
      lastCheck = now;
    } catch (error) {
      console.error('[Middleware] Error checking maintenance mode:', error);
      return false;
    }
  }
  
  return maintenanceMode;
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isMobile = isMobileDevice(request);
  
  logMiddleware(`Processing request: ${pathname}, isMobile: ${isMobile}`);
  
  // Add debug path info in a request header
  // Since we can't modify the response directly when returning undefined,
  // we'll use the X-Debug-Path header when redirecting to maintenance page
  
  // Skip maintenance check for these paths
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/admin') ||
      pathname.includes('/favicon') ||
      pathname.match(/\.[^/]+$/) // Skip files with extensions
  ) {
    logMiddleware(`Skipping maintenance check for: ${pathname}`);
    return undefined;
  }

  // Check maintenance mode
  const maintenance = await isMaintenanceMode(request);
  logMiddleware(`Maintenance check result for ${pathname}: ${maintenance}, isMobile: ${isMobile}`);
  
  if (maintenance) {
    try {
      // Get the token using next-auth
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      });

      // If user is admin, let them through
      if (token?.role === 'admin') {
        logMiddleware(`Admin user allowed: ${token.email || 'unknown'}`);
        return undefined;
      }

      // Otherwise redirect to maintenance page
      logMiddleware(`Redirecting to maintenance page from: ${pathname}, isMobile: ${isMobile}`);
      const maintenanceUrl = new URL('/maintenance', request.url);
      const redirectResponse = NextResponse.redirect(maintenanceUrl);
      
      // Add debug headers
      redirectResponse.headers.set('X-Maintenance-Redirect', 'true');
      redirectResponse.headers.set('X-Debug-Path', pathname);
      redirectResponse.headers.set('X-Device-Mobile', String(isMobile));
      
      return redirectResponse;
    } catch (error) {
      console.error('[Middleware] Error verifying admin status:', error);
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl);
    }
  }

  // If no maintenance, let the request through
  return undefined;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for specific Next.js paths
     */
    '/((?!_next/static|_next/image|_vercel/image).*)',
  ],
}; 