import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
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
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .execute()
      .then(rows => rows[0]);

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email,
        password_hash: hashedPassword,
        name,
        role: 'user'
      })
      .returning();

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