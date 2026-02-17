import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addHours } from 'date-fns';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { hours } = body;

    if (!hours || hours < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid hours provided' },
        { status: 400 }
      );
    }

    // Get current booking details with user and vehicle information
    const currentBookingResult = await query(`
      SELECT
        b.*,
        COALESCE(b.customer_name, u.name) as user_name,
        COALESCE(b.phone_number, u.phone) as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.booking_id = $1
    `, [resolvedParams.bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = currentBookingResult.rows[0];
    const originalEndDate = new Date(booking.end_date);
    const newEndDate = addHours(originalEndDate, hours);

    // Calculate additional price
    const totalPrice = Number(booking.total_price);
    const durationMs = new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime();
    const hourlyRate = totalPrice / (durationMs / (1000 * 60 * 60));
    const additionalPrice = Math.round(hourlyRate * hours * 100) / 100;
    const newTotalPrice = Math.round((totalPrice + additionalPrice) * 100) / 100;

    // Update booking
    const result = await query(`
      UPDATE bookings
      SET
        end_date = $1,
        total_price = $2,
        updated_at = NOW()
      WHERE booking_id = $3
      RETURNING *
    `, [newEndDate, newTotalPrice, resolvedParams.bookingId]);

    // Send WhatsApp extension notification
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      await whatsappService.sendBookingExtension({
        booking_id: booking.booking_id,
        customer_name: booking.user_name,
        customer_phone: booking.user_phone,
        vehicle_model: booking.vehicle_name,
        original_end_date: originalEndDate,
        new_end_date: newEndDate,
        additional_hours: hours,
        additional_amount: additionalPrice,
        total_amount: newTotalPrice
      });

      logger.info('Booking extension WhatsApp notification sent successfully', { bookingId: resolvedParams.bookingId });
    } catch (whatsappError) {
      logger.error('Failed to send booking extension WhatsApp notification:', whatsappError);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error extending booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extend booking' },
      { status: 500 }
    );
  }
} 