import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    logger.info('Session data:', session);
    
    if (!session?.user) {
      logger.warn('No user in session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Looking for profile with ID:', session.user.id);
    const profile = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    logger.info('Profile query result:', profile);

    if (!profile[0]) {
      logger.warn('No profile found for user ID:', session.user.id);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Remove sensitive information
    const { password_hash, ...safeProfile } = profile[0];
    logger.info('Returning safe profile data');
    return NextResponse.json(safeProfile);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    logger.info('Session data for PUT:', session);
    
    if (!session?.user) {
      logger.warn('No user in session for PUT request');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const now = new Date();

    // Remove any sensitive fields that shouldn't be updated directly
    const { id, email, password_hash, role, created_at, ...updateData } = data;

    logger.info('Updating profile for user ID:', session.user.id);
    await db
      .update(users)
      .set({
        ...updateData,
        updated_at: now,
      })
      .where(eq(users.id, session.user.id));

    logger.info('Profile updated successfully');
    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 