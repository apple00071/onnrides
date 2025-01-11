import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { COLLECTIONS, generateId, findOneBy, set } from '@/lib/db';
import type { User } from '@/lib/types';

interface SignupBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SignupBody;
    const { email, password, name, phone } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findOneBy<User>(COLLECTIONS.USERS, 'email', email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = generateId('usr');
    const user: User = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      phone,
      role: 'user',
      isVerified: false,
      isDocumentsVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await set(COLLECTIONS.USERS, user);

    logger.debug('User created successfully:', { userId, email });

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