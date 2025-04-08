import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { isValidEmail, isValidIndianPhone, formatIndianPhone } from '@/lib/utils/validation';
import { randomUUID } from 'crypto';
import { UserRole } from '@/lib/types';

// Simple rate limiting implementation
const ipThrottleMap = new Map<string, { count: number, lastReset: number }>();
const MAX_REQUESTS_PER_HOUR = 5; // Limit registration attempts per IP

/**
 * Check if the IP is allowed to register based on rate limits
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  if (!ipThrottleMap.has(ip)) {
    ipThrottleMap.set(ip, { count: 1, lastReset: now });
    return false;
  }
  
  const ipData = ipThrottleMap.get(ip)!;
  
  // Reset counter if hour has passed
  if (now - ipData.lastReset > hourInMs) {
    ipThrottleMap.set(ip, { count: 1, lastReset: now });
    return false;
  }
  
  // Check if over limit
  if (ipData.count >= MAX_REQUESTS_PER_HOUR) {
    logger.warn('Rate limit exceeded for registration', { ip });
    return true;
  }
  
  // Increment counter
  ipThrottleMap.set(ip, { count: ipData.count + 1, lastReset: ipData.lastReset });
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Too many registration attempts. Please try again later.'
      }, { status: 429 });
    }
    
    const { name, email, phone, password } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required'
      }, { status: 400 });
    }

    // Enhanced validation for minimum length requirements
    if (name.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Name must be at least 3 characters long'
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long'
      }, { status: 400 });
    }

    // Validate email format and check for disposable/suspicious emails
    if (!isValidEmail(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid email address. We do not accept temporary or suspicious email addresses.'
      }, { status: 400 });
    }

    // Validate Indian phone number
    if (!isValidIndianPhone(phone)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid Indian phone number. Fake or temporary numbers are not accepted.'
      }, { status: 400 });
    }

    // Format phone number to standard format
    const formattedPhone = formatIndianPhone(phone);

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .select(['id'])
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Email already registered'
      }, { status: 400 });
    }

    // Check for existing phone number
    const existingPhone = await db
      .selectFrom('users')
      .select(['id'])
      .where('phone', '=', formattedPhone)
      .executeTakeFirst();

    if (existingPhone) {
      return NextResponse.json({
        success: false,
        error: 'Phone number already registered'
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Generate verification token
    const verificationToken = randomUUID();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hour expiry

    // Create user with proper typing
    const userData = {
      id: randomUUID(),
      name: name as string,
      email: email.toLowerCase() as string,
      phone: formattedPhone as string,
      password_hash: hashedPassword,
      role: 'user' as UserRole,
      is_verified: false,
      verification_token: verificationToken,
      verification_expires: tokenExpiry,
    };

    const user = await db
      .insertInto('users')
      .values(userData)
      .returning(['id', 'name', 'email', 'role'])
      .executeTakeFirst();

    // Here you would typically send an email with the verification link
    // and SMS verification code using a service like Twilio
    logger.info('User registered, verification pending', {
      userId: user?.id,
      email: userData.email,
      phone: userData.phone
    });

    return NextResponse.json({
      success: true,
      message: 'Account created. Please verify your email and phone to activate your account.',
      data: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create account'
    }, { status: 500 });
  }
} 