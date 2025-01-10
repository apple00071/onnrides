import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Clear the auth token cookie
    cookies().delete('token');

    // Return success response
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Error during logout' },
      { status: 500 }
    );
  }
} 