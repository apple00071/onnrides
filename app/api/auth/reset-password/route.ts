import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { COLLECTIONS, findOneBy, set, update } from '@/lib/db';
import { sendResetPasswordEmail } from '@/lib/email';
import type { User, ResetToken } from '@/lib/types';

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
      const user = await findOneBy<User>(COLLECTIONS.USERS, 'email', email);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      const resetTokenDoc: ResetToken = {
        id: `rst_${Date.now()}`,
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpiry,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await set(COLLECTIONS.RESET_TOKENS, resetTokenDoc);

      // Send reset email
      await sendResetPasswordEmail(email, resetToken);

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent'
      });
    }

    // Step 2: Reset password with token
    if (token && password) {
      // Find reset token
      const resetTokenDoc = await findOneBy<ResetToken>(COLLECTIONS.RESET_TOKENS, 'token', token);
      if (!resetTokenDoc) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Check if token is expired
      if (new Date() > resetTokenDoc.expires_at) {
        return NextResponse.json(
          { error: 'Reset token has expired' },
          { status: 400 }
        );
      }

      // Find user
      const user = await findOneBy<User>(COLLECTIONS.USERS, 'id', resetTokenDoc.user_id);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user's password
      await update<User>(COLLECTIONS.USERS, user.id, {
        password: hashedPassword,
        updatedAt: new Date()
      });

      // Expire the reset token
      await update<ResetToken>(COLLECTIONS.RESET_TOKENS, resetTokenDoc.id, {
        expires_at: new Date(),
        updatedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successful'
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 