import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * DELETE endpoint to remove all users except admin users
 * CRITICAL: This is a destructive operation.
 */
export async function DELETE(req: NextRequest) {
  try {
    // Audit-S1: Verify admin access
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      logger.warn('Unauthorized attempt to delete all users');
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // S3: Implement Safety Guard (Check for users with active bookings)
    const activeBookingsCount = await query(
      `SELECT COUNT(*) FROM bookings 
       WHERE status IN ('pending', 'confirmed', 'initiated') 
       AND user_id IN (SELECT id FROM users WHERE LOWER(role) != 'admin')`
    );

    if (parseInt(activeBookingsCount.rows[0].count) > 0) {
      return NextResponse.json({
        error: `Cannot perform bulk deletion. There are ${activeBookingsCount.rows[0].count} active bookings associated with non-admin users.`
      }, { status: 400 });
    }

    logger.info('Performing bulk user deletion (non-admins)...');

    // Delete all users except those with role 'admin'
    const result = await query(`
      DELETE FROM users 
      WHERE LOWER(role) != 'admin'
      RETURNING id, email
    `);

    const deletedUsers = result.rows;
    logger.info(`Successfully deleted ${deletedUsers.length} users`);

    // Safety check admin count
    const adminCountResult = await query(`SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'`);
    const adminCount = parseInt(adminCountResult.rows[0].count);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedUsers.length} non-admin users`,
      deletedCount: deletedUsers.length,
      adminCount: adminCount
    });

  } catch (error) {
    logger.error('Bulk deletion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}