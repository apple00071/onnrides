import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user[0]) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await db
      .update(users)
      .set({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        updated_at: new Date()
      })
      .where(eq(users.email, email));

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