import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    logger.info('Processing password reset request for:', { email });

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    logger.info('Looking up user by email');
    const result = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      logger.info('No user found with email:', { email });
      // For security reasons, don't reveal that the email doesn't exist
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token valid for 1 hour

    logger.info('Generated reset token and expiry:', { 
      userId: user.id,
      tokenExpiry 
    });

    // Save reset token and expiry in database
    try {
      await query(
        'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
        [resetToken, tokenExpiry, user.id]
      );
      logger.info('Reset token saved to database');
    } catch (dbError) {
      logger.error('Failed to save reset token:', dbError);
      throw new Error('Failed to save reset token');
    }

    // Add the email sending function
    const sendResetEmail = async (email: string, token: string) => {
      try {
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'password_reset',
            data: {
              email,
              name: user.name || 'User', // Fallback to 'User' if name is not available
              resetLink
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send password reset email');
        }
      } catch (error) {
        logger.error('Failed to send password reset email:', error);
        throw error;
      }
    };

    // Replace the direct email call with the new function
    await sendResetEmail(email, resetToken);

    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link'
    });

  } catch (error) {
    logger.error('Forgot password error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 