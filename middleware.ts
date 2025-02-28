import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define paths that should be accessible during maintenance mode
const maintenanceAllowedPaths = [
  '/maintenance',
  '/admin',
  '/api/admin',
  '/auth/signin',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/api/settings/maintenance'  // Allow access to maintenance check endpoint
];

// Cache the maintenance mode status for 1 minute
let maintenanceModeCache = {
  value: false,
  lastChecked: 0
};

async function isMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  // Check cache if it's less than 1 minute old
  if (now - maintenanceModeCache.lastChecked < 60000) {
    return maintenanceModeCache.value;
  }

  try {
    // Use the request URL to construct the API URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    const response = await fetch(`${baseUrl}/api/settings/maintenance`);
    if (!response.ok) throw new Error('Failed to fetch maintenance status');
    
    const data = await response.json();
    
    // Update cache
    maintenanceModeCache = {
      value: data.maintenanceMode,
      lastChecked: now
    };

    return data.maintenanceMode;
  } catch (error) {
    // Fail safe: if we can't check maintenance mode, assume it's false
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Skip maintenance check for allowed paths
  if (maintenanceAllowedPaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null);
  }

  // Check if we're in maintenance mode
  const maintenanceModeEnabled = await isMaintenanceMode(request);

  if (maintenanceModeEnabled) {
    // Check if user is admin
    const token = await getToken({ req: request });
    const isAdmin = token?.role === 'admin';

    if (!isAdmin) {
      // Redirect to maintenance page
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // Allow the request to continue
  return new NextResponse(null);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /maintenance path
     * 2. /_next (Next.js internals)
     * 3. /static (static files)
     * 4. /favicon.ico, /logo.png (static files)
     */
    '/((?!maintenance|_next|static|favicon.ico|logo.png).*)',
  ],
};  