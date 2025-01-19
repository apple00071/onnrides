import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Clear all auth-related cookies
    const cookieStore = cookies();
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('next-auth.callback-url');
    cookieStore.delete('__Secure-next-auth.session-token');
    cookieStore.delete('__Secure-next-auth.callback-url');
    cookieStore.delete('__Host-next-auth.csrf-token');

    // Also clear any custom cookies
    cookieStore.delete('admin_token');
    cookieStore.delete('user_token');

    // Return success with clear-site-data header for complete cleanup
    return new NextResponse(
      JSON.stringify({ message: 'Logged out successfully' }),
      {
        status: 200,
        headers: {
          'Clear-Site-Data': '"cache", "cookies", "storage"',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 