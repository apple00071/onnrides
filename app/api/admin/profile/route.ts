import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

    logger.debug('Attempting login for:', email);

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      logger.error('User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.error('Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      logger.error('User is not an admin:', email);
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Create session token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

    // Set cookie in response
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/admin',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    logger.error('Unexpected error:', error);
    const response = NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
    response.cookies.delete('admin_session');
    return response;
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      const response = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      response.cookies.delete('admin_session');
      return response;
    }

    // Verify token
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
    };

    // Get user profile
    const [profile] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!profile) {
      const response = NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
      response.cookies.delete('admin_session');
      return response;
    }

    if (profile.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
      response.cookies.delete('admin_session');
      return response;
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role
      }
    });
  } catch (error) {
    logger.error('Session verification error:', error);
    const response = NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
    response.cookies.delete('admin_session');
    return response;
  }
} 