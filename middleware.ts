import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import logger from '@/lib/logger';

// Define paths that should be accessible during maintenance mode
const maintenanceAllowedPaths = [
  '/maintenance',
  '/admin',
  '/api/admin',
  '/auth/signin',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/logo.png'
];

// Cache the maintenance mode status for 1 minute
let maintenanceModeCache = {
  value: false,
  lastChecked: 0
};

async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  // Check cache if it's less than 1 minute old
  if (now - maintenanceModeCache.lastChecked < 60000) {
    return maintenanceModeCache.value;
  }

  try {
    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();

    const isMaintenanceMode = setting?.value === 'true';
    
    // Update cache
    maintenanceModeCache = {
      value: isMaintenanceMode,
      lastChecked: now
    };

    return isMaintenanceMode;
  } catch (error) {
    logger.error('Error checking maintenance mode:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Check if we're in maintenance mode
  const maintenanceModeEnabled = await isMaintenanceMode();

  if (maintenanceModeEnabled) {
    // Check if the path is allowed during maintenance
    const isAllowedPath = maintenanceAllowedPaths.some(path => 
      pathname.startsWith(path)
    );

    if (!isAllowedPath) {
      // Check if user is admin
      const token = await getToken({ req: request });
      const isAdmin = token?.role === 'admin';

      if (!isAdmin) {
        // Redirect to maintenance page
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    }
  }

  // Allow the request to continue
  return NextResponse.json(undefined, { status: 200 });
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