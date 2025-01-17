import { NextRequest, NextResponse } from 'next/server';
import { signOut } from 'next-auth/react';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    await signOut({ redirect: false });
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Error during logout' },
      { status: 500 }
    );
  }
} 