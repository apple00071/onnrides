import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

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
    const { rows: profile } = await query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [session.user.id]
    );

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
    const now = new Date().toISOString();

    // Remove any sensitive fields that shouldn't be updated directly
    const { id, email, password_hash, role, created_at, ...updateData } = data;

    // Convert updateData object to SQL SET clause
    const updateFields = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = [...Object.values(updateData), now, session.user.id];

    logger.info('Updating profile for user ID:', session.user.id);
    await query(
      `UPDATE users 
       SET ${updateFields}, updated_at = $${values.length - 1}
       WHERE id = $${values.length}`,
      values
    );

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