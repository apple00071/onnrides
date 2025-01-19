import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Clear the admin token cookie
    cookies().delete('admin_token');

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 