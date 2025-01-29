import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const headersList = headers();
    const session = await getServerSession(authOptions);
    
    logger.debug('Request headers:', Object.fromEntries(headersList.entries()));
    logger.debug('Server session:', session); // Debug log

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        debug: { 
          session: session,
          headers: Object.fromEntries(headersList.entries())
        }
      }), { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
        }
      });
    }

    if (session.user.role !== 'admin') {
      return new NextResponse(JSON.stringify({ 
        error: 'Forbidden',
        debug: { role: session.user.role }
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new NextResponse(JSON.stringify({ 
      status: 'success',
      role: session.user.role,
      user: {
        email: session.user.email,
        role: session.user.role
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Verify admin error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error',
      debug: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 