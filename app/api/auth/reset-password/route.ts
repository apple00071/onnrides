import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Find valid reset token and associated user
    const result = await query(
      `SELECT u.*, pr.token, pr.expires_at
       FROM password_resets pr
       INNER JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1 
       AND pr.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    const resetData = result.rows[0];

    if (!resetData) {
      logger.info('Invalid or expired reset token');
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Start a transaction to update password and delete reset token
    await query('BEGIN');

    try {
      // Update user's password
      await query(
        `UPDATE users 
         SET password_hash = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [hashedPassword, resetData.id]
      );

      // Delete the used reset token
      await query(
        `DELETE FROM password_resets 
         WHERE user_id = $1`,
        [resetData.id]
      );

      await query('COMMIT');

      logger.info('Password reset successful for user:', { userId: resetData.id });

      return NextResponse.json({
        message: 'Password reset successful'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Password reset error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 