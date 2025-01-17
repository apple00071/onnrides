import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { users, documents, bookings } from '@/lib/schema';
import { eq, ne, sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all users except admins
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at
      })
      .from(users)
      .where(ne(users.role, 'admin'))
      .orderBy(users.created_at);

    // Get document counts for each user
    const usersWithDocuments = await Promise.all(
      allUsers.map(async (user) => {
        const userDocs = await db
          .select()
          .from(documents)
          .where(eq(documents.user_id, user.id));
        
        const approvedDocs = userDocs.filter(doc => doc.status === 'approved').length;
        
        return {
          ...user,
          documents_status: {
            approved: approvedDocs,
            total: userDocs.length
          }
        };
      })
    );

    return NextResponse.json({ users: usersWithDocuments });
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
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
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