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

    const body = await request.json();
    const { email, name } = body;

    // Validate email if provided
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheckResult = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, session.user.id]
      );

      if (emailCheckResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const { rows: updatedProfile } = await query(
      `UPDATE users 
       SET email = COALESCE($1, email),
           name = COALESCE($2, name),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, name, email, phone, role, created_at, updated_at`,
      [email || null, name || null, session.user.id]
    );

    if (!updatedProfile[0]) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    logger.info('Profile updated successfully:', {
      userId: session.user.id,
      updatedFields: { email, name }
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile[0]
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 