import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { 
  ApiResponse, 
  User, 
  DocumentCounts, 
  BookingCounts, 
  DbQueryResult 
} from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<User[]>>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const usersResult = await query<DbQueryResult<User>>(`
      SELECT id, name, email, phone, role, created_at 
      FROM users 
      WHERE role != 'admin'
    `);

    const usersWithDetails = await Promise.all(
      usersResult.rows.map(async (user) => {
        const documentCountsResult = await query<DbQueryResult<DocumentCounts>>(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
          FROM documents
          WHERE user_id = $1
        `, [user.id]);
        const documentCounts = documentCountsResult.rows[0];

        const bookingCountsResult = await query<DbQueryResult<BookingCounts>>(`
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

    return NextResponse.json({
      success: true,
      data: usersWithDetails
    });

  } catch (error) {
    logger.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.debug('Unauthorized delete attempt');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    const userCheck = await query<DbQueryResult<User>>(`
      SELECT role 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    if (userCheck.rows[0].role === 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete admin users'
      }, { status: 403 });
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
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user'
    }, { status: 500 });
  }
} 