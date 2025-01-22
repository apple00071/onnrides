import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { eq, sql } from 'drizzle-orm';

interface AuthResult {
  user: User;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth() as AuthResult | null;

    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth() as AuthResult | null;

    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update user profile
    const [user] = await db
      .update(users)
      .set({
        name,
        updated_at: sql`strftime('%s', 'now')`
      })
      .where(eq(users.id, auth.user.id))
      .returning();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 