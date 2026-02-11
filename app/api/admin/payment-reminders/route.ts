import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, reminder_type, payment_link } = body;

    if (!booking_id || !reminder_type) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and reminder type are required' },
        { status: 400 }
      );
    }

    // Get booking details with customer information
    const bookingResult = await query(`
      SELECT 
        b.booking_id,
        b.total_price,
        b.status,
        b.start_date,
        u.name as customer_name,
        u.phone as customer_phone,
        v.name as vehicle_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1
    `, [booking_id]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Only send reminders for pending bookings
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Payment reminders can only be sent for pending bookings' },
        { status: 400 }
      );
    }

    // Send WhatsApp payment reminder
    const whatsappService = WhatsAppNotificationService.getInstance();
    const result = await whatsappService.sendPaymentReminder({
      booking_id: booking.booking_id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      vehicle_model: booking.vehicle_name,
      amount_due: booking.total_price,
      due_date: new Date(booking.start_date), // Use start date as due date
      payment_link: payment_link || undefined,
      reminder_type: reminder_type as 'first' | 'second' | 'final'
    });

    if (result) {
      logger.info('Payment reminder sent successfully', {
        bookingId: booking.booking_id,
        reminderType: reminder_type
      });

      return NextResponse.json({
        success: true,
        message: 'Payment reminder sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send payment reminder' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error sending payment reminder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send payment reminder' },
      { status: 500 }
    );
  }
}

// GET endpoint to get bookings that need payment reminders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending bookings that might need payment reminders
    const pendingBookings = await query(`
      SELECT 
        b.id,
        b.booking_id,
        b.total_price,
        b.start_date,
        b.created_at,
        u.name as customer_name,
        u.phone as customer_phone,
        u.email as customer_email,
        v.name as vehicle_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.status = 'pending'
      AND b.start_date > NOW()
      ORDER BY b.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: pendingBookings.rows
    });

  } catch (error) {
    logger.error('Error fetching pending bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending bookings' },
      { status: 500 }
    );
  }
}
