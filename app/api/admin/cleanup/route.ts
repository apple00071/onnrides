import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Begin transaction
    await query('BEGIN');

    try {
      // Simply delete all records from both tables
      // The order matters due to foreign key constraints
      logger.info('Deleting all payment records...');
      const deletePaymentsResult = await query('DELETE FROM payments');
      logger.info('Deleted payment records:', deletePaymentsResult.rowCount);

      logger.info('Deleting all booking records...');
      const deleteBookingsResult = await query('DELETE FROM bookings');
      logger.info('Deleted booking records:', deleteBookingsResult.rowCount);

      // Reset sequences if they exist
      try {
        logger.info('Resetting sequences...');
        // Try a different approach to reset sequences
        await query('TRUNCATE bookings RESTART IDENTITY CASCADE');
        await query('TRUNCATE payments RESTART IDENTITY CASCADE');
      } catch (seqError) {
        logger.warn('Error resetting sequences (this is not critical):', seqError);
      }

      // Commit transaction
      await query('COMMIT');

      const message = `Successfully cleaned up test data:
        - Deleted ${deleteBookingsResult.rowCount} bookings
        - Deleted ${deletePaymentsResult.rowCount} payments`;

      logger.info(message);

      return NextResponse.json({
        success: true,
        message,
        details: {
          bookings: deleteBookingsResult.rowCount,
          payments: deletePaymentsResult.rowCount
        }
      });
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK');
      logger.error('Database error during cleanup:', error);
      throw new Error(error instanceof Error ? error.message : 'Database error during cleanup');
    }
  } catch (error) {
    logger.error('Error cleaning up test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clean up test data',
        details: error
      },
      { status: 500 }
    );
  }
} 