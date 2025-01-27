import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

interface SignupBody {
  email: string;
  password: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SignupBody;
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Email, password and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    ).then(result => result.rows[0]);

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *',
      [email, hashedPassword, name]
    );
    const user = result.rows[0];

    logger.debug('User created successfully:', { userId: user.id, email });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 201 }
    );

  } catch (error) {
    logger.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 