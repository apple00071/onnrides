import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
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

    const result = await query(`
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.type as vehicle_type,
        vr.additional_charges,
        vr.condition_notes,
        vr.created_at as return_date
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN vehicle_returns vr ON b.id = vr.booking_id
      WHERE b.booking_id = $1
    `, [params.bookingId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];
    const formattedData = {
      id: booking.id,
      booking_id: booking.booking_id,
      customer: {
        id: booking.user_id,
        name: booking.user_name,
        email: booking.user_email,
        phone: booking.user_phone
      },
      vehicle: {
        name: booking.vehicle_name,
        type: booking.vehicle_type
      },
      amount: booking.total_price,
      status: booking.status,
      payment_status: booking.payment_status,
      booking_type: booking.booking_type,
      duration: {
        from: booking.start_date,
        to: booking.end_date
      },
      vehicle_return: booking.additional_charges ? {
        additional_charges: booking.additional_charges,
        condition_notes: booking.condition_notes,
        return_date: booking.return_date
      } : undefined,
      notes: booking.notes
    };

    return NextResponse.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    logger.error('Error fetching booking details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { status } = body;

    // Check if booking exists and get current status
    const currentBookingResult = await query(`
      SELECT status FROM bookings WHERE booking_id = $1
    `, [params.bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const currentStatus = currentBookingResult.rows[0].status;

    // Update booking status
    const result = await query(`
      UPDATE bookings 
      SET status = $1, updated_at = NOW() 
      WHERE booking_id = $2 
      RETURNING *
    `, [status, params.bookingId]);

    const booking = result.rows[0];

    // Get booking details for notifications
    const bookingDetailsResult = await query(`
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.id as vehicle_id
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.booking_id = $1
    `, [params.bookingId]);

    const bookingDetails = bookingDetailsResult.rows[0];

    // Handle vehicle availability based on status
    if (status === 'completed' || status === 'cancelled') {
      await query(`
        UPDATE vehicles 
        SET is_available = true, updated_at = NOW() 
        WHERE id = $1
      `, [bookingDetails.vehicle_id]);
    }

    return NextResponse.json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const deletedBookingResult = await query(`
      DELETE FROM bookings 
      WHERE booking_id = $1 
      RETURNING *
    `, [params.bookingId]);

    if (deletedBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedBookingResult.rows[0]
    });
  } catch (error) {
    logger.error('Error deleting booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
} 