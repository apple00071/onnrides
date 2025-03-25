import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mark route as dynamic to allow server-only features
export const dynamic = 'force-dynamic';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/admin/bookings/[bookingId] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking details
    const bookingResult = await query(`
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.price_per_hour,
        v.location as pickup_location,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as start_date,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as end_date,
        b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
        b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at
      FROM bookings b
      INNER JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.booking_id = $1::text 
        OR b.id = CASE 
          WHEN $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN $1::uuid 
          ELSE NULL 
        END`,
      [params.bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Get vehicle details
    const vehicleResult = await query(`
      SELECT * FROM vehicles 
      WHERE id = $1 
      LIMIT 1
    `, [booking.vehicle_id]);

    const vehicle = vehicleResult.rows.length > 0 ? vehicleResult.rows[0] : null;

    return NextResponse.json({
      booking: {
        ...booking,
        vehicle
      }
    });
  } catch (error) {
    logger.error('Error in GET /api/admin/bookings/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/bookings/[bookingId] - Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateBookingBody;
    const { status, paymentStatus } = body;

    // Update booking
    const updatedBookingResult = await query(`
      UPDATE bookings 
      SET status = COALESCE($1, status),
          payment_status = COALESCE($2, payment_status),
          updated_at = CURRENT_TIMESTAMP 
      WHERE booking_id = $3::text 
        OR id = CASE 
          WHEN $3 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN $3::uuid 
          ELSE NULL 
        END
      RETURNING *`,
      [status, paymentStatus, params.bookingId]
    );

    if (updatedBookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const updatedBooking = updatedBookingResult.rows[0];

    // Get vehicle details
    const vehicleResult = await query(`
      SELECT * FROM vehicles 
      WHERE id = $1 
      LIMIT 1
    `, [updatedBooking.vehicle_id]);

    const vehicle = vehicleResult.rows.length > 0 ? vehicleResult.rows[0] : null;

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        vehicle
      }
    });

  } catch (error) {
    logger.error('Failed to update booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deletedBookingResult = await query(`
      DELETE FROM bookings 
      WHERE id = $1 
      RETURNING *
    `, [params.bookingId]);

    if (deletedBookingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking: deletedBookingResult.rows[0] });
  } catch (error) {
    logger.error('Error in DELETE /api/admin/bookings/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 