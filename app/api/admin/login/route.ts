import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Find user by email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    const user = userResult.rows[0];

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

    // Set token in HTTP-only cookie using the correct Next.js method
    const cookieExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days
    
    response.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }SameSite=Lax; Max-Age=${cookieExpiresInSeconds}`
    );

    return response;

  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 