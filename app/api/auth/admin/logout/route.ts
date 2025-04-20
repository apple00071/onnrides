import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Create response with cleared cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear the admin token cookie
    response.headers.set(
      'Set-Cookie',
      'admin_token=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'
    );

    return response;
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 