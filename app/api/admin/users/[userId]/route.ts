import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const { name } = await request.json();

    // Update user details
    const result = await query(
      `UPDATE users 
       SET name = $1, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, email, role, phone, is_blocked, created_at`,
      [name, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];
    logger.info('User updated:', {
      userId,
      adminId: session.user.id
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;

    // Start a transaction
    await query('BEGIN');

    try {
      // Delete user's documents
      await query(
        'DELETE FROM documents WHERE user_id = $1',
        [userId]
      );

      // Delete user's bookings
      await query(
        'DELETE FROM bookings WHERE user_id = $1',
        [userId]
      );

      // Delete the user
      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [userId]
      );

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      // Commit the transaction
      await query('COMMIT');

      logger.info('User deleted:', {
        userId,
        adminId: session.user.id
      });

      return NextResponse.json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      // Rollback the transaction on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete user'
      },
      { status: error instanceof Error && error.message === 'User not found' ? 404 : 500 }
    );
  }
} 