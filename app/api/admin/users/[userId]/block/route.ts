import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthResult {
  user: User;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await verifyAuth() as AuthResult | null;

    if (!auth || auth.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { blocked } = await request.json();

    // Update user's blocked status
    await db.execute(
      sql`UPDATE users SET is_blocked = ${blocked} WHERE id = ${params.userId}`
    );

    return NextResponse.json(
      { message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` },
      { status: 200 }
    );

  } catch (error) {
    logger.error('Error blocking/unblocking user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 