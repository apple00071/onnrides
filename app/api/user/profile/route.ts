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
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { name, phone } = await request.json();

    // Update user profile
    const result = await query(
      `UPDATE users 
       SET name = $1, phone = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, email, name, phone`,
      [name, phone, session.user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];
    logger.info('Profile updated successfully:', {
      userId: session.user.id,
      name,
      phone
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 