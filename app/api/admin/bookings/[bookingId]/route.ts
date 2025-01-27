import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking details
    const booking = await query(`
      SELECT * FROM bookings 
      WHERE id = $1 
      LIMIT 1
    `, [params.bookingId]);

    if (!booking[0]) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get vehicle details
    const vehicle = await query(`
      SELECT * FROM vehicles 
      WHERE id = $1 
      LIMIT 1
    `, [booking[0].vehicle_id]);

    return NextResponse.json({
      booking: {
        ...booking[0],
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
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateBookingBody;
    const { status, paymentStatus } = body;

    // Update booking
    const updatedBooking = await query(`
      UPDATE bookings 
      SET status = COALESCE($1, status),
          payment_status = COALESCE($2, payment_status),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING *
    `, [status, paymentStatus, params.bookingId]);

    if (!updatedBooking[0]) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get vehicle details
    const vehicle = await query(`
      SELECT * FROM vehicles 
      WHERE id = $1 
      LIMIT 1
    `, [updatedBooking[0].vehicle_id]);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking[0],
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
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deletedBooking = await query(`
      DELETE FROM bookings 
      WHERE id = $1 
      RETURNING *
    `, [params.bookingId]);

    if (!deletedBooking[0]) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking: deletedBooking[0] });
  } catch (error) {
    logger.error('Error in DELETE /api/admin/bookings/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 