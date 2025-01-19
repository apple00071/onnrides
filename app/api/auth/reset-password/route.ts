import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
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
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
        .execute()
        .then(rows => rows[0]);

      if (!user) {
        return NextResponse.json(
          { message: 'If an account exists with this email, a reset link will be sent.' },
          { status: 200 }
        );
      }

      // Generate reset token
      const resetToken = crypto.randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save reset token
      await db
        .update(users)
        .set({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry
        })
        .where(eq(users.id, user.id))
        .execute();

      // Send reset email
      await sendResetPasswordEmail(email, resetToken);

      return NextResponse.json(
        { message: 'If an account exists with this email, a reset link will be sent.' },
        { status: 200 }
      );
    }

    // Step 2: Reset password
    if (token && password) {
      // Find user by reset token
      const user = await db
        .select()
        .from(users)
        .where(eq(users.reset_token, token))
        .limit(1)
        .execute()
        .then(rows => rows[0]);

      if (!user || !user.reset_token_expiry || user.reset_token_expiry < new Date()) {
        return NextResponse.json(
          { message: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      await db
        .update(users)
        .set({
          password_hash: hashedPassword,
          reset_token: null,
          reset_token_expiry: null
        })
        .where(eq(users.id, user.id))
        .execute();

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