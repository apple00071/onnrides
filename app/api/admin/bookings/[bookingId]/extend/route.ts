import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addHours } from 'date-fns';

export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hours } = body;

    if (!hours || hours < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid hours provided' },
        { status: 400 }
      );
    }

    // Get current booking details
    const currentBookingResult = await query(`
      SELECT * FROM bookings WHERE booking_id = $1
    `, [params.bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = currentBookingResult.rows[0];
    const newEndDate = addHours(new Date(booking.end_date), hours);

    // Calculate additional price
    const hourlyRate = booking.total_price / ((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60));
    const additionalPrice = hourlyRate * hours;

    // Update booking
    const result = await query(`
      UPDATE bookings 
      SET 
        end_date = $1,
        total_price = total_price + $2,
        updated_at = NOW()
      WHERE booking_id = $3 
      RETURNING *
    `, [newEndDate, additionalPrice, params.bookingId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error extending booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extend booking' },
      { status: 500 }
    );
  }
} 