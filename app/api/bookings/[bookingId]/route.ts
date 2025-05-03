import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import type { Booking, Vehicle } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { sendBookingNotification } from '@/lib/whatsapp/integration';
import { revalidatePath } from 'next/cache';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/bookings/[bookingId] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = params;

    // Get booking from database
    const result = await query(
      'SELECT * FROM bookings WHERE booking_id = $1 AND user_id = $2',
      [bookingId, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch booking' },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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
      'SELECT b.*, v.name as vehicle_name FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1::uuid LIMIT 1',
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
    if (session.user.role !== 'admin' && booking.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If booking is being cancelled, update vehicle availability
    if (status === 'cancelled') {
      await query(
        'UPDATE vehicles SET is_available = true WHERE id = $1::uuid',
        [booking.vehicle_id]
      );
    }

    const updateResult = await query(
      `UPDATE bookings 
       SET status = $1::uuid, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2::uuid 
       RETURNING *`,
      [status, bookingId]
    );

    const updatedBooking = updateResult.rows[0];

    // Send WhatsApp notification
    await sendBookingNotification(session.user, {
      vehicleName: booking.vehicle_name,
      startDate: booking.start_date,
      endDate: booking.end_date,
      bookingId: booking.id,
      status: status,
      totalPrice: booking.total_price ? `₹${parseFloat(booking.total_price).toFixed(2)}` : undefined
    });

    return NextResponse.json(updatedBooking);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const result = await query(
      'SELECT * FROM bookings WHERE id = $1::uuid LIMIT 1',
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
    if (booking.user_id !== session.user.id && session.user.role !== 'admin') {
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
       WHERE id = $1::uuid 
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!['cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Only cancellation is allowed.' },
        { status: 400 }
      );
    }

    // Start a transaction
    await query('BEGIN');

    try {
      // 1. Get the booking with vehicle details
      const bookingResult = await query(`
        SELECT b.*, v.id as vehicle_id, v.name as vehicle_name 
        FROM bookings b 
        LEFT JOIN vehicles v ON b.vehicle_id = v.id 
        WHERE b.id = $1
      `, [bookingId]);

      const booking = bookingResult.rows[0];

      if (!booking) {
        throw new Error('Booking not found');
      }

      // 2. Check if user is authorized
      if (booking.user_id !== session.user.id && session.user.role !== 'admin') {
        throw new Error('Unauthorized to modify this booking');
      }

      // 3. Check if booking can be cancelled
      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw new Error('Booking cannot be cancelled in its current state');
      }

      // 4. Update the booking status
      const updatedBookingResult = await query(`
        UPDATE bookings 
        SET status = 'cancelled', 
            updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `, [bookingId]);

      // 5. Update vehicle availability if needed
      if (booking.vehicle_id) {
        await query(`
          UPDATE vehicles 
          SET is_available = true 
          WHERE id = $1
        `, [booking.vehicle_id]);
      }

      // Commit transaction
      await query('COMMIT');

      // Revalidate relevant pages
      revalidatePath('/bookings');
      revalidatePath('/admin/bookings');
      revalidatePath(`/bookings/${bookingId}`);

      return NextResponse.json({
        success: true,
        data: { booking: updatedBookingResult.rows[0] }
      });

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Error updating booking:', {
      error: error instanceof Error ? error.message : error,
      bookingId: params.bookingId
    });

    const message = error instanceof Error ? error.message : 'Failed to update booking';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 400 }
    );
  }
}