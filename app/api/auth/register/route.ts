import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const [user] = await db
      .insert(users)
      .values({
        id: nanoid(),
        email: email,
        name: name || null,
        phone: null,
        password_hash: hashedPassword,
        role: 'user',
        reset_token: null,
        reset_token_expiry: null,
        created_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .returning();

    logger.info('New user registered:', { userId: user.id, email: user.email });

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
    logger.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
} 