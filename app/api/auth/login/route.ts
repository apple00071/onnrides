import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { generateToken, createAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user with profile data
    const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.role,
        p.is_documents_verified,
        p.is_blocked
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE LOWER(u.email) = LOWER($1)
    `, [email]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check if user is blocked
    if (user.is_blocked) {
      return NextResponse.json(
        { message: 'Your account has been blocked. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      is_documents_verified: user.is_documents_verified
    });

    // Create response with auth cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_documents_verified: user.is_documents_verified
        }
      },
      { status: 200 }
    );

    // Set auth cookie
    const cookie = createAuthCookie(token);
    response.cookies.set(cookie);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
} 