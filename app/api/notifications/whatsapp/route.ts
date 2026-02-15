import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId } = await request.json();

    // Get booking details using standardized query pattern
    const result = await query(`
      SELECT 
        b.*, 
        v.name as vehicle_model,
        u.name as customer_name,
        u.phone as customer_phone
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = $1 AND b.user_id = $2
      LIMIT 1
    `, [bookingId, session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];
    const notificationService = WhatsAppNotificationService.getInstance();

    // Send WhatsApp notification using the standardized service (wasenderapi)
    const success = await notificationService.sendBookingConfirmation({
      id: booking.id,
      booking_id: booking.booking_id,
      customer_name: booking.customer_name || session.user.name,
      phone_number: booking.customer_phone || session.user.phone,
      vehicle_model: booking.vehicle_model,
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_amount: Number(booking.total_price),
      status: booking.status,
      pickup_location: typeof booking.pickup_location === 'string'
        ? booking.pickup_location
        : JSON.stringify(booking.pickup_location)
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send WhatsApp notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in WhatsApp notification route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
