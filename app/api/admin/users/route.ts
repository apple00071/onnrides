import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/lib/auth';
import { db } from '@/app/lib/lib/db';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch users with their document counts
    const result = await db.execute(sql`
      SELECT 
        u.*,
        COUNT(CASE WHEN d.status = 'approved' THEN 1 END) as approved_docs,
        COUNT(d.id) as total_docs
      FROM users u
      LEFT JOIN documents d ON u.id = d.user_id
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    // Transform the data to match the expected format
    const users = result.rows.map(user => ({
      id: user.id as string,
      name: (user.name as string) || '',
      email: user.email as string,
      phone: (user.phone as string) || '',
      is_blocked: Boolean(user.is_blocked),
      is_verified: Boolean(user.is_verified),
      created_at: user.created_at as string,
      documents_status: {
        approved: Number(user.approved_docs) || 0,
        total: Number(user.total_docs) || 0
      }
    }));

    return NextResponse.json({ users });
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users. Please try again.' },
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
    const userCheck = await db.execute(sql`
      SELECT role FROM users WHERE id = ${userId}
    `);

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (userCheck.rows[0].role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete user and related data
    await db.execute(sql`
      WITH deleted_user AS (
        DELETE FROM users WHERE id = ${userId} RETURNING id
      )
      DELETE FROM documents WHERE user_id IN (SELECT id FROM deleted_user)
    `);

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