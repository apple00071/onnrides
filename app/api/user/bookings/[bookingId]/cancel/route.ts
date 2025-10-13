import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import type { Database } from '@/lib/schema';
import { verifyAuth } from '@/app/lib/auth';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Check if user is authenticated
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // First check if the booking belongs to the user and is in a cancellable state
    const booking = await db
      .selectFrom('bookings')
      .selectAll()
      .where('id', '=', bookingId)
      .limit(1)
      .execute();

    if (!booking || booking.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found or unauthorized' },
        { status: 404 }
      );
    }

    if (booking[0].status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Get additional booking details for WhatsApp notification
    const bookingWithDetails = await db
      .selectFrom('bookings')
      .leftJoin('vehicles', 'bookings.vehicle_id', 'vehicles.id')
      .leftJoin('users', 'bookings.user_id', 'users.id')
      .select([
        'bookings.id',
        'bookings.booking_id',
        'bookings.start_date',
        'bookings.end_date',
        'bookings.total_price',
        'vehicles.name as vehicle_name',
        'users.name as customer_name',
        'users.phone as customer_phone'
      ])
      .where('bookings.id', '=', bookingId)
      .executeTakeFirst();

    // Update the booking status to cancelled
    const [updatedBooking] = await db
      .updateTable('bookings')
      .set({ status: 'cancelled' })
      .where('id', '=', bookingId)
      .returningAll()
      .execute();

    // Update the vehicle availability
    await db
      .updateTable('vehicles')
      .set({ is_available: true })
      .where('id', '=', booking[0].vehicle_id)
      .execute();

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
          cancellation_reason: 'Cancelled by customer',
          refund_amount: bookingWithDetails.total_price || undefined,
          refund_status: 'Processing'
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