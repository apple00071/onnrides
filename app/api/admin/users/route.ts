import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/auth';
import { users, bookings, vehicles, documents } from '@/lib/schema';
import { count, and, sql } from 'drizzle-orm';
import { eq, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const user = await verifyAuth(cookieStore);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all users (excluding admins)
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(ne(users.role, 'admin'));

    return NextResponse.json(allUsers);
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const user = await verifyAuth(cookieStore);
    
    if (!user || user.role !== 'admin') {
      logger.debug('Unauthorized delete attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if trying to delete an admin
    const userCheck = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    if (userCheck.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (userCheck[0].role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete user's documents first
    await db.delete(documents).where(eq(documents.user_id, userId));
    
    // Delete user's bookings
    await db.delete(bookings).where(eq(bookings.user_id, userId));
    
    // Delete the user
    await db.delete(users).where(eq(users.id, userId));

    logger.debug(`Successfully deleted user ${userId}`);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 