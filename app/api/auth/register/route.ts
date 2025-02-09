import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user with UUID
    const userId = randomUUID();
    const result = await query(
      `INSERT INTO users (id, email, password_hash, name, phone, role) 
       VALUES ($1, $2, $3, $4, $5, 'user') 
       RETURNING id, email, name, role`,
      [userId, email, hashedPassword, name || null, phone || null]
    );

    const user = result.rows[0];
    logger.info('New user registered:', { 
      userId: user.id, 
      email: user.email,
      name: user.name
    });

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
} 