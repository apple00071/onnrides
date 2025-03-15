import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Cache the maintenance mode status for 60 seconds
let maintenanceMode: boolean = false;
let lastCheck = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

async function isMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  
  // Return cached value if available and not expired
  if (lastCheck > 0 && (now - lastCheck) < CACHE_DURATION) {
    return maintenanceMode;
  }

  try {
    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Call the maintenance check API
    const response = await fetch(`${baseUrl}/api/maintenance/check`);
    const data = await response.json();

    maintenanceMode = Boolean(data.maintenance);
    lastCheck = now;
    return maintenanceMode;
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.url.split('?')[0].split('#')[0];

  // Skip maintenance check for these paths
  if (pathname.includes('/_next') || 
      pathname.includes('/api') || 
      pathname.includes('/maintenance') ||
      pathname.includes('/admin') ||
      pathname.match(/\.[^/]+$/) // Skip files with extensions
  ) {
    return undefined; // Allow the request to continue
  }

  // Check maintenance mode
  const maintenance = await isMaintenanceMode(request);
  
  if (maintenance) {
    try {
      // Get the token using next-auth
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      });

      // If user is admin, let them through
      if (token?.role === 'admin') {
        return undefined; // Allow the request to continue
      }

      // Otherwise redirect to maintenance page
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl);
    } catch (error) {
      console.error('Error verifying admin status:', error);
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl);
    }
  }

  return undefined; // Allow the request to continue
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ routes (handled separately within the middleware)
     * 2. /_next/ (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!_next/|_static/|_vercel|favicon.ico|sitemap.xml).*)',
  ],
}; 