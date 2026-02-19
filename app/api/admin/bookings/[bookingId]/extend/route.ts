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
    const { newEndDate, additionalAmount, paymentMethod, paymentReference, paymentStatus } = body;

    if (!newEndDate) {
      return NextResponse.json(
        { success: false, error: 'New end date is required' },
        { status: 400 }
      );
    }

    // Get current booking details with user and vehicle information
    const currentBookingResult = await query(`
      SELECT
        b.*,
        COALESCE(b.customer_name, u.name) as user_name,
        COALESCE(b.customer_phone, b.phone_number, u.phone) as user_phone,
        v.name as vehicle_name,
        v.id as vehicle_id
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE TRIM(b.booking_id) ILIKE TRIM($1)
    `, [resolvedParams.bookingId]);

    if (currentBookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = currentBookingResult.rows[0];
    const originalEndDate = new Date(booking.end_date);
    const updatedEndDate = new Date(newEndDate);

    if (updatedEndDate <= originalEndDate) {
      return NextResponse.json(
        { success: false, error: 'New end date must be after current end date' },
        { status: 400 }
      );
    }

    const additionalPrice = Number(additionalAmount || 0);
    const newTotalPrice = Number(booking.total_price) + additionalPrice;

    // Use a transaction for both updates
    try {
      await query('BEGIN');

      // Update booking
      await query(`
        UPDATE bookings
        SET
          end_date = $1,
          total_price = $2,
          updated_at = NOW()
        WHERE booking_id = $3
      `, [updatedEndDate, newTotalPrice, resolvedParams.bookingId]);

      // Insert payment record only if there's an additional amount AND status is 'paid'
      if (additionalPrice > 0 && paymentStatus === 'paid') {
        const { v4: uuidv4 } = require('uuid');
        await query(`
          INSERT INTO payments (
            id,
            booking_id,
            amount,
            status,
            method,
            reference,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [
          uuidv4(),
          booking.id, // Internal UUID
          additionalPrice,
          'completed',
          paymentMethod || 'other',
          paymentReference || `EXT_${booking.booking_id}_${Date.now()}`
        ]);
      }

      await query('COMMIT');
    } catch (dbError) {
      await query('ROLLBACK');
      throw dbError;
    }

    // Send WhatsApp extension notification
    try {
      const whatsappService = WhatsAppNotificationService.getInstance();
      const diffInHours = Math.ceil((updatedEndDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60));

      logger.info('Preparing to send extension notification', {
        bookingId: resolvedParams.bookingId,
        customerPhone: booking.user_phone,
        paymentStatus
      });

      await whatsappService.sendBookingExtension({
        booking_id: booking.booking_id,
        customer_name: booking.user_name,
        customer_phone: booking.user_phone,
        vehicle_model: booking.vehicle_name,
        original_end_date: originalEndDate,
        new_end_date: updatedEndDate,
        additional_hours: diffInHours,
        additional_amount: additionalPrice,
        total_amount: newTotalPrice,
        payment_method: paymentStatus === 'paid' ? paymentMethod : 'Unpaid (Added to Due)',
        payment_reference: paymentStatus === 'paid' ? paymentReference : undefined
      });

      logger.info('Booking extension WhatsApp notification sent successfully', { bookingId: resolvedParams.bookingId });
    } catch (whatsappError) {
      logger.error('Failed to send booking extension WhatsApp notification:', whatsappError);
    }

    return NextResponse.json({
      success: true,
      data: {
        booking_id: booking.booking_id,
        new_end_date: updatedEndDate,
        total_price: newTotalPrice
      }
    });
  } catch (error) {
    logger.error('Error extending booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extend booking' },
      { status: 500 }
    );
  }
} 