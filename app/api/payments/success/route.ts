import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentRef } = await request.json();
    if (!paymentRef) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Get booking by payment reference
      const bookingResult = await client.query(`
        SELECT * FROM bookings 
        WHERE payment_reference = $1 AND user_id = $2
      `, [paymentRef, user.id]);

      if (bookingResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      const booking = bookingResult.rows[0];

      // Generate booking ID (format: B-YYYYMMDD-XXXXX)
      const date = new Date();
      const dateStr = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const bookingNumber = `B-${dateStr}-${randomStr}`;

      // Update booking status and add booking number
      await client.query(`
        UPDATE bookings 
        SET payment_status = 'completed',
            status = 'confirmed',
            booking_number = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [bookingNumber, booking.id]);

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        bookingNumber,
        message: 'Payment successful'
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing payment success:', error);
    return NextResponse.json(
      { error: 'Failed to process payment success' },
      { status: 500 }
    );
  }
} 