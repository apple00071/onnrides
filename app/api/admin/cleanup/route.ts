import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Helper function to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    logger.error('Error checking table existence:', error);
    return false;
  }
}

// Helper function to create payments table if it doesn't exist
async function ensurePaymentsTable() {
  try {
    const exists = await tableExists('payments');
    if (!exists) {
      logger.info('Creating payments table...');
      await query(`
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID REFERENCES bookings(id),
          user_id UUID REFERENCES users(id),
          amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          reference VARCHAR(255),
          provider VARCHAR(50),
          metadata JSONB,
          payment_reference TEXT,
          order_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Add indices for better performance
        CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
        CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments(payment_reference);
        CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      `);
      logger.info('Payments table created successfully');
    }
  } catch (error) {
    logger.error('Error ensuring payments table:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get statistics summary
    // This is a placeholder for actual statistics retrieval
    // For demonstration, let's assume some dummy finance data
    const cashCollections = 1234.567;
    const cardCollections = 789.123;
    const upiCollections = 456.789;
    const openingBalance = 1000.00;
    const cashRefunds = 50.25;
    const expenses = 150.75;

    const totalCollections = Math.round((cashCollections + cardCollections + upiCollections) * 100) / 100;
    const closingBalance = Math.round((openingBalance + totalCollections - cashRefunds - expenses) * 100) / 100;

    return NextResponse.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        cashCollections: Math.round(cashCollections * 100) / 100,
        cardCollections: Math.round(cardCollections * 100) / 100,
        upiCollections: Math.round(upiCollections * 100) / 100,
        totalCollections,
        openingBalance: Math.round(openingBalance * 100) / 100,
        cashRefunds: Math.round(cashRefunds * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        closingBalance,
      }
    });
  } catch (error) {
    logger.error('Error retrieving statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting database cleanup...');

    // Start transaction
    await query('BEGIN');

    try {
      // Ensure payments table exists before proceeding
      await ensurePaymentsTable();

      // Delete all payment records first (due to foreign key constraints)
      logger.info('Deleting payment records...');
      const { rowCount: deletedPayments } = await query('DELETE FROM payments');
      logger.info('Deleted payment records:', { count: deletedPayments });

      // Delete all booking records
      logger.info('Deleting booking records...');
      const { rowCount: deletedBookings } = await query('DELETE FROM bookings');
      logger.info('Deleted booking records:', { count: deletedBookings });

      // Delete all vehicle records
      logger.info('Deleting vehicle records...');
      const { rowCount: deletedVehicles } = await query('DELETE FROM vehicles');
      logger.info('Deleted vehicle records:', { count: deletedVehicles });

      // Reset sequences if they exist
      logger.info('Resetting sequences...');
      await query('ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE IF EXISTS vehicles_id_seq RESTART WITH 1');

      // Commit transaction
      await query('COMMIT');

      logger.info('Database cleanup completed successfully:', {
        deletedPayments,
        deletedBookings,
        deletedVehicles
      });

      return NextResponse.json({
        success: true,
        message: 'Database cleanup completed successfully',
        data: {
          deletedPayments,
          deletedBookings,
          deletedVehicles
        }
      });
    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error cleaning up database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 