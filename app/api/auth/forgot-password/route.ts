import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const findUserQuery = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    const user = await query(findUserQuery, [email]);

    if (!user.rows[0]) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Update user with reset token
    const updateUserQuery = `
      UPDATE users 
      SET reset_token = ?,
          reset_token_expiry = TIMESTAMPADD(HOUR, 1, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `;
    await query(updateUserQuery, [resetToken, email]);

    // TODO: Send password reset email
    logger.info('Password reset token generated for:', email);

    return NextResponse.json({ 
      message: 'Password reset instructions sent to your email' 
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 