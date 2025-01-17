import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'token';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.email} = ${email}`);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check JWT secret
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = await new SignJWT({ 
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Create response
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

    // Set cookie in response
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 