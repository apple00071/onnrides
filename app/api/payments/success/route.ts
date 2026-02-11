import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import crypto from 'crypto';
import { QueryResultRow } from 'pg';

interface BookingRow extends QueryResultRow {
  id: string;
  total_price: string | number;
  [key: string]: any;
}

// POST /api/payments/success - Handle successful payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookingId = body.bookingId;

    if (!bookingId) {
      return new Response(JSON.stringify({ message: 'Booking ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get booking
    // Fixed: query returns QueryResult object, so we access result.rows[0]
    const result = await query<BookingRow>(`
      SELECT * FROM bookings 
      WHERE id = $1 
      LIMIT 1
    `, [bookingId]);

    const booking = result.rows[0];

    if (!booking) {
      logger.error('Booking not found:', { bookingId });
      return new Response(JSON.stringify({ message: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update booking status
    await query(`
      UPDATE bookings 
      SET payment_status = 'completed',
          status = 'confirmed',
          updated_at = NOW()
      WHERE id = $1
    `, [bookingId]);

    // Add redundant audit record for finance reporting
    try {
      await query(
        `INSERT INTO payments (
          id,
          booking_id,
          amount,
          status,
          method,
          reference,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (reference) DO NOTHING`,
        [
          crypto.randomUUID(),
          booking.id,
          parseFloat(String(booking.total_price || '0')),
          'completed',
          'online',
          bookingId // Using bookingId as reference if no explicit payment tracking is passed here
        ]
      );
    } catch (auditError) {
      logger.error('Failed to create redundant audit record in success route:', auditError);
    }

    return new Response(JSON.stringify({
      message: 'Payment confirmed successfully',
      booking: {
        id: booking.id,
        payment_status: 'completed',
        status: 'confirmed'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Payment confirmation error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 