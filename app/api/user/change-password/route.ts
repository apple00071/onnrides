import { NextRequest, NextResponse } from 'next/server';
import { authOptions, comparePasswords, hashPassword } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Get user's current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1::uuid',
      [session.user.id]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await comparePasswords(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1::uuid, updated_at = NOW() WHERE id = $2::uuid',
      [newPasswordHash, session.user.id]
    );

    logger.info('Password changed successfully:', {
      userId: session.user.id
    });

    return NextResponse.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
} 