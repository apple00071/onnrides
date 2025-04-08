import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { token, verifyType } = await request.json();

    if (!token || !verifyType) {
      return NextResponse.json({
        success: false,
        error: 'Verification token and type are required'
      }, { status: 400 });
    }

    // Verify the token is valid
    const user = await db
      .selectFrom('users')
      .select([
        'id',
        'is_verified',
        'verification_token',
        'verification_expires'
      ])
      .where((eb) => eb('verification_token', '=', token))
      .executeTakeFirst();

    if (!user) {
      logger.warn('Invalid verification token attempt', { token });
      return NextResponse.json({
        success: false,
        error: 'Invalid verification token'
      }, { status: 400 });
    }

    // Check if token is expired
    const now = new Date();
    if (!user.verification_expires) {
      logger.warn('Missing verification expiry', { token, userId: user.id });
      return NextResponse.json({
        success: false,
        error: 'Invalid verification token'
      }, { status: 400 });
    }
    
    const expiryDate = new Date(user.verification_expires);
    
    if (now > expiryDate) {
      logger.warn('Expired verification token attempt', { token, userId: user.id });
      return NextResponse.json({
        success: false,
        error: 'Verification token has expired'
      }, { status: 400 });
    }

    // Verify the user
    await db
      .updateTable('users')
      .set({
        is_verified: true as const,
        verification_token: null,
        verification_expires: null,
      })
      .where('id', '=', user.id)
      .execute();

    logger.info('User verified successfully', { userId: user.id, verifyType });

    return NextResponse.json({
      success: true,
      message: 'Verification successful. Your account is now active.'
    });
  } catch (error) {
    logger.error('Verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify account'
    }, { status: 500 });
  }
}

// Route to resend verification
export async function PUT(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    if (!email && !phone) {
      return NextResponse.json({
        success: false,
        error: 'Email or phone is required'
      }, { status: 400 });
    }

    // Find user by email or phone
    const query = db.selectFrom('users')
      .select([
        'id',
        'email',
        'phone',
        'is_verified'
      ]);
    
    if (email) {
      query.where('email', '=', email.toLowerCase());
    } else if (phone) {
      query.where('phone', '=', phone);
    }

    const user = await query.executeTakeFirst();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No account found with provided details'
      }, { status: 404 });
    }

    if (user.is_verified) {
      return NextResponse.json({
        success: false,
        error: 'Account is already verified'
      }, { status: 400 });
    }

    // Generate new verification token
    const verificationToken = crypto.randomUUID();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hour expiry

    // Update verification token
    await db
      .updateTable('users')
      .set({
        verification_token: verificationToken,
        verification_expires: tokenExpiry,
      })
      .where('id', '=', user.id)
      .execute();

    // Here you would resend verification email/SMS
    logger.info('Verification resent', {
      userId: user.id,
      email: user.email,
      phone: user.phone
    });

    return NextResponse.json({
      success: true,
      message: 'Verification sent. Please check your email or phone.'
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resend verification'
    }, { status: 500 });
  }
} 