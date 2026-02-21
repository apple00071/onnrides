import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { verifyAuth } from '@/app/lib/auth';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Check if user is authenticated
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.bookingId;
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // First check if the booking belongs to the user and is in a cancellable state
    const bookingResult = await query(
      `SELECT * FROM bookings WHERE id = $1 LIMIT 1`,
      [bookingId]
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or unauthorized' },
        { status: 404 }
      );
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Get additional booking details for WhatsApp notification
    const detailsResult = await query(
      `SELECT 
        b.id,
        b.booking_id,
        b.start_date,
        b.end_date,
        b.total_price,
        v.name as vehicle_name,
        u.name as customer_name,
        u.phone as customer_phone
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = $1`,
      [bookingId]
    );

    const bookingWithDetails = detailsResult.rows[0];

    // Update the booking status to cancelled
    const updateResult = await query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    const updatedBooking = updateResult.rows[0];

    // Update the vehicle availability
    // Removed automatic flip: is_available should be a manual admin control only

    // Send WhatsApp cancellation notification
    if (bookingWithDetails) {
      try {
        const whatsappService = WhatsAppNotificationService.getInstance();
        await whatsappService.sendBookingCancellation({
          booking_id: bookingWithDetails.booking_id || bookingId,
          customer_name: bookingWithDetails.customer_name || undefined,
          customer_phone: bookingWithDetails.customer_phone || undefined,
          vehicle_model: bookingWithDetails.vehicle_name || undefined,
          start_date: new Date(bookingWithDetails.start_date),
          end_date: new Date(bookingWithDetails.end_date),
          cancellation_reason: 'Cancelled by customer'
          // Removed refund_amount and refund_status as refund logic is not implemented
        });

        logger.info('Booking cancellation WhatsApp notification sent successfully', { bookingId });
      } catch (whatsappError) {
        logger.error('Failed to send booking cancellation WhatsApp notification:', whatsappError);
      }
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}