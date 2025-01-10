import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    
    try {
      

      // Transform the data to match the expected format
      

      return NextResponse.json({ users });
    } finally {
      client.release();
    }
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
    
    if (!currentUser || currentUser.role !== 'admin') {
      logger.debug('Unauthorized delete attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    
    try {
      // Start transaction
      await client.query('BEGIN');

      // Check if trying to delete an admin
      

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (userCheck.rows[0].role === 'admin') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Cannot delete admin users' },
          { status: 403 }
        );
      }

      // Delete user&apos;s documents
      await client.query('DELETE FROM document_submissions WHERE user_id = $1', [userId]);

      // Delete user&apos;s profile
      await client.query('DELETE FROM profiles WHERE user_id = $1', [userId]);

      // Delete user&apos;s bookings
      await client.query('DELETE FROM bookings WHERE user_id = $1', [userId]);

      // Finally, delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      // Commit transaction
      await client.query('COMMIT');

      logger.debug(`Successfully deleted user ${userId}`);
      return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 