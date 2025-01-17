import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { createUser, findUserByEmail } from '@/lib/db';
import { randomUUID } from 'crypto';

interface SignupBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SignupBody;
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      id: randomUUID(),
      email,
      password_hash: hashedPassword,
      name,
      role: 'user',
      created_at: new Date(),
      updated_at: new Date()
    });

    logger.debug('User created successfully:', { userId: user.id, email });

    return NextResponse.json({
      success: true,
      message: 'User created successfully'
    });

  } catch (error) {
    logger.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 