import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { findUserByEmail, createUser } from '@/lib/db';
import bcrypt from 'bcryptjs';


export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user with admin role
    const user = await createUser({
      email,
      password_hash,
      name: name || null,
      role: 'admin'
    });

    return NextResponse.json({
      message: 'Admin user created successfully',
      userId: user.id
    });

  } catch (error) {
    logger.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 