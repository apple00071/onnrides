import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Create response with success message
    const response = new NextResponse(
      JSON.stringify({ message: 'Logged out successfully' }),
      {
        status: 200,
        headers: {
          'Clear-Site-Data': '"cache", "cookies", "storage"',
          'Content-Type': 'application/json',
        },
      }
    );

    // Clear all auth-related cookies
    const cookieExpiryDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const cookieOptions = 'Path=/; HttpOnly; Secure; SameSite=Lax';
    
    response.headers.append('Set-Cookie', `next-auth.session-token=; ${cookieOptions}; Expires=${cookieExpiryDate}`);
    response.headers.append('Set-Cookie', `next-auth.csrf-token=; ${cookieOptions}; Expires=${cookieExpiryDate}`);
    response.headers.append('Set-Cookie', `next-auth.callback-url=; ${cookieOptions}; Expires=${cookieExpiryDate}`);
    response.headers.append('Set-Cookie', `__Secure-next-auth.session-token=; ${cookieOptions}; Expires=${cookieExpiryDate}`);
    response.headers.append('Set-Cookie', `__Secure-next-auth.callback-url=; ${cookieOptions}; Expires=${cookieExpiryDate}`);
    response.headers.append('Set-Cookie', `__Host-next-auth.csrf-token=; ${cookieOptions}; Expires=${cookieExpiryDate}`);

    // Clear custom cookies
    response.headers.append('Set-Cookie', `admin_token=; ${cookieOptions}; Expires=${cookieExpiryDate}`);
    response.headers.append('Set-Cookie', `user_token=; ${cookieOptions}; Expires=${cookieExpiryDate}`);

    return response;
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 