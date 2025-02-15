import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import type { Booking, Vehicle } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { sendBookingNotification } from '@/lib/whatsapp/integration';

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
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      logger.error('No user session found during booking fetch');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId } = params;
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching booking details', { bookingId });

    // Get booking details with vehicle information
    const bookingResult = await query(
      `SELECT 
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
          END
          OR (
            b.payment_details IS NOT NULL 
            AND jsonb_typeof(COALESCE(b.payment_details::jsonb, '{}'::jsonb)) = 'object'
            AND (
              b.payment_details::jsonb ->> 'order_id' = $1::text
              OR b.payment_details::jsonb ->> 'razorpay_order_id' = $1::text
            )
          )`,
      [bookingId]
    );

    if (bookingResult.rowCount === 0) {
      logger.error('Booking not found', { 
        bookingId,
        searchType: typeof bookingId,
        searchLength: bookingId.length
      });
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Ensure user has access to this booking
    if (booking.user_id !== session.user.id) {
      logger.error('Unauthorized booking access attempt', {
        bookingId: booking.id,
        userId: session.user.id,
        bookingUserId: booking.user_id
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Format the response
    const formattedBooking = {
      id: booking.id,
      bookingId: booking.booking_id,
      displayId: booking.booking_id || `#${booking.id.slice(0, 4)}`,
      userId: booking.user_id,
      vehicle: {
        id: booking.vehicle_id,
        name: booking.vehicle_name,
        type: booking.vehicle_type,
        location: booking.pickup_location
      },
      startDate: booking.start_date,
      endDate: booking.end_date,
      totalPrice: `₹${parseFloat(booking.total_price || 0).toFixed(2)}`,
      status: booking.status,
      paymentStatus: booking.payment_status,
      paymentDetails: typeof booking.payment_details === 'string' ? 
        JSON.parse(booking.payment_details) : 
        booking.payment_details,
      paymentReference: booking.payment_reference,
      paidAmount: booking.total_price ? `₹${parseFloat(booking.total_price).toFixed(2)}` : '₹0.00',
      pickupLocation: booking.pickup_location,
      dropoffLocation: booking.dropoff_location || booking.pickup_location,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    };

    logger.info('Booking details fetched successfully', {
      bookingId: booking.id,
      formattedBookingId: formattedBooking.bookingId,
      status: booking.status,
      paymentStatus: booking.payment_status,
      formattedData: {
        location: formattedBooking.vehicle.location,
        totalPrice: formattedBooking.totalPrice,
        paidAmount: formattedBooking.paidAmount,
        bookingId: formattedBooking.bookingId
      }
    });

    return NextResponse.json({
      success: true,
      data: formattedBooking
    });

  } catch (error) {
    logger.error('Error fetching booking details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bookingId: params.bookingId
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch booking details' 
      },
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
      'SELECT b.*, v.name as vehicle_name FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1 LIMIT 1',
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