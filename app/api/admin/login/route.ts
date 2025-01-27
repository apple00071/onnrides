import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Get admin user from database using raw SQL
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    const user = rows[0];

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token with more user info
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Create response with token
    const response = NextResponse.json(
      { 
        message: 'Logged in successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 200 }
    );

    // Set token in HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 