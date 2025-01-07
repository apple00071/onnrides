import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { generateToken, createAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let client;
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    client = await pool.connect();

    // Get user with profile data
    const result = await client.query(`
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
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    try {
      // Generate JWT token
      const token = await generateToken({
        id: user.id.toString(),
        email: user.email,
        role: user.role
      });

      // Create response with cookie
      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_documents_verified: user.is_documents_verified || false
        }
      });

      // Set auth cookie
      const cookie = createAuthCookie(token);
      response.cookies.set(cookie);

      return response;
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return NextResponse.json(
        { message: 'Authentication failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          message: 'Login failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
} 