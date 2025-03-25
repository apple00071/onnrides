import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { EmailService } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    logger.info('Processing password reset request:', { email });

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      logger.warn('Password reset requested for non-existent email:', { email });
      return NextResponse.json(
        { message: 'If an account exists with this email, you will receive a password reset link.' },
        { status: 200 }
      );
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save reset token
    await query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [user.id, resetToken, expiresAt]
    );

    // Send reset email
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    
    const emailService = EmailService.getInstance();
    await emailService.sendPasswordResetEmail(email, {
      name: user.name,
      resetLink,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@onnrides.com'
    });

    logger.info('Password reset email sent successfully:', { email });

    return NextResponse.json(
      { message: 'If an account exists with this email, you will receive a password reset link.' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error processing password reset:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 