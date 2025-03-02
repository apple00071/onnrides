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
    if (!response.ok) {
      console.error('Maintenance check API returned error:', response.status);
      return false;
    }
    
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
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip maintenance check for these paths
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/admin') ||
      pathname.match(/\.[^/]+$/) // Skip files with extensions
  ) {
    return new NextResponse();
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
        return new NextResponse();
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

  return new NextResponse();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones we explicitly don't want to run
     * the middleware on
     */
    '/((?!_next/static|_next/image|_vercel|favicon.ico).*)',
  ],
}; 