import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Disable middleware caching completely for maintenance mode
let maintenanceMode: boolean = false;
let lastCheck = 0;

// Force check on every request for mobile devices
const CACHE_DURATION = 5 * 1000; // 5 seconds, shorter cache for more frequent checks

// Simple logging helper for middleware
function logMiddleware(message: string) {
  console.log(`[Middleware] ${message}`);
}

// Enhanced mobile device detection with broader patterns
function isMobileDevice(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const lowerUA = userAgent.toLowerCase();
  
  // More comprehensive mobile detection
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|silk|kindle|samsung|nokia|lg|sony|asus|huawei|oneplus|pixel/i.test(lowerUA) || 
         // Check for common mobile browser strings
         /mobile safari|chrome\/[.0-9]* mobile/i.test(lowerUA) ||
         // Check for mobile screen dimensions in viewport
         (request.headers.get('sec-ch-ua-mobile') === '?1');
}

async function isMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  const isMobile = isMobileDevice(request);
  
  // Always check for mobile devices or when cache expired
  if (isMobile || lastCheck === 0 || (now - lastCheck) >= CACHE_DURATION) {
    try {
      // Get the base URL from the request
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      // Add timestamp for stronger cache busting
      const url = `${baseUrl}/api/maintenance/check?_t=${now}&mobile=${isMobile ? 1 : 0}`;
      
      // Enhanced no-cache headers
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Middleware-Cache': 'no-cache',
          'X-Mobile-Check': isMobile ? '1' : '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      logMiddleware(`Maintenance check: ${JSON.stringify(data)}, isMobile: ${isMobile}, timestamp: ${now}`);
      
      // Set the global maintenance mode state
      maintenanceMode = Boolean(data.maintenance);
      lastCheck = now;
    } catch (error) {
      console.error('[Middleware] Error checking maintenance mode:', error);
      if (maintenanceMode) {
        // Preserve existing maintenance mode if there's an error
        return true;
      }
      return false;
    }
  }
  
  return maintenanceMode;
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isMobile = isMobileDevice(request);
  
  logMiddleware(`Processing request: ${pathname}, isMobile: ${isMobile}, UA: ${request.headers.get('user-agent')?.substring(0, 50)}...`);
  
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

  // Force check maintenance mode on every request for mobile
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

      // Otherwise redirect to maintenance page - with strong cache prevention for mobile
      logMiddleware(`Redirecting to maintenance page from: ${pathname}, isMobile: ${isMobile}`);
      const maintenanceUrl = new URL('/maintenance', request.url);
      
      // Add timestamp to maintenance URL for mobile to prevent caching
      if (isMobile) {
        maintenanceUrl.searchParams.set('_t', Date.now().toString());
      }
      
      const redirectResponse = NextResponse.redirect(maintenanceUrl);
      
      // Add strong no-cache headers to prevent browsers from caching the redirect
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      
      // Add debug headers but no UI-affecting ones
      redirectResponse.headers.set('X-Maintenance-Redirect', 'true');
      redirectResponse.headers.set('X-Debug-Path', pathname);
      redirectResponse.headers.set('X-Device-Mobile', String(isMobile));
      redirectResponse.headers.set('X-Timestamp', String(Date.now()));
      
      // Add header to tell the maintenance page to hide notifications
      redirectResponse.headers.set('X-Maintenance-Clean', 'true');
      
      return redirectResponse;
    } catch (error) {
      console.error('[Middleware] Error verifying admin status:', error);
      const maintenanceUrl = new URL('/maintenance', request.url);
      
      // Add timestamp parameter for mobile to prevent caching
      if (isMobile) {
        maintenanceUrl.searchParams.set('_t', Date.now().toString());
      }
      
      const redirectResponse = NextResponse.redirect(maintenanceUrl);
      
      // Add strong no-cache headers
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      
      return redirectResponse;
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