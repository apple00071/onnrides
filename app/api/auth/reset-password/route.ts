import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import type { User } from '@/lib/types';
import { sendResetPasswordEmail } from '@/lib/email';

interface ResetPasswordBody {
  email?: string;
  token?: string;
  password?: string;
}

// POST /api/auth/reset-password - Request password reset or reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ResetPasswordBody;
    const { email, token, password } = body;

    // Step 1: Request password reset
    if (email && !token && !password) {
      // Find user by email
      const result = await query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [email]
      );
      const user = result.rows[0];

      if (!user) {
        return NextResponse.json(
          { message: 'If an account exists with this email, a reset link will be sent.' },
          { status: 200 }
        );
      }

      // Generate reset token
      const resetToken = crypto.randomUUID();
      
      // Save reset token with 24 hour expiry
      await query(
        'UPDATE users SET reset_token = $1, reset_token_expiry = CURRENT_TIMESTAMP + INTERVAL \'24 hours\' WHERE id = $2',
        [resetToken, user.id]
      );

      // Send reset email
      await sendResetPasswordEmail(email, resetToken);

      return NextResponse.json(
        { message: 'If an account exists with this email, a reset link will be sent.' },
        { status: 200 }
      );
    }

    // Step 2: Reset password
    if (token && password) {
      // Find user by reset token and check if token is not expired
      const result = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP LIMIT 1',
        [token]
      );
      const user = result.rows[0];

      if (!user) {
        return NextResponse.json(
          { message: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      await query(
        `UPDATE users 
         SET password_hash = $1,
             reset_token = NULL,
             reset_token_expiry = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hashedPassword, user.id]
      );

      return NextResponse.json(
        { message: 'Password reset successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 