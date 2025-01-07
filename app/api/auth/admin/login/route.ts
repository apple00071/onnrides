import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { SignJWT } from 'jose';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let client;
  
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get database connection
    try {
      client = await pool.connect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    try {
      // Get user from database
      const result = await client.query(
        'SELECT id, email, password_hash, role FROM users WHERE email = $1',
        [email]
      );

      const user = result.rows[0];
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Check if user is an admin
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Get admin profile
      const profileResult = await client.query(
        'SELECT first_name, last_name FROM profiles WHERE user_id = $1',
        [user.id]
      );

      const profile = profileResult.rows[0];

      // Generate token
      const token = await new SignJWT({
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Admin'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));

      // Create response
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Admin'
        }
      });

      // Set cookie
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return response;
    } catch (error) {
      console.error('Database query error:', error);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during login',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
} 