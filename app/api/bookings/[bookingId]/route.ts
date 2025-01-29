import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Booking, Vehicle } from '@/lib/types';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/bookings/[bookingId] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId } = params;

    const result = await query(
      'SELECT * FROM bookings WHERE id = $1 LIMIT 1',
      [bookingId]
    );
    const booking = result.rows[0];

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Only allow users to view their own bookings or admins to view any booking
    if (user.role !== 'admin' && booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    logger.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[bookingId] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId } = params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT * FROM bookings WHERE id = $1 LIMIT 1',
      [bookingId]
    );
    const booking = result.rows[0];

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Only allow users to update their own bookings or admins to update any booking
    if (user.role !== 'admin' && booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If booking is being cancelled, update vehicle availability
    if (status === 'cancelled') {
      await query(
        'UPDATE vehicles SET is_available = true WHERE id = $1',
        [booking.vehicle_id]
      );
    }

    const updateResult = await query(
      `UPDATE bookings 
       SET status = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, bookingId]
    );

    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    logger.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// POST /api/bookings/[bookingId]/cancel - Cancel booking
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const result = await query(
      'SELECT * FROM bookings WHERE id = $1 LIMIT 1',
      [params.bookingId]
    );
    const booking = result.rows[0];

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to cancel this booking
    if (booking.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const updateResult = await query(
      `UPDATE bookings 
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [params.bookingId]
    );

    return NextResponse.json(updateResult.rows[0]);

  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}