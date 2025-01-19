import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { eq } from 'drizzle-orm';

interface AuthResult {
  user: User;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth() as AuthResult | null;

    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1)
      .execute()
      .then(rows => rows[0]);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    logger.error('Error getting user profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth() as AuthResult | null;

    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }

    // Update user profile
    const [user] = await db
      .update(users)
      .set({
        name,
        updated_at: new Date()
      })
      .where(eq(users.id, auth.user.id))
      .returning();

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    logger.error('Error updating user profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 