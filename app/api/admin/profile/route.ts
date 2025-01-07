import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('Attempting login for:', email);

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      console.error('User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.error('Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      console.error('User is not an admin:', email);
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Get profile data
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );

    const profile = profileResult.rows[0];
    if (!profile) {
      console.error('No profile found for user:', user.id);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Create session token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      profile: {
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
    console.error('Unexpected error:', error);
    const response = NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
    response.cookies.delete('admin_session');
    return response;
  }
}

export async function GET(request: Request) {
  try {
    // Get session token from cookie header
    const cookies = request.headers.get('cookie');
    const sessionToken = cookies?.split(';')
      .find(c => c.trim().startsWith('admin_session='))
      ?.split('=')[1];
    
    if (!sessionToken) {
      const response = NextResponse.json(
        { error: 'No session found' },
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
    const profileResult = await pool.query(
      'SELECT u.id, u.email, u.role, p.* FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1',
      [decoded.userId]
    );

    const profile = profileResult.rows[0];
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
    console.error('Session verification error:', error);
    const response = NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
    response.cookies.delete('admin_session');
    return response;
  }
} 