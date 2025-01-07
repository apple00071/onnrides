import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized block/unblock attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const isBlocked = data.isBlocked;

    if (typeof isBlocked !== 'boolean') {
      return NextResponse.json(
        { error: 'isBlocked must be a boolean value' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Update user's blocked status
      const updateResult = await client.query(
        'UPDATE profiles SET is_blocked = $1 WHERE user_id = $2 RETURNING *',
        [isBlocked, userId]
      );

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

      console.log(`Successfully ${isBlocked ? 'blocked' : 'unblocked'} user ${userId}`);
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
    console.error('Error updating user block status:', error);
    return NextResponse.json(
      { error: 'Failed to update user block status' },
      { status: 500 }
    );
  }
} 