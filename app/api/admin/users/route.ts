import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get all users except admins
    const usersResult = await query(`
      SELECT id, name, email, phone, role, created_at 
      FROM users 
      WHERE role != 'admin'
    `);

    // Get document counts for each user
    const usersWithDetails = await Promise.all(
      usersResult.rows.map(async (user) => {
        // Get document counts
        const documentCountsResult = await query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
          FROM documents
          WHERE user_id = $1
        `, [user.id]);
        const documentCounts = documentCountsResult.rows[0];

        // Get booking counts
        const bookingCountsResult = await query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
          FROM bookings
          WHERE user_id = $1
        `, [user.id]);
        const bookingCounts = bookingCountsResult.rows[0];

        return {
          ...user,
          documents: documentCounts,
          bookings: bookingCounts
        };
      })
    );

    return NextResponse.json(usersWithDetails);

  } catch (error) {
    logger.error('Error fetching users:', error);
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
    const userCheck = await query(`
      SELECT role 
      FROM users 
      WHERE id = $1
    `, [userId]);

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

    // Delete user's documents first
    await query(`
      DELETE FROM documents
      WHERE user_id = $1
    `, [userId]);
    
    // Delete user's bookings
    await query(`
      DELETE FROM bookings
      WHERE user_id = $1
    `, [userId]);
    
    // Delete the user
    await query(`
      DELETE FROM users
      WHERE id = $1
    `, [userId]);

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