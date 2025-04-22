import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Check for admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Start transaction
    await query('BEGIN');

    logger.info('Deleting all payment records...');
    const { rowCount: deletedPayments } = await query('DELETE FROM payments');
    logger.info('Deleted payment records:', { count: deletedPayments });

    logger.info('Deleting all booking records...');
    const { rowCount: deletedBookings } = await query('DELETE FROM bookings');
    logger.info('Deleted booking records:', { count: deletedBookings });

    logger.info('Deleting all vehicle records...');
    const { rowCount: deletedVehicles } = await query('DELETE FROM vehicles');
    logger.info('Deleted vehicle records:', { count: deletedVehicles });

    logger.info('Resetting sequences...');
    await query('ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1');

    // Commit transaction
    await query('COMMIT');

    logger.info('Successfully cleaned up test data:', {
      bookings: deletedBookings,
      payments: deletedPayments,
      vehicles: deletedVehicles
    });

    return NextResponse.json({
      success: true,
      message: 'Database cleaned up successfully',
      data: {
        deletedBookings,
        deletedPayments,
        deletedVehicles
      }
    });
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    logger.error('Error cleaning up database:', error);
    return NextResponse.json(
      { error: 'Failed to clean up database' },
      { status: 500 }
    );
  }
} 