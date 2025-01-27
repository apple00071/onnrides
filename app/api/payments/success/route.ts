import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

interface BookingRow {
  id: string;
  [key: string]: any;
}

// POST /api/payments/success - Handle successful payment
export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ message: 'Booking ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get booking
    const booking = await query<BookingRow>(`
      SELECT * FROM bookings 
      WHERE id = $1 
      LIMIT 1
    `, [bookingId]).then(rows => rows[0]);

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