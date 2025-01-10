import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!currentUser || currentUser.role !== 'admin') {
      logger.debug('Unauthorized block/unblock attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    
    

    if (typeof isBlocked !== 'boolean') {
      return NextResponse.json(
        { error: 'isBlocked must be a boolean value' },
        { status: 400 }
      );
    }

    
    try {
      // Start transaction
      await client.query('BEGIN');

      // Update user&apos;s blocked status
      

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // If blocking the user, cancel their active bookings and revoke document verifications
      if (isBlocked) {
        // Cancel active bookings
        await client.query(`
          UPDATE bookings 
          SET status = 'cancelled', 
              cancelled_at = NOW(),
              cancellation_reason = 'Account blocked by admin'
          WHERE user_id = $1 
          AND status IN ('pending', 'confirmed')
        `, [userId]);

        // Revoke document verifications
        await client.query(`
          UPDATE document_submissions
          SET status = 'revoked',
              updated_at = NOW()
          WHERE user_id = $1
          AND status = 'approved'
        `, [userId]);
      }

      // Commit transaction
      await client.query('COMMIT');

      logger.debug(`Successfully ${isBlocked ? 'blocked' : 'unblocked'} user ${userId}`);
      return NextResponse.json({
        message: `User successfully ${isBlocked ? 'blocked' : 'unblocked'}`,
        user: updateResult.rows[0]
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating user block status:', error);
    return NextResponse.json(
      { error: 'Failed to update user block status' },
      { status: 500 }
    );
  }
} 