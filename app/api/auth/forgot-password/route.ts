import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import crypto from 'crypto';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Update user with reset token
      const result = await client.query(
        `UPDATE users 
         SET reset_token = $1, reset_token_expiry = $2 
         WHERE email = $3 
         RETURNING id`,
        [resetToken, resetTokenExpiry, email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'No account found with this email' },
          { status: 404 }
        );
      }

      // In a real application, you would send an email here
      // For development, we'll just return the token
      return NextResponse.json({
        message: 'Password reset instructions sent',
        // Remove this in production
        debug: {
          resetToken,
          resetUrl: `/reset-password?token=${resetToken}`
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 