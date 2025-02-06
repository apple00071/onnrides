import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

interface SignupBody {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SignupBody;
    logger.info('Received signup request:', {
      email: body.email,
      name: body.name,
      hasPassword: !!body.password,
      hasPhone: !!body.phone
    });

    const { email, password, name, phone } = body;

    // Validate input
    if (!email || !password || !name || !phone) {
      const missingFields = {
        email: !email,
        password: !password,
        name: !name,
        phone: !phone
      };
      logger.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { message: 'All fields are required', details: missingFields },
        { status: 400 }
      );
    }

    // Check if user already exists
    logger.info('Checking for existing user:', { email });
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    ).then(result => result.rows[0]);

    if (existingUser) {
      logger.warn('User already exists:', { email });
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    logger.info('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID for user
    const userId = randomUUID();

    // Create user
    logger.info('Creating new user:', { userId, email });
    const result = await query(
      'INSERT INTO users (id, email, password_hash, name, phone, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [userId, email, hashedPassword, name, phone, 'user']
    );
    const user = result.rows[0];

    logger.info('User created successfully:', { userId: user.id, email });

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
    logger.error('Signup error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 